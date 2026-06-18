"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Store = {
  id: number;
  company_name: string | null;
  store_name: string | null;
  location: string | null;
  store_code?: string | null;
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

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [searchText, setSearchText] = useState("");
  const [newStore, setNewStore] = useState({
    company_name: "",
    store_name: "",
    location: "",
    store_code: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    company_name: "",
    store_name: "",
    location: "",
    store_code: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        window.location.href = "/";
        return;
      }

      await loadStores();
    }

    checkUser();
  }, []);

  async function loadStores() {
    setLoading(true);

    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("company_name", { ascending: true })
      .order("store_name", { ascending: true });

    if (error) {
      console.error(error);
      alert("Error loading stores");
      setLoading(false);
      return;
    }

    setStores(data || []);
    setLoading(false);
  }

  const filteredStores = useMemo(() => {
    const search = searchText.toLowerCase().trim();

    const validStores = stores.filter((store) => {
      const company = (store.company_name || "").trim();
      const name = (store.store_name || "").trim();

      return company !== "" || name !== "";
    });

    const searchedStores = search
      ? validStores.filter((store) => {
          const company = (store.company_name || "").toLowerCase();
          const name = (store.store_name || "").toLowerCase();
          const location = (store.location || "").toLowerCase();
          const code = (store.store_code || "").toLowerCase();

          return (
            company.includes(search) ||
            name.includes(search) ||
            location.includes(search) ||
            code.includes(search)
          );
        })
      : validStores;

    return [...searchedStores].sort((a, b) => {
      const byCompany = (a.company_name || "").localeCompare(
        b.company_name || "",
        undefined,
        { sensitivity: "base" }
      );

      if (byCompany !== 0) return byCompany;

      return (a.store_name || "").localeCompare(b.store_name || "", undefined, {
        sensitivity: "base",
      });
    });
  }, [stores, searchText]);

  async function addStore() {
    if (!newStore.company_name || !newStore.store_name || !newStore.location) {
      alert("Please fill Company Name, Store Name, and Location");
      return;
    }

    const { error } = await supabase.from("stores").insert([
      {
        company_name: newStore.company_name.trim(),
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
      company_name: "",
      store_name: "",
      location: "",
      store_code: "",
    });

    loadStores();
  }

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditForm({
      company_name: store.company_name || "",
      store_name: store.store_name || "",
      location: store.location || "",
      store_code: store.store_code || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({
      company_name: "",
      store_name: "",
      location: "",
      store_code: "",
    });
  }

  async function saveEdit() {
    if (!editForm.company_name || !editForm.store_name || !editForm.location) {
      alert("Please fill Company Name, Store Name, and Location");
      return;
    }

    if (editingId === null) return;

    const { error } = await supabase
      .from("stores")
      .update({
        company_name: editForm.company_name.trim(),
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
              Company Name
            </label>
            <input
              placeholder="Company Name"
              value={newStore.company_name}
              onChange={(e) =>
                setNewStore({ ...newStore, company_name: e.target.value })
              }
              style={inputStyle}
            />
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
            placeholder="Search stores..."
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
        </p>

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
                  <th style={thStyle}>Company</th>
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
                          <input
                            value={editForm.company_name}
                            onChange={(e) =>
                              setEditForm({
                                ...editForm,
                                company_name: e.target.value,
                              })
                            }
                            style={{ ...inputStyle, padding: "8px 12px", fontSize: "14px" }}
                          />
                        ) : (
                          store.company_name || "-"
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
    </main>
  );
}