"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientPortalConfig } from "@/app/client/types/portal";
import CompanySelect from "./CompanySelect";
import StoreSelect from "./StoreSelect";

export type Store = {
  id: number;
  company_name: string | null;
  store_name: string | null;
  location: string | null;
  store_code: string | null;
};

type ClientRequestForm = {
  company: string;
  store: string;
  contactPerson: string;
  phone: string;
  category: string;
  priority: string;
  description: string;
};

const initialFormState: ClientRequestForm = {
  company: "",
  store: "",
  contactPerson: "",
  phone: "",
  category: "",
  priority: "Normal",
  description: "",
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENTS_BUCKET = "client-attachments";

async function uploadSelectedPhotos(files: File[]): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (const file of files) {
    const filePath = `client-requests/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
  }

  return uploadedUrls;
}

function runBackgroundAiAnalysis({
  taskId,
  issue,
  category,
  priority,
  attachments,
}: {
  taskId: number;
  issue: string;
  category: string;
  priority: string;
  attachments: string[];
}) {
  void (async () => {
    try {
      const analyzeResponse = await fetch("/api/ai/analyze-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue,
          category,
          priority,
          attachments,
        }),
      });

      if (!analyzeResponse.ok) {
        console.error(
          "Background AI analysis failed:",
          await analyzeResponse.text()
        );
        return;
      }

      const aiResult = await analyzeResponse.json();

      const updateResponse = await fetch("/api/tasks/update-ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task_id: taskId,
          ai_category: aiResult.ai_category,
          ai_priority: aiResult.ai_priority,
          ai_summary: aiResult.ai_summary,
          ai_confidence: aiResult.ai_confidence,
        }),
      });

      if (!updateResponse.ok) {
        console.error(
          "Background AI save failed:",
          await updateResponse.text()
        );
      }
    } catch (error) {
      console.error("Background AI analysis error:", error);
    }
  })();
}

type RequestFormProps = {
  stores: Store[];
  onSuccess: (requestNumber: string) => void;
  portalConfig?: ClientPortalConfig | null;
};

function createInitialFormState(portalConfig?: ClientPortalConfig | null): ClientRequestForm {
  if (portalConfig) {
    return {
      ...initialFormState,
      company: portalConfig.companyName,
    };
  }

  return initialFormState;
}

export default function RequestForm({
  stores,
  onSuccess,
  portalConfig = null,
}: RequestFormProps) {
  const isPortalMode = Boolean(portalConfig);
  const [form, setForm] = useState<ClientRequestForm>(() =>
    createInitialFormState(portalConfig)
  );
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

  useEffect(() => {
    if (!portalConfig) return;

    setForm(createInitialFormState(portalConfig));
  }, [portalConfig]);

  const companies = useMemo(() => {
    const uniqueCompanies = new Set<string>();

    stores.forEach((store) => {
      const companyName = (store.company_name || "").trim();

      if (companyName) {
        uniqueCompanies.add(companyName);
      }
    });

    return Array.from(uniqueCompanies).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [stores]);

  const filteredStores = useMemo(() => {
    const companyName = portalConfig?.companyName || form.company;

    if (!companyName) return [];

    return stores
      .filter((store) => store.company_name === companyName)
      .filter((store) => (store.store_name || "").trim() !== "")
      .sort((a, b) =>
        (a.store_name || "").localeCompare(b.store_name || "", undefined, {
          sensitivity: "base",
        })
      );
  }, [stores, form.company, portalConfig?.companyName]);

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "company" ? { store: "" } : {}),
    }));
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const incomingFiles = Array.from(files);
    const validFiles = incomingFiles.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type)
    );

    if (validFiles.length < incomingFiles.length) {
      alert("Only JPEG, PNG, and WebP images are allowed.");
    }

    setSelectedPhotos(validFiles);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const companyName = portalConfig?.companyName || form.company;
    const storeName = form.store;

    if (!companyName || !storeName || !form.description) {
      alert(
        isPortalMode
          ? "Please fill Store and Description."
          : "Please fill Company, Store and Description."
      );
      return;
    }

    const selectedStore = stores.find(
      (store) =>
        store.company_name === companyName && store.store_name === storeName
    );

    let attachments: string[] = [];

    if (selectedPhotos.length > 0) {
      try {
        attachments = await uploadSelectedPhotos(selectedPhotos);
      } catch (error) {
        console.error("Photo upload error:", error);
        alert("Failed to upload photos. Please try again.");
        return;
      }
    }

    const taskPayload = {
      store: storeName,
      company_name: companyName,
      location: selectedStore?.location || "",
      store_id: selectedStore?.id || null,
      issue: form.description,
      status: "Open",
      category: form.category,
      department: form.category,
      priority: form.priority,
      due_date: null,
      employee_id: null,
      technician: "",
      created_by: `Client Portal - ${form.contactPerson} - ${form.phone}`,
      attachments,
    };

    try {
      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const result = await response.json();

      console.log(result);
      runBackgroundAiAnalysis({
        taskId: result.task.id,
        issue: form.description,
        category: form.category,
        priority: form.priority,
        attachments,
      });
      onSuccess(
        `RS-${new Date().getFullYear()}-${String(result.task.id).padStart(6, "0")}`
      );

      setForm(createInitialFormState(portalConfig));
      setSelectedPhotos([]);
    } catch (error) {
      console.error(error);
      alert("Error while submitting request.");
      return;
    }

    alert("Request submitted successfully.");
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStyle}>
          <div style={logoStyle}>RS</div>

          <p style={eyebrowStyle}>Retail Systems</p>

          <h1 style={titleStyle}>Maintenance Portal</h1>

          <p style={subtitleStyle}>
            {isPortalMode
              ? `Submit a maintenance request for ${portalConfig?.companyName}.`
              : "Submit a maintenance request and our team will review it shortly."}
          </p>
        </div>

        {isPortalMode && (
          <div
            style={{
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              borderRadius: "14px",
              padding: "16px",
              marginBottom: "18px",
            }}
          >
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
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                fontWeight: 600,
                color: "#111827",
              }}
            >
              {portalConfig?.companyName}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={gridStyle}>
            {!isPortalMode && (
              <CompanySelect
                companies={companies}
                value={form.company}
                onChange={handleChange}
              />
            )}

            <StoreSelect
              filteredStores={filteredStores}
              company={portalConfig?.companyName || form.company}
              value={form.store}
              onChange={handleChange}
            />

            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                name="contactPerson"
                value={form.contactPerson}
                onChange={handleChange}
                required
                placeholder="Store manager name"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Phone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                placeholder="+994..."
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Category</label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="">Select category</option>
                <option value="Construction">Construction</option>
                <option value="Electrical">Electrical</option>
                <option value="HVAC">HVAC</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Furniture">Furniture</option>
                <option value="Low Current Systems">
                  Low Current Systems
                </option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Priority</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                required
                style={inputStyle}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              placeholder="Please describe the issue..."
              style={textareaStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Photos</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoChange}
              style={fileInputStyle}
            />
            <p style={fileHintStyle}>JPEG, PNG, or WebP. You can select multiple files.</p>
            {selectedPhotos.length > 0 && (
              <ul style={fileListStyle}>
                {selectedPhotos.map((file, index) => (
                  <li key={`${file.name}-${index}`} style={fileListItemStyle}>
                    {file.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="submit" style={buttonStyle}>
            Submit Request
          </button>
        </form>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#f3f4f6",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 16px",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "760px",
  background: "#ffffff",
  borderRadius: "22px",
  padding: "32px",
  boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
};

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "28px",
};

const logoStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "16px",
  background: "#111827",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: "18px",
  margin: "0 auto 14px",
  letterSpacing: "0.5px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 10px",
  color: "#111827",
  fontSize: "34px",
  lineHeight: 1.1,
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "16px",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "18px",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "46px",
  padding: "0 13px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "120px",
  padding: "13px",
  resize: "vertical",
  lineHeight: 1.5,
};

const buttonStyle: React.CSSProperties = {
  width: "100%",
  height: "52px",
  border: "none",
  borderRadius: "14px",
  background: "#111827",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: 700,
  cursor: "pointer",
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  padding: "11px 13px",
  cursor: "pointer",
};

const fileHintStyle: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#6b7280",
  fontSize: "13px",
};

const fileListStyle: React.CSSProperties = {
  margin: "12px 0 0",
  padding: "12px 14px",
  listStyle: "none",
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "12px",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const fileListItemStyle: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.4,
  wordBreak: "break-all",
};
