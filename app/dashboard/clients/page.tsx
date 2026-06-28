"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { buildPortalUrl } from "@/lib/clientPortals/getAppBaseUrl";
import ClientBrandMark from "@/app/components/ClientBrandMark";
import ClientPortalAccessPanel from "./ClientPortalAccessPanel";

type ClientRecord = {
  id: number | string;
  client_code: string;
  client_name: string | null;
  company_name: string | null;
  legal_name: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  vat_number: string | null;
  account_manager: string | null;
  status: string;
  notes: string | null;
  logo_url: string | null;
  created_at: string;
};

type ClientPortalSummary = {
  id: string;
  slug: string;
  active: boolean;
  client_id: string | null;
};

type ClientForm = {
  client_code: string;
  client_name: string;
  legal_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  vat_number: string;
  account_manager: string;
  status: string;
  notes: string;
  logo_url: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CLIENTS_PER_PAGE = 10;

const panelStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  fontSize: "16px",
};

const buttonStyle = {
  background: "#111827",
  color: "white",
  padding: "14px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
  borderBottom: "2px solid #e5e7eb",
};

const tdStyle = {
  padding: "12px",
  fontWeight: "500" as const,
  borderBottom: "1px solid #e5e7eb",
};

const emptyForm: ClientForm = {
  client_code: "",
  client_name: "",
  legal_name: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  vat_number: "",
  account_manager: "",
  status: "Active",
  notes: "",
  logo_url: "",
};

function getDisplayClientName(client: Pick<ClientRecord, "client_name" | "company_name">) {
  return client.client_name?.trim() || client.company_name?.trim() || "";
}

function formatNotes(notes: string | null) {
  if (!notes?.trim()) return "-";
  const trimmed = notes.trim();
  return trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
}

function getPortalAccessStatus(portal?: ClientPortalSummary | null) {
  if (!portal) return "Not configured";
  return portal.active ? "Active" : "Disabled";
}

function toForm(client: ClientRecord): ClientForm {
  return {
    client_code: client.client_code || "",
    client_name: getDisplayClientName(client),
    legal_name: client.legal_name || "",
    contact_person: client.contact_person || "",
    email: client.email || "",
    phone: client.phone || "",
    address: client.address || "",
    vat_number: client.vat_number || "",
    account_manager: client.account_manager || "",
    status: client.status || "Active",
    notes: client.notes || "",
    logo_url: client.logo_url || "",
  };
}

