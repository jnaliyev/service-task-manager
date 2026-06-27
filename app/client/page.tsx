"use client";

import { useState } from "react";


type ClientRequestForm = {
  company: string;
  store: string;
  contactPerson: string;
  phone: string;
  category: string;
  priority: string;
  description: string;
};



export default function ClientPortalPage() {
  const [form, setForm] = useState<ClientRequestForm>({
    company: "",
    store: "",
    contactPerson: "",
    phone: "",
    category: "",
    priority: "Normal",
    description: "",
  });

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  
    if (!form.company || !form.store || !form.description) {
      alert("Please fill Company, Store and Description.");
      return;
    }
  
    const taskPayload = {
      store: form.store,
      company_name: form.company,
      location: "",
      store_id: null,
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
      } catch (error) {
        console.error(error);
        alert("Error while submitting request.");
        return;
      }
  
    alert("Request submitted successfully.");
  
    setForm({
      company: "",
      store: "",
      contactPerson: "",
      phone: "",
      category: "",
      priority: "Normal",
      description: "",
    });
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
            <div>
              <label style={labelStyle}>Company</label>
              <input
                name="company"
                value={form.company}
                onChange={handleChange}
                required
                placeholder="Example: Inditex Azerbaijan"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Store</label>
              <input
                name="store"
                value={form.store}
                onChange={handleChange}
                required
                placeholder="Example: Zara Ganjlik Mall"
                style={inputStyle}
              />
            </div>

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