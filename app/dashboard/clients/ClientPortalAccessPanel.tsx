"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import ClientBrandMark from "@/app/components/ClientBrandMark";
import { buildPortalUrl } from "@/lib/clientPortals/getAppBaseUrl";

type ClientStoreOption = {
  id: number;
  store_name: string | null;
  location: string | null;
};

type PortalAccessUser = {
  id: string;
  fullName: string;
  username: string;
  password: string;
  storeIds: number[];
};

type PortalAccessDetails = {
  portalId: string;
  slug: string;
  portalUrl: string;
  active: boolean;
  users: PortalAccessUser[];
  username: string;
  password: string;
  clientName: string;
  logoUrl: string | null;
};

type ClientPortalAccessPanelProps = {
  clientId: number | string;
  clientName: string;
  logoUrl?: string | null;
  refreshKey?: number;
  onUpdated: () => Promise<void>;
  onSuccessMessage?: (message: string) => void;
};

type BannerState = {
  type: "success" | "error";
  message: string;
} | null;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function formatStoreLabel(store: ClientStoreOption) {
  const name = (store.store_name || "").trim();
  const location = (store.location || "").trim();

  if (name && location) return `${name} / ${location}`;
  return name || location || `Store #${store.id}`;
}

function StoreBadgeList({
  storeIds,
  storesById,
}: {
  storeIds: number[];
  storesById: Map<number, ClientStoreOption>;
}) {
  if (storeIds.length === 0) {
    return (
      <span style={allStoresBadgeStyle}>🏢 Head Office Access</span>
    );
  }

  return (
    <div style={storeBadgeListStyle}>
      {storeIds.map((storeId) => (
        <span key={storeId} style={storeBadgeStyle}>
          🏬 {formatStoreLabel(
            storesById.get(storeId) || {
              id: storeId,
              store_name: null,
              location: null,
            }
          )}
        </span>
      ))}
    </div>
  );
}

function StoreCheckboxList({
  clientStores,
  selectedStoreIds,
  onToggle,
}: {
  clientStores: ClientStoreOption[];
  selectedStoreIds: number[];
  onToggle: (storeId: number) => void;
}) {
  if (clientStores.length === 0) {
    return (
      <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
        No stores assigned to this client yet.
      </p>
    );
  }

  return (
    <div style={storeCheckboxPanelStyle}>
      {clientStores.map((store) => {
        const checked = selectedStoreIds.includes(store.id);

        return (
          <label key={store.id} style={storeCheckboxLabelStyle}>
            <input
              type="checkbox"
              checked={checked}
              onChange={() => onToggle(store.id)}
            />
            {formatStoreLabel(store)}
          </label>
        );
      })}
    </div>
  );
}

