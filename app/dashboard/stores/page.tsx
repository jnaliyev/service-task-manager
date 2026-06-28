"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { restoreClientAssignmentsFromCompanyName } from "./restoreClientAssignments";

type ClientOption = {
  id: number | string;
  client_name: string | null;
};

type Store = {
  id: number;
  company_name: string | null;
  store_name: string | null;
  location: string | null;
  store_code?: string | null;
  client_id: number | string | null;
  clients: { client_name: string | null } | null;
};

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

function getClientName(store: Store): string {
  const linkedName = store.clients?.client_name?.trim();
  if (linkedName) return linkedName;

  const legacyCompany = store.company_name?.trim();
  if (legacyCompany) return legacyCompany;

  if (store.client_id) return "Unassigned";

  return "Unassigned";
}

function normalizeClientId(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
}

function parseClientId(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getSelectedClientName(
  clientId: string,
  clientOptions: ClientOption[]
): string {
  const client = clientOptions.find(
    (option) => normalizeClientId(option.id) === clientId
  );
  return client?.client_name?.trim() || "";
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [searchText, setSearchText] = useState("");
  const [newStore, setNewStore] = useState({
    client_id: "",
    store_name: "",
    location: "",
    store_code: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    client_id: "",
    store_name: "",
    location: "",
    store_code: "",
  });
  const [loading, setLoading] = useState(true);
  const [bulkClientId, setBulkClientId] = useState("");
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [restoringAssignments, setRestoringAssignments] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/";
        return;
      }

      setRestoringAssignments(true);

      try {
        const result = await restoreClientAssignmentsFromCompanyName(supabase);

        if (result.createdClients > 0 || result.assignedStores > 0) {
          setSuccessMessage(
            `Restored ownership from company_name. Created ${result.createdClients} client${result.createdClients === 1 ? "" : "s"}. Assigned ${result.assignedStores} store${result.assignedStores === 1 ? "" : "s"}.`
          );
        }
      } catch (error) {
        console.error(error);
        alert("Error restoring client assignments from company_name");
      } finally {
        setRestoringAssignments(false);
      }

      await Promise.all([loadStores(), loadClients()]);
    }

    checkUser();
  }, []);

  async function loadClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, client_name, status")
      .eq("status", "Active")
      .order("client_name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setClients(data || []);
  }

  async function loadStores() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, company_name, store_name, location, store_code, client_id, clients(client_name)"
      )
      .order("store_name", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading stores");
      setLoading(false);
      return;
    }

    const normalizedStores: Store[] = (data || []).map((store) => ({
      id: store.id,
      company_name: store.company_name,
      store_name: store.store_name,
      location: store.location,
      store_code: store.store_code,
      client_id: store.client_id,
      clients: Array.isArray(store.clients) ? store.clients[0] ?? null : store.clients,
    }));

    setStores(normalizedStores);
    setLoading(false);
  }

  const filteredStores = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    const validStores = stores.filter((store) => {
      const name = (store.store_name || "").trim();
      return name !== "";
    });

    const searchedStores = search
      ? validStores.filter((store) => {
          const name = (store.store_name || "").toLowerCase();
          const location = (store.location || "").toLowerCase();
          const clientName = getClientName(store).toLowerCase();

          return (
            name.includes(search) ||
            location.includes(search) ||
            clientName.includes(search)
          );
        })
      : validStores;

    return [...searchedStores].sort((a, b) => {
      const byClient = getClientName(a).localeCompare(getClientName(b), undefined, {
        sensitivity: "base",
      });

      if (byClient !== 0) return byClient;

      return (a.store_name || "").localeCompare(b.store_name || "", undefined, {
        sensitivity: "base",
      });
    });
  }, [stores, searchText]);

  async function addStore() {
    const clientId = parseClientId(newStore.client_id);

    if (!clientId || !newStore.store_name || !newStore.location) {
      alert("Please select a Client and fill Store Name and Location");
      return;
    }

    const companyName = getSelectedClientName(newStore.client_id, clients);

    const { error } = await supabase.from("stores").insert([
      {
        client_id: clientId,
        company_name: companyName,
        store_name: newStore.store_name.trim(),
        location: newStore.location.trim(),
        store_code: newStore.store_code.trim(),
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error adding store");
      return;
    }

    setNewStore({
      client_id: "",
      store_name: "",
      location: "",
      store_code: "",
    });

    loadStores();
  }

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditForm({
      client_id: normalizeClientId(store.client_id),
      store_name: store.store_name || "",
      location: store.location || "",
      store_code: store.store_code || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      client_id: "",
      store_name: "",
      location: "",
      store_code: "",
    });
  }

  async function saveEdit() {
    const clientId = parseClientId(editForm.client_id);

    if (!clientId || !editForm.store_name || !editForm.location) {
      alert("Please select a Client and fill Store Name and Location");
      return;
    }

    if (editingId === null) return;

    const companyName = getSelectedClientName(editForm.client_id, clients);

    const { error } = await supabase
      .from("stores")
      .update({
        client_id: clientId,
        company_name: companyName,
        store_name: editForm.store_name.trim(),
        location: editForm.location.trim(),
        store_code: editForm.store_code.trim(),
      })
      .eq("id", editingId);

    if (error) {
      console.error(error);
      alert("Error saving store");
      return;
    }

    cancelEdit();
    loadStores();
  }

  const bulkClient = clients.find(
    (client) => normalizeClientId(client.id) === bulkClientId
  );
  const bulkClientName = bulkClient?.client_name?.trim() || "";

  const canBulkAssign =
    filteredStores.length > 0 && bulkClientId !== "" && !bulkAssigning;

  function requestBulkAssign() {
    if (!bulkClientId) {
      alert("Please select a client");
      return;
    }

    if (filteredStores.length === 0) return;

    setShowBulkConfirm(true);
  }

  function cancelBulkConfirm() {
    setShowBulkConfirm(false);
  }

  async function confirmBulkAssign() {
    const clientId = parseClientId(bulkClientId);

    if (!clientId || filteredStores.length === 0) return;

    setBulkAssigning(true);

    const storeIds = filteredStores.map((store) => store.id);
    const { error } = await supabase
      .from("stores")
      .update({ client_id: clientId })
      .in("id", storeIds);

    setBulkAssigning(false);

    if (error) {
      console.error(error);
      alert("Error assigning client to stores");
      return;
    }

    setShowBulkConfirm(false);
    setSuccessMessage(
      `Assigned ${bulkClientName} to ${storeIds.length} store${storeIds.length === 1 ? "" : "s"}.`
    );
    await Promise.all([loadClients(), loadStores()]);
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
      <a
        href="/dashboard"
        style={{
          background: "#f3f4f6",
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
        ← Dashboard
      </a>

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
            Stores Management
          </h1>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px" }}>
            Manage company stores and locations
          </p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/";
          }}
          style={{
            background: "#dc2626",
            color: "white",
            padding: "12px 20px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ ...panelStyle, marginBottom: "24px" }}>
        <h2 style={{ marginTop: 0 }}>Add Store</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "14px",
            marginTop: "16px",
          }}
        >
          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Client
            </label>
            <select
              value={newStore.client_id}
              onChange={(e) =>
                setNewStore({ ...newStore, client_id: e.target.value })
              }
              style={inputStyle}
            >
              <option value="">Select Client</option>
              {clients.map((client) => (
                <option key={normalizeClientId(client.id)} value={normalizeClientId(client.id)}>
                  {client.client_name?.trim() || "Unnamed Client"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Store Name
            </label>
            <input
              placeholder="Store Name"
              value={newStore.store_name}
              onChange={(e) =>
                setNewStore({ ...newStore, store_name: e.target.value })
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Location
            </label>
            <input
              placeholder="Location"
              value={newStore.location}
              onChange={(e) =>
                setNewStore({ ...newStore, location: e.target.value })
              }
              style={inputStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
              Store Code
            </label>
            <input
              placeholder="Store Code"
              value={newStore.store_code}
              onChange={(e) =>
                setNewStore({ ...newStore, store_code: e.target.value })
              }
              style={inputStyle}
            />
          </div>
        </div>

        <button onClick={addStore} style={{ ...buttonStyle, marginTop: "20px" }}>
          Add Store
        </button>
      </div>

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
          <h2 style={{ margin: 0 }}>Stores</h2>

          <input
            placeholder="Search by store name, location, or client..."
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
          Showing {filteredStores.length} valid stores
          {restoringAssignments ? " · Restoring client assignments from company_name..." : ""}
        </p>

        {successMessage && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 16px",
              borderRadius: "10px",
              background: "#dcfce7",
              color: "#166534",
              fontSize: "14px",
              fontWeight: 600,
            }}
          >
            {successMessage}
          </div>
        )}

        <div
          style={{
            marginBottom: "24px",
            padding: "20px",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            background: "#f9fafb",
          }}
        >
          <h3 style={{ margin: "0 0 14px", fontSize: "16px" }}>
            Bulk Client Assignment
          </h3>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 220px", minWidth: "220px" }}>
              <label
                style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}
              >
                Client
              </label>
              <select
                value={bulkClientId}
                onChange={(e) => {
                  setBulkClientId(e.target.value);
                  setSuccessMessage(null);
                }}
                style={inputStyle}
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={normalizeClientId(client.id)} value={normalizeClientId(client.id)}>
                    {client.client_name?.trim() || "Unnamed Client"}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={requestBulkAssign}
              disabled={!canBulkAssign}
              style={{
                ...buttonStyle,
                background: canBulkAssign ? "#2563eb" : "#9ca3af",
                cursor: canBulkAssign ? "pointer" : "not-allowed",
                opacity: canBulkAssign ? 1 : 0.8,
              }}
            >
              Assign to Filtered Stores
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading stores...</p>
        ) : filteredStores.length === 0 ? (
          <p style={{ color: "#6b7280" }}>No stores found.</p>
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
                  <th style={thStyle}>No</th>
                  <th style={thStyle}>Client</th>
                  <th style={thStyle}>Store Name</th>
                  <th style={thStyle}>Location</th>
                  <th style={thStyle}>Store Code</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStores.map((store, index) => {
                  const isEditing = editingId === store.id;

                  return (
                    <tr key={store.id}>
                      <td style={tdStyle}>{index + 1}</td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <select
                            value={editForm.client_id}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                client_id: e.target.value,
                              })
                            }
                            style={{ ...inputStyle, padding: "8px 12px", fontSize: "14px" }}
                          >
                            <option value="">Select Client</option>
                            {clients.map((client) => (
                              <option
                                key={normalizeClientId(client.id)}
                                value={normalizeClientId(client.id)}
                              >
                                {client.client_name?.trim() || "Unnamed Client"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          getClientName(store)
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <input
                            value={editForm.store_name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                store_name: e.target.value,
                              })
                            }
                            style={{ ...inputStyle, padding: "8px 12px", fontSize: "14px" }}
                          />
                        ) : (
                          store.store_name || "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <input
                            value={editForm.location}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                location: e.target.value,
                              })
                            }
                            style={{ ...inputStyle, padding: "8px 12px", fontSize: "14px" }}
                          />
                        ) : (
                          store.location || "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <input
                            value={editForm.store_code}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                store_code: e.target.value,
                              })
                            }
                            style={{ ...inputStyle, padding: "8px 12px", fontSize: "14px" }}
                          />
                        ) : (
                          store.store_code || "-"
                        )}
                      </td>

                      <td style={tdStyle}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button
                              onClick={saveEdit}
                              style={{
                                background: "#16a34a",
                                color: "white",
                                padding: "8px 14px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Save Changes
                            </button>

                            <button
                              onClick={cancelEdit}
                              style={{
                                background: "#6b7280",
                                color: "white",
                                padding: "8px 14px",
                                border: "none",
                                borderRadius: "8px",
                                cursor: "pointer",
                                fontWeight: "600",
                              }}
                            >
                              Cancel Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(store)}
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
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showBulkConfirm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "28px",
              width: "100%",
              maxWidth: "420px",
              boxShadow: "0 20px 40px rgba(15, 23, 42, 0.2)",
            }}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: "20px" }}>
              Assign client
            </h3>

            <p style={{ margin: "0 0 8px", fontSize: "16px", fontWeight: 600 }}>
              &ldquo;{bulkClientName}&rdquo;
            </p>
            <p style={{ margin: "0 0 24px", fontSize: "16px", color: "#64748b" }}>
              to {filteredStores.length} store
              {filteredStores.length === 1 ? "" : "s"}?
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                onClick={cancelBulkConfirm}
                disabled={bulkAssigning}
                style={{
                  background: "#6b7280",
                  color: "white",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: bulkAssigning ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                Cancel
              </button>

              <button
                onClick={confirmBulkAssign}
                disabled={bulkAssigning}
                style={{
                  background: "#2563eb",
                  color: "white",
                  padding: "10px 18px",
                  border: "none",
                  borderRadius: "10px",
                  cursor: bulkAssigning ? "not-allowed" : "pointer",
                  fontWeight: 600,
                }}
              >
                {bulkAssigning ? "Assigning..." : "Assign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
