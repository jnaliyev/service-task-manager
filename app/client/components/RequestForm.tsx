"use client";

import { useMemo, useState } from "react";
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

type RequestFormProps = {
  stores: Store[];
  onSuccess: (requestNumber: string) => void;
};

export default function RequestForm({ stores, onSuccess }: RequestFormProps) {
  const [form, setForm] = useState<ClientRequestForm>(initialFormState);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);

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
    if (!form.company) return [];

    return stores
      .filter((store) => store.company_name === form.company)
      .filter((store) => (store.store_name || "").trim() !== "")
      .sort((a, b) =>
        (a.store_name || "").localeCompare(b.store_name || "", undefined, {
          sensitivity: "base",
        })
      );
  }, [stores, form.company]);

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

    if (!form.company || !form.store || !form.description) {
      alert("Please fill Company, Store and Description.");
      return;
    }

    const selectedStore = stores.find(
      (store) =>
        store.company_name === form.company && store.store_name === form.store
    );

    const taskPayload = {
      store: form.store,
      company_name: form.company,
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
      onSuccess(
        `RS-${new Date().getFullYear()}-${String(result.task.id).padStart(6, "0")}`
      );

      setForm(initialFormState);
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
            Submit a maintenance request and our team will review it shortly.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={formStyle}>
          <div style={gridStyle}>
            <CompanySelect
              companies={companies}
              value={form.company}
              onChange={handleChange}
            />

            <StoreSelect
              filteredStores={filteredStores}
              company={form.company}
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
