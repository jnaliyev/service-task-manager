"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import type { ClientPortalRecord } from "@/app/client/types/portal";
import CreateClientWizard from "./CreateClientWizard";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const panelStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const cardStyle = {
  background: "white",
  color: "#111827",
  padding: "20px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  width: "100%",
};

const numberStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  margin: "8px 0 0",
  color: "#111827",
};

const buttonStyle = {
  background: "#111827",
  color: "white",
  padding: "10px 16px",
  border: "none",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "2px solid #e5e7eb",
  fontSize: "14px",
  color: "#374151",
  whiteSpace: "nowrap" as const,
};

const tdStyle = {
  padding: "12px",
  fontWeight: "500" as const,
  borderBottom: "1px solid #e5e7eb",
  fontSize: "14px",
  color: "#111827",
  verticalAlign: "middle" as const,
};

function getPortalUrl(slug: string) {
  if (typeof window === "undefined") {
    return `/client/${slug}`;
  }

  return `${window.location.origin}/client/${slug}`;
}

function ClientActionsDropdown({
  portal,
  isOpen,
  onToggle,
  onClose,
  onCopyFeedback,
  onReload,
}: {
  portal: ClientPortalRecord;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onCopyFeedback: (slug: string) => void;
  onReload: () => Promise<void>;
}) {
  const portalUrl = getPortalUrl(portal.slug);

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    minWidth: "188px",
    background: "white",
    border: "1px solid #e5e7eb",
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
    overflow: "hidden",
    zIndex: 20,
  };

  const menuItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    border: "none",
    background: "transparent",
    color: "#111827",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    boxSizing: "border-box",
    borderBottom: "1px solid #e5e7eb",
  };

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(portalUrl);
      onCopyFeedback(portal.slug);
    } catch (error) {
      console.error(error);
      alert("Unable to copy link");
    }

    onClose();
  }

  async function handleToggleActive() {
    const { error } = await supabase
      .from("client_portals")
      .update({ active: !portal.active })
      .eq("id", portal.id);

    if (error) {
      console.error(error);
      alert("Error updating client status");
      onClose();
      return;
    }

    await onReload();
    onClose();
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete client "${portal.company_name}"?\n\nThis will permanently remove the portal "${portal.slug}".`
    );

    if (!confirmed) {
      onClose();
      return;
    }

    const { error } = await supabase
      .from("client_portals")
      .delete()
      .eq("id", portal.id);

    if (error) {
      console.error(error);
      alert("Error deleting client");
      onClose();
      return;
    }

    await onReload();
    onClose();
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={onToggle} style={buttonStyle}>
        Actions ▾
      </button>

      {isOpen && (
        <div style={menuStyle}>
          <a
            href={portalUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={menuItemStyle}
            onClick={onClose}
          >
            Open Portal
          </a>

          <button type="button" style={menuItemStyle} onClick={handleCopyLink}>
            Copy Portal Link
          </button>

          <button
            type="button"
            style={menuItemStyle}
            onClick={() => {
              alert("Edit Client will be available soon.");
              onClose();
            }}
          >
            Edit Client
          </button>

          <button type="button" style={menuItemStyle} onClick={handleToggleActive}>
            {portal.active ? "Disable Portal" : "Enable Portal"}
          </button>

          <button
            type="button"
            style={{
              ...menuItemStyle,
              color: "#dc2626",
              borderBottom: "none",
            }}
            onClick={handleDelete}
          >
            Delete Client
          </button>
        </div>
      )}
    </div>
  );
}

export default function ClientPortalsPage() {
  const [portals, setPortals] = useState<ClientPortalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [isCreateWizardOpen, setIsCreateWizardOpen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/";
        return;
      }

      await loadPortals();
    }

    checkUser();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!pageRef.current?.contains(event.target as Node)) {
        setOpenActionsId(null);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadPortals() {
    setLoading(true);

    const { data, error } = await supabase
      .from("client_portals")
      .select("id, slug, company_name, store_id, token, active, created_at")
      .order("company_name", { ascending: true })
      .order("slug", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading clients");
      setLoading(false);
      return;
    }

    setPortals((data || []) as ClientPortalRecord[]);
    setLoading(false);
  }

  const filteredPortals = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (!search) return portals;

    return portals.filter((portal) => {
      const companyName = (portal.company_name || "").toLowerCase();
      const slug = (portal.slug || "").toLowerCase();

      return companyName.includes(search) || slug.includes(search);
    });
  }, [portals, searchText]);

  const totalClients = portals.length;
  const activeClients = portals.filter((portal) => portal.active).length;
  const disabledClients = portals.filter((portal) => !portal.active).length;

  function handleCopyFeedback(slug: string) {
    setCopiedSlug(slug);
    window.setTimeout(() => {
      setCopiedSlug((current) => (current === slug ? null : current));
    }, 2000);
  }

  return (
    <main
      ref={pageRef}
      style={{
        padding: "clamp(20px, 4vw, 40px)",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
        background: "#f3f4f6",
        color: "#111827",
        minHeight: "100vh",
      }}
    >
      <a
        href="/dashboard"
        style={{
          background: "#ffffff",
          color: "#111827",
          padding: "10px 16px",
          borderRadius: "10px",
          textDecoration: "none",
          display: "inline-block",
          marginBottom: "20px",
          fontWeight: "600",
          border: "1px solid #d1d5db",
        }}
      >
        ← Back to Dashboard
      </a>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: 0 }}>
            Clients
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
            Manage company-specific client portals
          </p>
        </div>

        <button
          type="button"
          style={{
            ...buttonStyle,
            padding: "12px 20px",
          }}
          onClick={() => setIsCreateWizardOpen(true)}
        >
          Create Client
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "15px", color: "#64748b" }}>
            Total Clients
          </h3>
          <p style={numberStyle}>{totalClients}</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "15px", color: "#64748b" }}>
            Active Clients
          </h3>
          <p style={{ ...numberStyle, color: "#166534" }}>{activeClients}</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ margin: 0, fontSize: "15px", color: "#64748b" }}>
            Disabled Clients
          </h3>
          <p style={{ ...numberStyle, color: "#b91c1c" }}>{disabledClients}</p>
        </div>
      </div>

      <div style={{ ...panelStyle, marginBottom: "24px" }}>
        <label
          htmlFor="client-search"
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
            fontSize: "14px",
          }}
        >
          Search
        </label>
        <input
          id="client-search"
          type="search"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search by company name or portal slug..."
          style={inputStyle}
        />
      </div>

      <div style={panelStyle}>
        {loading ? (
          <p style={{ margin: 0, color: "#64748b" }}>Loading clients...</p>
        ) : filteredPortals.length === 0 ? (
          <p style={{ margin: 0, color: "#64748b" }}>
            {portals.length === 0
              ? "No clients found."
              : "No clients match your search."}
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                minWidth: "980px",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>No</th>
                  <th style={thStyle}>Portal Slug</th>
                  <th style={thStyle}>Company Name</th>
                  <th style={thStyle}>Stores</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Portal Link</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPortals.map((portal, index) => {
                  const portalUrl = getPortalUrl(portal.slug);

                  return (
                    <tr key={portal.id}>
                      <td style={tdStyle}>{index + 1}</td>
                      <td style={tdStyle}>{portal.slug}</td>
                      <td style={tdStyle}>{portal.company_name}</td>
                      <td style={tdStyle}>
                        {portal.store_id ? portal.store_id : "All Stores"}
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            borderRadius: "999px",
                            fontSize: "12px",
                            fontWeight: 700,
                            background: portal.active ? "#dcfce7" : "#fee2e2",
                            color: portal.active ? "#166534" : "#b91c1c",
                          }}
                        >
                          {portal.active ? "Active" : "Disabled"}
                        </span>
                        {copiedSlug === portal.slug && (
                          <span
                            style={{
                              display: "inline-block",
                              marginLeft: "8px",
                              fontSize: "12px",
                              color: "#16a34a",
                              fontWeight: 700,
                            }}
                          >
                            Link copied
                          </span>
                        )}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: "320px" }}>
                        <a
                          href={portalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2563eb",
                            textDecoration: "none",
                            fontWeight: 600,
                            wordBreak: "break-all",
                          }}
                        >
                          {portalUrl}
                        </a>
                      </td>
                      <td style={tdStyle}>
                        <ClientActionsDropdown
                          portal={portal}
                          isOpen={openActionsId === portal.id}
                          onToggle={() =>
                            setOpenActionsId((current) =>
                              current === portal.id ? null : portal.id
                            )
                          }
                          onClose={() => setOpenActionsId(null)}
                          onCopyFeedback={handleCopyFeedback}
                          onReload={loadPortals}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateClientWizard
        isOpen={isCreateWizardOpen}
        onClose={() => setIsCreateWizardOpen(false)}
      />
    </main>
  );
}
