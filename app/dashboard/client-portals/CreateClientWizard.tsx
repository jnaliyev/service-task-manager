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

type WizardForm = {
  companyName: string;
  slug: string;
  status: "active" | "disabled";
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "8px",
  fontWeight: 600,
  fontSize: "14px",
  color: "#374151",
};

const buttonStyle: React.CSSProperties = {
  background: "#111827",
  color: "white",
  padding: "12px 18px",
  border: "none",
  borderRadius: "10px",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: "#ffffff",
  color: "#111827",
  border: "1px solid #d1d5db",
};

function slugifyCompanyName(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getInitialForm(): WizardForm {
  return {
    companyName: "",
    slug: "",
    status: "active",
  };
}

function getStoreLabel(store: Store) {
  const name = (store.store_name || "").trim();
  const location = (store.location || "").trim();

  if (name && location) {
    return `${name} ${location}`;
  }

  return name || location || `Store #${store.id}`;
}

type CreateClientWizardProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function CreateClientWizard({
  isOpen,
  onClose,
}: CreateClientWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<WizardForm>(getInitialForm);
  const [slugEditedManually, setSlugEditedManually] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<number[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    setStep(1);
    setForm(getInitialForm());
    setSlugEditedManually(false);
    setSelectedStoreIds([]);

    async function loadStores() {
      setStoresLoading(true);

      const { data, error } = await supabase
        .from("stores")
        .select("id, company_name, store_name, location, store_code")
        .order("company_name", { ascending: true })
        .order("store_name", { ascending: true });

      if (error) {
        console.error(error);
        alert("Error loading stores");
        setStoresLoading(false);
        return;
      }

      setStores(
        (data || []).filter(
          (store) =>
            (store.company_name || "").trim() !== "" ||
            (store.store_name || "").trim() !== ""
        ) as Store[]
      );
      setStoresLoading(false);
    }

    loadStores();
  }, [isOpen]);

  const storesByCompany = useMemo(() => {
    const groups = new Map<string, Store[]>();

    stores.forEach((store) => {
      const company = (store.company_name || "Other").trim() || "Other";

      if (!groups.has(company)) {
        groups.set(company, []);
      }

      groups.get(company)?.push(store);
    });

    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [stores]);

  if (!isOpen) return null;

  function handleCompanyNameChange(value: string) {
    setForm((current) => ({
      ...current,
      companyName: value,
      slug: slugEditedManually ? current.slug : slugifyCompanyName(value),
    }));
  }

  function handleSlugChange(value: string) {
    setSlugEditedManually(true);
    setForm((current) => ({
      ...current,
      slug: slugifyCompanyName(value),
    }));
  }

  function toggleStore(storeId: number) {
    setSelectedStoreIds((current) =>
      current.includes(storeId)
        ? current.filter((id) => id !== storeId)
        : [...current, storeId]
    );
  }

  function handleNext() {
    if (step === 1) {
      if (!form.companyName.trim()) {
        alert("Please enter a company name.");
        return;
      }

      if (!form.slug.trim()) {
        alert("Please enter a portal slug.");
        return;
      }
    }

    setStep((current) => Math.min(current + 1, 3));
  }

  function handleBack() {
    setStep((current) => Math.max(current - 1, 1));
  }

  function handleFinish() {
    alert("Client creation coming in next step.");
    onClose();
  }

  const stepLabels = ["Client Information", "Store Assignment", "Review"];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: "#ffffff",
          color: "#111827",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "90vh",
          overflow: "hidden",
          borderRadius: "18px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            padding: "24px 24px 0",
            borderBottom: "1px solid #e5e7eb",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "20px",
            }}
          >
            <div>
              <h2 style={{ margin: "0 0 6px", fontSize: "24px" }}>
                Create Client
              </h2>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Step {step} of 3: {stepLabels[step - 1]}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                ...secondaryButtonStyle,
                padding: "8px 12px",
              }}
            >
              Close
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            {stepLabels.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = step === stepNumber;
              const isComplete = step > stepNumber;

              return (
                <div key={label} style={{ minWidth: 0 }}>
                  <div
                    style={{
                      height: "4px",
                      borderRadius: "999px",
                      background: isActive || isComplete ? "#111827" : "#e5e7eb",
                      marginBottom: "8px",
                    }}
                  />
                  <p
                    style={{
                      margin: 0,
                      fontSize: "12px",
                      fontWeight: 600,
                      color: isActive ? "#111827" : "#64748b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div
          style={{
            padding: "24px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {step === 1 && (
            <div
              style={{
                display: "grid",
                gap: "18px",
              }}
            >
              <div>
                <label htmlFor="company-name" style={labelStyle}>
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={form.companyName}
                  onChange={(event) =>
                    handleCompanyNameChange(event.target.value)
                  }
                  placeholder="e.g. Cenomi"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="portal-slug" style={labelStyle}>
                  Portal Slug
                </label>
                <input
                  id="portal-slug"
                  type="text"
                  value={form.slug}
                  onChange={(event) => handleSlugChange(event.target.value)}
                  placeholder="e.g. cenomi"
                  style={inputStyle}
                />
                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#64748b",
                    fontSize: "13px",
                  }}
                >
                  Portal URL: /client/{form.slug || "your-slug"}
                </p>
              </div>

              <div>
                <label htmlFor="client-status" style={labelStyle}>
                  Status
                </label>
                <select
                  id="client-status"
                  value={form.status}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as WizardForm["status"],
                    }))
                  }
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "18px",
                  flexWrap: "wrap",
                }}
              >
                <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                  Select the stores this client can access.
                </p>
                <span
                  style={{
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: "999px",
                    background: "#eff6ff",
                    color: "#1d4ed8",
                    fontSize: "13px",
                    fontWeight: 700,
                  }}
                >
                  {selectedStoreIds.length} store
                  {selectedStoreIds.length === 1 ? "" : "s"} selected
                </span>
              </div>

              {storesLoading ? (
                <p style={{ margin: 0, color: "#64748b" }}>Loading stores...</p>
              ) : storesByCompany.length === 0 ? (
                <p style={{ margin: 0, color: "#64748b" }}>No stores found.</p>
              ) : (
                <div style={{ display: "grid", gap: "18px" }}>
                  {storesByCompany.map(([companyName, companyStores]) => (
                    <div
                      key={companyName}
                      style={{
                        border: "1px solid #e5e7eb",
                        borderRadius: "14px",
                        padding: "16px",
                        background: "#f9fafb",
                      }}
                    >
                      <h3
                        style={{
                          margin: "0 0 12px",
                          fontSize: "16px",
                          color: "#111827",
                        }}
                      >
                        {companyName}
                      </h3>

                      <div style={{ display: "grid", gap: "10px" }}>
                        {companyStores.map((store) => {
                          const checked = selectedStoreIds.includes(store.id);

                          return (
                            <label
                              key={store.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "10px 12px",
                                borderRadius: "10px",
                                background: "#ffffff",
                                border: checked
                                  ? "1px solid #2563eb"
                                  : "1px solid #e5e7eb",
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleStore(store.id)}
                              />
                              <span
                                style={{
                                  fontSize: "14px",
                                  fontWeight: 500,
                                  color: "#111827",
                                }}
                              >
                                {getStoreLabel(store)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                padding: "20px",
                background: "#f9fafb",
                display: "grid",
                gap: "14px",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Company
                </p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  {form.companyName || "—"}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Slug
                </p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  {form.slug || "—"}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Status
                </p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  {form.status === "active" ? "Active" : "Disabled"}
                </p>
              </div>

              <div>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}
                >
                  Number of Stores
                </p>
                <p style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  {selectedStoreIds.length}
                </p>
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            padding: "20px 24px 24px",
            borderTop: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={step === 1 ? onClose : handleBack}
            style={secondaryButtonStyle}
          >
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button type="button" onClick={handleNext} style={buttonStyle}>
              Next
            </button>
          ) : (
            <button type="button" onClick={handleFinish} style={buttonStyle}>
              Finish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