function trimForm(form: ClientForm) {
  const clientName = form.client_name.trim();

  return {
    client_code: form.client_code.trim(),
    client_name: clientName,
    company_name: clientName,
    legal_name: form.legal_name.trim() || null,
    contact_person: form.contact_person.trim() || null,
    email: form.email.trim() || null,
    phone: form.phone.trim() || null,
    address: form.address.trim() || null,
    vat_number: form.vat_number.trim() || null,
    account_manager: form.account_manager.trim() || null,
    status: form.status.trim() || "Active",
    notes: form.notes.trim() || null,
    logo_url: form.logo_url.trim() || null,
  };
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [searchText, setSearchText] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [newClient, setNewClient] = useState<ClientForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [editForm, setEditForm] = useState<ClientForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [portalsByClientId, setPortalsByClientId] = useState<
    Record<string, ClientPortalSummary>
  >({});
  const [generatingClientId, setGeneratingClientId] = useState<
    string | number | null
  >(null);
  const [expandedPortalClientId, setExpandedPortalClientId] = useState<
    string | number | null
  >(null);
  const [portalBanner, setPortalBanner] = useState<string | null>(null);
  const [portalRefreshKey, setPortalRefreshKey] = useState(0);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/";
        return;
      }

      const { data: employee } = await supabase
        .from("employees")
        .select("role")
        .eq("email", session.user.email)
        .maybeSingle();

      setIsAdmin(employee?.role?.toLowerCase() === "admin");
      await Promise.all([loadClients(), loadClientPortals()]);
    }

    checkUser();
  }, []);

  async function loadClientPortals() {
    const { data, error } = await supabase
      .from("client_portals")
      .select("id, slug, active, client_id")
      .not("client_id", "is", null);

    if (error) {
      console.error(error);
      return;
    }

    const nextMap: Record<string, ClientPortalSummary> = {};

    for (const portal of (data || []) as ClientPortalSummary[]) {
      if (portal.client_id) {
        nextMap[String(portal.client_id)] = portal;
      }
    }

    setPortalsByClientId(nextMap);
  }

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText]);

  async function loadClients() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select(
        "id, client_code, client_name, company_name, legal_name, contact_person, email, phone, address, vat_number, account_manager, status, notes, logo_url, created_at"
      )
      .order("client_name", { ascending: true })
      .order("client_code", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading clients");
      setLoading(false);
      return;
    }

    setClients((data || []) as ClientRecord[]);
    setLoading(false);
  }

  const filteredClients = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    if (!search) return clients;

    return clients.filter((client) => {
      const clientName = (client.client_name || "").toLowerCase();
      const contactPerson = (client.contact_person || "").toLowerCase();
      const email = (client.email || "").toLowerCase();
      const phone = (client.phone || "").toLowerCase();

      return (
        clientName.includes(search) ||
        contactPerson.includes(search) ||
        email.includes(search) ||
        phone.includes(search)
      );
    });
  }, [clients, searchText]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredClients.length / CLIENTS_PER_PAGE)
  );

  const paginatedClients = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages);
    const start = (safePage - 1) * CLIENTS_PER_PAGE;

    return filteredClients.slice(start, start + CLIENTS_PER_PAGE);
  }, [filteredClients, currentPage, totalPages]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  async function handlePortalAccessAction(client: ClientRecord) {
    const portal = portalsByClientId[String(client.id)];

    if (!portal) {
      setGeneratingClientId(client.id);

      try {
        const response = await fetch("/api/clients/portal-access", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ clientId: client.id }),
        });

        const result = (await response.json()) as {
          error?: string;
          portalUrl?: string;
          username?: string;
          password?: string;
          slug?: string;
          portalId?: string;
          active?: boolean;
          createdPortal?: boolean;
        };

        if (!response.ok) {
          setPortalBanner(result.error || "Failed to create portal access");
          window.setTimeout(() => setPortalBanner(null), 4000);
          return;
        }

        if (result.slug && result.portalId) {
          setPortalsByClientId((current) => ({
            ...current,
            [String(client.id)]: {
              id: result.portalId!,
              slug: result.slug!,
              active: result.active ?? true,
              client_id: String(client.id),
            },
          }));
        } else {
          await loadClientPortals();
        }

        setPortalRefreshKey((current) => current + 1);
        setExpandedPortalClientId(client.id);
        setPortalBanner(
          result.createdPortal ? "Portal created." : "Portal already exists."
        );
        window.setTimeout(() => setPortalBanner(null), 4000);
      } catch (error) {
        console.error(error);
        setPortalBanner("Failed to create portal access");
        window.setTimeout(() => setPortalBanner(null), 4000);
      } finally {
        setGeneratingClientId(null);
      }

      return;
    }

    setExpandedPortalClientId((current) => {
      const next = current === client.id ? null : client.id;

      if (next === client.id) {
        setPortalRefreshKey((key) => key + 1);
      }

      return next;
    });
  }

  async function copyPortalAccessLink(client: ClientRecord) {
    const portal = portalsByClientId[String(client.id)];

    if (!portal?.slug) {
      setPortalBanner("Create portal access first.");
      window.setTimeout(() => setPortalBanner(null), 4000);
      return;
    }

    try {
      await navigator.clipboard.writeText(buildPortalUrl(portal.slug));
      setPortalBanner("Portal copied.");
      window.setTimeout(() => setPortalBanner(null), 4000);
    } catch (error) {
      console.error(error);
      setPortalBanner("Could not copy portal link");
      window.setTimeout(() => setPortalBanner(null), 4000);
    }
  }

  function validateForm(form: ClientForm) {
    if (!form.client_name.trim()) {
      alert("Please fill Client Name");
      return false;
    }

    if (!form.client_code.trim()) {
      alert("Please fill Client Code");
      return false;
    }

    return true;
  }

  async function addClient() {
    if (!validateForm(newClient)) return;

    const { error } = await supabase.from("clients").insert([trimForm(newClient)]);

    if (error) {
      console.error(error);
      alert("Error adding client");
      return;
    }

    setNewClient(emptyForm);
    setShowAddPanel(false);
    loadClients();
  }

  function startEdit(client: ClientRecord) {
    setEditingId(client.id);
    setEditForm(toForm(client));
    setShowAddPanel(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(emptyForm);
  }

  async function saveEdit() {
    if (!validateForm(editForm)) return;
    if (!editingId) return;

    const { error } = await supabase
      .from("clients")
      .update(trimForm(editForm))
      .eq("id", editingId);

    if (error) {
      console.error(error);
      alert("Error saving client");
      return;
    }

    cancelEdit();
    loadClients();
  }

  async function deleteClient(client: ClientRecord) {
    const confirmed = window.confirm(
      `Delete client "${getDisplayClientName(client)}" (${client.client_code})?`
    );

    if (!confirmed) return;

    const { error } = await supabase.from("clients").delete().eq("id", client.id);

    if (error) {
      console.error(error);
      alert("Error deleting client");
      return;
    }

    if (editingId === client.id) {
      cancelEdit();
    }

    loadClients();
  }

  function renderFormFields(
    form: ClientForm,
    onChange: (next: ClientForm) => void
  ) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "14px",
          marginTop: "16px",
        }}
      >
        <Field
          label="Client Code"
          value={form.client_code}
          onChange={(value) => onChange({ ...form, client_code: value })}
          placeholder="Client Code"
        />
        <Field
          label="Client Name"
          value={form.client_name}
          onChange={(value) => onChange({ ...form, client_name: value })}
          placeholder="Client Name"
        />
        <Field
          label="Logo URL"
          value={form.logo_url}
          onChange={(value) => onChange({ ...form, logo_url: value })}
          placeholder="https://example.com/logo.png"
        />
        {form.logo_url.trim() || form.client_name.trim() ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              alignSelf: "end",
            }}
          >
            <ClientBrandMark
              name={form.client_name.trim() || "Client"}
              logoUrl={form.logo_url.trim() || null}
              size="md"
            />
            <span style={{ fontSize: "13px", color: "#6b7280" }}>Logo preview</span>
          </div>
        ) : null}
        <Field
          label="Legal Name"
          value={form.legal_name}
          onChange={(value) => onChange({ ...form, legal_name: value })}
          placeholder="Legal Name"
        />
        <Field
          label="Contact Person"
          value={form.contact_person}
          onChange={(value) => onChange({ ...form, contact_person: value })}
          placeholder="Contact Person"
        />
        <Field
          label="Email"
          value={form.email}
          onChange={(value) => onChange({ ...form, email: value })}
          placeholder="Email"
        />
        <Field
          label="Phone"
          value={form.phone}
          onChange={(value) => onChange({ ...form, phone: value })}
          placeholder="Phone"
        />
        <Field
          label="Address"
          value={form.address}
          onChange={(value) => onChange({ ...form, address: value })}
          placeholder="Address"
        />
        <Field
          label="VAT Number"
          value={form.vat_number}
          onChange={(value) => onChange({ ...form, vat_number: value })}
          placeholder="VAT Number"
        />
        <Field
          label="Account Manager"
          value={form.account_manager}
          onChange={(value) => onChange({ ...form, account_manager: value })}
          placeholder="Account Manager"
        />
        <Field
          label="Status"
          value={form.status}
          onChange={(value) => onChange({ ...form, status: value })}
          placeholder="Status"
        />
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
            Notes
          </label>
          <textarea
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => onChange({ ...form, notes: e.target.value })}
            rows={3}
            style={{
              ...inputStyle,
              resize: "vertical" as const,
              fontFamily: "inherit",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <main
      style={{
        padding: "40px",
        fontFamily: "Arial",
        background: "#f3f4f6",
        color: "#111827",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "clamp(28px, 5vw, 42px)", margin: 0 }}>
            Clients
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
            Manage all company clients.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setShowAddPanel(true);
              setEditingId(null);
              setEditForm(emptyForm);
              setNewClient(emptyForm);
            }}
            style={buttonStyle}
          >
            Add Client
          </button>

          <a
            href="/dashboard"
            style={{
              background: "#f3f4f6",
              color: "#111827",
              padding: "14px 24px",
              borderRadius: "12px",
              textDecoration: "none",
              display: "inline-block",
              fontWeight: "600",
              border: "1px solid #d1d5db",
              fontSize: "16px",
            }}
          >
            Back to Dashboard
          </a>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            style={{
              background: "#dc2626",
              color: "white",
              padding: "14px 24px",
              border: "none",
              borderRadius: "12px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {showAddPanel && (
        <div style={{ ...panelStyle, marginBottom: "24px" }}>
          <h2 style={{ marginTop: 0 }}>Add Client</h2>
          {renderFormFields(newClient, setNewClient)}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={addClient} style={buttonStyle}>
              Add Client
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddPanel(false);
                setNewClient(emptyForm);
              }}
              style={{
                background: "#6b7280",
                color: "white",
                padding: "14px 24px",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {editingId && (
        <div style={{ ...panelStyle, marginBottom: "24px" }}>
          <h2 style={{ marginTop: 0 }}>Edit Client</h2>
          {renderFormFields(editForm, setEditForm)}
          <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
            <button type="button" onClick={saveEdit} style={buttonStyle}>
              Save Changes
            </button>
            <button
              type="button"
              onClick={cancelEdit}
              style={{
                background: "#6b7280",
                color: "white",
                padding: "14px 24px",
                border: "none",
                borderRadius: "12px",
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Cancel Edit
            </button>
          </div>
        </div>
      )}

      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "16px",
            marginBottom: "20px",
          }}
        >
          <h2 style={{ margin: 0 }}>Clients</h2>

          <input
            placeholder="Search by client name, contact, email, or phone..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              maxWidth: "320px",
            }}
          />
        </div>

        <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#6b7280" }}>
          Showing {filteredClients.length} of {clients.length} clients
        </p>

        {portalBanner && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              borderRadius: "10px",
              background: portalBanner.toLowerCase().includes("fail") ||
                portalBanner.toLowerCase().includes("could not") ||
                portalBanner.toLowerCase().includes("error")
                ? "#fef2f2"
                : "#ecfdf5",
              border: `1px solid ${
                portalBanner.toLowerCase().includes("fail") ||
                portalBanner.toLowerCase().includes("could not")
                  ? "#fecaca"
                  : "#86efac"
              }`,
              color:
                portalBanner.toLowerCase().includes("fail") ||
                portalBanner.toLowerCase().includes("could not")
                  ? "#991b1b"
                  : "#166534",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {portalBanner}
          </div>
        )}

        {loading ? (
          <p>Loading clients...</p>
        ) : filteredClients.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No clients found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                background: "white",
              }}
            >
              <thead>
                <tr>
                  <th style={thStyle}>Logo</th>
                  <th style={thStyle}>Client Name</th>
                  <th style={thStyle}>Contact Person</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Phone</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Notes</th>
                  <th style={thStyle}>Portal Slug</th>
                  <th style={thStyle}>Portal Access</th>
                  <th style={thStyle}>Portal Actions</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedClients.map((client) => {
                  const portal = portalsByClientId[String(client.id)];
                  const isGenerating = generatingClientId === client.id;
                  const isExpanded = expandedPortalClientId === client.id;
                  const hasPortal = Boolean(portal?.slug);

                  return (
                  <Fragment key={String(client.id)}>
                  <tr>
                    <td style={tdStyle}>
                      <ClientBrandMark
                        name={getDisplayClientName(client) || "Client"}
                        logoUrl={client.logo_url}
                        size="sm"
                      />
                    </td>
                    <td style={tdStyle}>{getDisplayClientName(client) || "-"}</td>
                    <td style={tdStyle}>{client.contact_person || "-"}</td>
                    <td style={tdStyle}>{client.email || "-"}</td>
                    <td style={tdStyle}>{client.phone || "-"}</td>
                    <td style={tdStyle}>{client.status || "-"}</td>
                    <td style={tdStyle} title={client.notes?.trim() || undefined}>
                      {formatNotes(client.notes)}
                    </td>
                    <td style={tdStyle}>{portal?.slug || "-"}</td>
                    <td style={tdStyle}>{getPortalAccessStatus(portal)}</td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => handlePortalAccessAction(client)}
                          disabled={isGenerating}
                          style={{
                            background: hasPortal ? "#2563eb" : "#059669",
                            color: "white",
                            padding: "8px 14px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: isGenerating ? "not-allowed" : "pointer",
                            fontWeight: "600",
                            opacity: isGenerating ? 0.7 : 1,
                          }}
                        >
                          {isGenerating
                            ? "Working..."
                            : hasPortal
                              ? isExpanded
                                ? "Hide Access"
                                : "View / Copy Access"
                              : "Create Portal Access"}
                        </button>

                        {hasPortal && (
                          <button
                            type="button"
                            onClick={() => copyPortalAccessLink(client)}
                            style={{
                              background: "#ffffff",
                              color: "#111827",
                              padding: "8px 14px",
                              border: "1px solid #d1d5db",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            Copy Link
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          onClick={() => startEdit(client)}
                          style={{
                            background: "#2563eb",
                            color: "white",
                            padding: "8px 14px",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                          }}
                        >
                          Edit
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => deleteClient(client)}
                            style={{
                              background: "#dc2626",
                              color: "white",
                              padding: "8px 14px",
                              border: "none",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontWeight: "600",
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && hasPortal && (
                    <tr key={`${String(client.id)}-portal-access`}>
                      <td colSpan={11} style={{ ...tdStyle, background: "#fcfcfd" }}>
                        <ClientPortalAccessPanel
                          clientId={client.id}
                          clientName={getDisplayClientName(client)}
                          logoUrl={client.logo_url}
                          refreshKey={portalRefreshKey}
                          onUpdated={loadClientPortals}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredClients.length > 0 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: "10px",
              marginTop: "20px",
            }}
          >
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => prev - 1)}
              style={{
                ...buttonStyle,
                opacity: currentPage === 1 ? 0.5 : 1,
                cursor: currentPage === 1 ? "not-allowed" : "pointer",
              }}
            >
              Previous
            </button>

            <span>
              Page {Math.min(currentPage, totalPages)} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((prev) => prev + 1)}
              style={{
                ...buttonStyle,
                opacity: currentPage === totalPages ? 0.5 : 1,
                cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
        {label}
      </label>
      <input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </div>
  );
}