export default function ClientPortalAccessPanel({
  clientId,
  clientName,
  logoUrl = null,
  refreshKey = 0,
  onUpdated,
  onSuccessMessage,
}: ClientPortalAccessPanelProps) {
  const [details, setDetails] = useState<PortalAccessDetails | null>(null);
  const [clientStores, setClientStores] = useState<ClientStoreOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [banner, setBanner] = useState<BannerState>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const [newUserName, setNewUserName] = useState("");
  const [newUserStoreIds, setNewUserStoreIds] = useState<number[]>([]);

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserStoreIds, setEditUserStoreIds] = useState<number[]>([]);

  const showBanner = useCallback((type: "success" | "error", message: string) => {
    setBanner({ type, message });
    if (type === "success") {
      onSuccessMessage?.(message);
    }
    window.setTimeout(() => setBanner(null), 4000);
  }, [onSuccessMessage]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setDetails(null);

    try {
      const cacheBust = Date.now();
      const [portalResponse, storesResponse] = await Promise.all([
        fetch(
          `/api/clients/portal-access?clientId=${encodeURIComponent(String(clientId))}&_=${cacheBust}`,
          { cache: "no-store" }
        ),
        supabase
          .from("stores")
          .select("id, store_name, location")
          .eq("client_id", clientId)
          .order("store_name", { ascending: true }),
      ]);

      if (portalResponse.ok) {
        setDetails((await portalResponse.json()) as PortalAccessDetails);
      } else {
        const result = (await portalResponse.json()) as { error?: string };
        console.error(result.error || "Unable to load portal access");
        setDetails(null);
      }

      if (storesResponse.error) {
        console.error(storesResponse.error);
        setClientStores([]);
      } else {
        setClientStores((storesResponse.data || []) as ClientStoreOption[]);
      }
    } catch (error) {
      console.error(error);
      setDetails(null);
      showBanner("error", "Unable to load portal management.");
    } finally {
      setLoading(false);
    }
  }, [clientId, showBanner]);

  useEffect(() => {
    void loadData();
  }, [loadData, refreshKey]);

  const storesById = useMemo(() => {
    const map = new Map<number, ClientStoreOption>();
    clientStores.forEach((store) => map.set(store.id, store));
    return map;
  }, [clientStores]);

  const portalUrl =
    details?.portalUrl || (details?.slug ? buildPortalUrl(details.slug) : "");
  const displayName = details?.clientName || clientName;
  const displayLogoUrl = details?.logoUrl ?? logoUrl;
  const primaryUser = details?.users[0];

  async function copyText(label: string, value: string) {
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      showBanner("success", `${label} copied.`);
    } catch (error) {
      console.error(error);
      showBanner("error", `Could not copy ${label.toLowerCase()}.`);
    }
  }

  function toggleStoreSelection(
    storeId: number,
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) {
    setter((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId]
    );
  }

  async function addPortalUser() {
    const fullName = newUserName.trim();

    if (!fullName) {
      showBanner("error", "Please enter a user name.");
      return;
    }

    setBusyAction("add-user");

    try {
      const response = await fetch("/api/clients/portal-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          fullName,
          storeIds: newUserStoreIds,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        portal?: PortalAccessDetails;
      };

      if (!response.ok) {
        showBanner("error", result.error || "Unable to create portal user.");
        return;
      }

      if (result.portal) setDetails(result.portal);
      setNewUserName("");
      setNewUserStoreIds([]);
      await onUpdated();
      showBanner("success", "Portal user created.");
    } catch (error) {
      console.error(error);
      showBanner("error", "Unable to create portal user.");
    } finally {
      setBusyAction(null);
    }
  }

  function startEditUser(user: PortalAccessUser) {
    setEditingUserId(user.id);
    setEditUserName(user.fullName);
    setEditUserStoreIds(user.storeIds);
  }

  function cancelEditUser() {
    setEditingUserId(null);
    setEditUserName("");
    setEditUserStoreIds([]);
  }

  async function saveEditUser() {
    if (!editingUserId) return;

    const fullName = editUserName.trim();

    if (!fullName) {
      showBanner("error", "Please enter a user name.");
      return;
    }

    setBusyAction(`edit-${editingUserId}`);

    try {
      const response = await fetch("/api/clients/portal-users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          userId: editingUserId,
          fullName,
          storeIds: editUserStoreIds,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        portal?: PortalAccessDetails;
      };

      if (!response.ok) {
        showBanner("error", result.error || "Unable to update portal user.");
        return;
      }

      if (result.portal) setDetails(result.portal);
      cancelEditUser();
      await onUpdated();
      showBanner("success", "Portal user updated.");
    } catch (error) {
      console.error(error);
      showBanner("error", "Unable to update portal user.");
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteUser(user: PortalAccessUser) {
    const confirmed = window.confirm(
      `Delete portal user "${user.fullName}" (${user.username})?`
    );

    if (!confirmed) return;

    setBusyAction(`delete-${user.id}`);

    try {
      const response = await fetch("/api/clients/portal-users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          userId: user.id,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        portal?: PortalAccessDetails;
      };

      if (!response.ok) {
        showBanner("error", result.error || "Unable to delete portal user.");
        return;
      }

      if (result.portal) setDetails(result.portal);
      if (editingUserId === user.id) cancelEditUser();
      await onUpdated();
      showBanner("success", "Portal user deleted.");
    } catch (error) {
      console.error(error);
      showBanner("error", "Unable to delete portal user.");
    } finally {
      setBusyAction(null);
    }
  }

  async function resetPassword(user: PortalAccessUser) {
    const confirmed = window.confirm(
      `Reset password for "${user.fullName}" (${user.username})?`
    );

    if (!confirmed) return;

    setBusyAction(`reset-${user.id}`);

    try {
      const response = await fetch("/api/clients/portal-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          userId: user.id,
        }),
      });

      const result = (await response.json()) as {
        error?: string;
        portal?: PortalAccessDetails;
      };

      if (!response.ok) {
        showBanner("error", result.error || "Unable to reset password.");
        return;
      }

      if (result.portal) setDetails(result.portal);
      await onUpdated();
      showBanner("success", "Password reset.");
    } catch (error) {
      console.error(error);
      showBanner("error", "Unable to reset password.");
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <div style={panelShellStyle}>
        <p style={{ margin: 0, color: "#6b7280" }}>Loading portal management...</p>
      </div>
    );
  }

  if (!details) {
    return (
      <div style={panelShellStyle}>
        <p style={{ margin: 0, color: "#6b7280" }}>Portal access is not configured.</p>
      </div>
    );
  }

  return (
    <div style={panelShellStyle}>
      {banner && (
        <div
          style={{
            ...bannerStyle,
            background: banner.type === "success" ? "#ecfdf5" : "#fef2f2",
            borderColor: banner.type === "success" ? "#86efac" : "#fecaca",
            color: banner.type === "success" ? "#166534" : "#991b1b",
          }}
        >
          {banner.message}
        </div>
      )}

      <section style={headerCardStyle}>
        <div style={headerTopRowStyle}>
          <div style={headerIdentityStyle}>
            <ClientBrandMark
              name={displayName}
              logoUrl={displayLogoUrl}
              size="lg"
            />
            <div>
              <p style={headerEyebrowStyle}>Client Portal</p>
              <h3 style={headerTitleStyle}>{displayName}</h3>
              <p style={headerMetaStyle}>
                {details.users.length} portal user
                {details.users.length === 1 ? "" : "s"} ·{" "}
                <span
                  style={{
                    color: details.active ? "#059669" : "#dc2626",
                    fontWeight: 700,
                  }}
                >
                  {details.active ? "Active" : "Disabled"}
                </span>
              </p>
            </div>
          </div>

          <div style={headerActionsStyle}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => copyText("Portal URL", portalUrl)}
            >
              Copy Portal URL
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => copyText("Username", primaryUser?.username || "")}
              disabled={!primaryUser?.username}
            >
              Copy Username
            </button>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => copyText("Password", primaryUser?.password || "")}
              disabled={!primaryUser?.password}
            >
              Copy Password
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noreferrer"
              style={primaryLinkStyle}
            >
              Open Portal
            </a>
          </div>
        </div>

        <div style={headerDetailsGridStyle}>
          <div style={detailBlockStyle}>
            <span style={detailLabelStyle}>Portal URL</span>
            <span style={detailValueStyle}>{portalUrl}</span>
          </div>
          <div style={detailBlockStyle}>
            <span style={detailLabelStyle}>Portal Status</span>
            <span style={detailValueStyle}>
              {details.active ? "Active" : "Disabled"}
            </span>
          </div>
          <div style={detailBlockStyle}>
            <span style={detailLabelStyle}>Portal Slug</span>
            <span style={detailValueStyle}>{details.slug}</span>
          </div>
          <div style={detailBlockStyle}>
            <span style={detailLabelStyle}>Portal Users</span>
            <span style={detailValueStyle}>{details.users.length}</span>
          </div>
        </div>
      </section>

      <section style={sectionCardStyle}>
        <div style={sectionHeaderStyle}>
          <h4 style={sectionTitleStyle}>Portal Users</h4>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Avatar</th>
                <th style={thStyle}>User Name</th>
                <th style={thStyle}>Username</th>
                <th style={thStyle}>Assigned Stores</th>
                <th style={thStyle}>Password</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {details.users.map((user) => (
                <tr key={user.id}>
                  <td style={tdStyle}>
                    <ClientBrandMark
                      name={user.fullName}
                      logoUrl={null}
                      size="sm"
                    />
                  </td>
                  <td style={tdStyle}>{user.fullName}</td>
                  <td style={tdStyle}>{user.username}</td>
                  <td style={tdStyle}>
                    <StoreBadgeList
                      storeIds={user.storeIds}
                      storesById={storesById}
                    />
                  </td>
                  <td style={tdStyle}>
                    <code style={passwordCodeStyle}>{user.password || "—"}</code>
                  </td>
                  <td style={tdStyle}>
                    <div style={actionRowStyle}>
                      <button
                        type="button"
                        title="Edit"
                        style={iconButtonStyle}
                        onClick={() => startEditUser(user)}
                        disabled={Boolean(busyAction)}
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        style={iconButtonStyle}
                        onClick={() => void deleteUser(user)}
                        disabled={Boolean(busyAction)}
                      >
                        🗑
                      </button>
                      <button
                        type="button"
                        title="Reset Password"
                        style={iconButtonStyle}
                        onClick={() => void resetPassword(user)}
                        disabled={Boolean(busyAction)}
                      >
                        🔑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {editingUserId && (
        <section style={sectionCardStyle}>
          <h4 style={sectionTitleStyle}>Edit Portal User</h4>
          <div style={formGridStyle}>
            <div>
              <label style={labelStyle}>User Name</label>
              <input
                type="text"
                value={editUserName}
                onChange={(event) => setEditUserName(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Assigned Stores</label>
              <p style={helperTextStyle}>
                Leave all unchecked to allow access to all stores for {displayName}.
              </p>
              <StoreCheckboxList
                clientStores={clientStores}
                selectedStoreIds={editUserStoreIds}
                onToggle={(storeId) =>
                  toggleStoreSelection(storeId, setEditUserStoreIds)
                }
              />
            </div>
            <div style={formActionsStyle}>
              <button
                type="button"
                style={primaryButtonStyle}
                onClick={() => void saveEditUser()}
                disabled={busyAction === `edit-${editingUserId}`}
              >
                {busyAction === `edit-${editingUserId}` ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={cancelEditUser}
              >
                Cancel
              </button>
            </div>
          </div>
        </section>
      )}

      <section style={sectionCardStyle}>
        <h4 style={sectionTitleStyle}>Add Portal User</h4>
        <div style={formGridStyle}>
          <div>
            <label style={labelStyle}>User Name</label>
            <input
              type="text"
              value={newUserName}
              onChange={(event) => setNewUserName(event.target.value)}
              placeholder={`${displayName} Store Manager`}
              style={inputStyle}
            />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Assigned Stores</label>
            <p style={helperTextStyle}>
              Leave all unchecked to allow access to all stores for {displayName}.
            </p>
            <StoreCheckboxList
              clientStores={clientStores}
              selectedStoreIds={newUserStoreIds}
              onToggle={(storeId) =>
                toggleStoreSelection(storeId, setNewUserStoreIds)
              }
            />
          </div>
          <div>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => void addPortalUser()}
              disabled={busyAction === "add-user"}
            >
              {busyAction === "add-user" ? "Adding..." : "Add Portal User"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

const panelShellStyle: React.CSSProperties = {
  display: "grid",
  gap: "16px",
};

const bannerStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid",
  fontSize: "14px",
  fontWeight: 600,
};

const headerCardStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "20px",
  display: "grid",
  gap: "18px",
};

const headerTopRowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "16px",
  flexWrap: "wrap",
};

const headerIdentityStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
  minWidth: "240px",
};

const headerEyebrowStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#6b7280",
};

const headerTitleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  fontSize: "22px",
  color: "#111827",
};

const headerMetaStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "14px",
  color: "#64748b",
};

const headerActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
  alignItems: "center",
};

const headerDetailsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "12px",
};

const detailBlockStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  padding: "12px 14px",
  display: "grid",
  gap: "4px",
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: "12px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const detailValueStyle: React.CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#111827",
  wordBreak: "break-all",
};

const sectionCardStyle: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e5e7eb",
  borderRadius: "16px",
  padding: "20px",
};

const sectionHeaderStyle: React.CSSProperties = {
  marginBottom: "12px",
};

const sectionTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: "16px",
  color: "#111827",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  minWidth: "760px",
  borderCollapse: "collapse",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "13px",
  color: "#374151",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "12px",
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
  verticalAlign: "top",
};

const passwordCodeStyle: React.CSSProperties = {
  fontSize: "13px",
  background: "#f3f4f6",
  padding: "4px 8px",
  borderRadius: "6px",
};

const actionRowStyle: React.CSSProperties = {
  display: "flex",
  gap: "6px",
  flexWrap: "wrap",
};

const iconButtonStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
  padding: "6px 10px",
  cursor: "pointer",
  fontSize: "16px",
  lineHeight: 1,
};

const formGridStyle: React.CSSProperties = {
  display: "grid",
  gap: "14px",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
};

const formActionsStyle: React.CSSProperties = {
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
  gridColumn: "1 / -1",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "6px",
  fontWeight: 600,
  fontSize: "14px",
  color: "#374151",
};

const helperTextStyle: React.CSSProperties = {
  margin: "0 0 8px",
  fontSize: "13px",
  color: "#6b7280",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid #d1d5db",
  fontSize: "14px",
};

const primaryButtonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const secondaryButtonStyle: React.CSSProperties = {
  background: "#ffffff",
  color: "#111827",
  padding: "10px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};

const primaryLinkStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const storeBadgeListStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "6px",
  maxHeight: "120px",
  overflowY: "auto",
  paddingRight: "4px",
};

const storeBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "6px 10px",
  borderRadius: "999px",
  background: "#eff6ff",
  border: "1px solid #bfdbfe",
  color: "#1e3a8a",
  fontSize: "12px",
  fontWeight: 600,
  whiteSpace: "nowrap",
};

const allStoresBadgeStyle: React.CSSProperties = {
  ...storeBadgeStyle,
  background: "#ecfdf5",
  borderColor: "#86efac",
  color: "#166534",
};

const storeCheckboxPanelStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  maxHeight: "180px",
  overflowY: "auto",
  padding: "10px",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "10px",
};

const storeCheckboxLabelStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  fontSize: "14px",
};
