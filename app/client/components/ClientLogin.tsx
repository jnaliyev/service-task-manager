"use client";

import { useState } from "react";
import { az } from "@/app/client/i18n/az";
import ClientBrandMark from "@/app/components/ClientBrandMark";
import type { ClientPortalSession } from "@/lib/clientPortals/clientSession";

type ClientLoginProps = {
  slug: string;
  companyName: string;
  logoUrl?: string | null;
  onSuccess: (session: ClientPortalSession) => void;
};

export default function ClientLogin({
  slug,
  companyName,
  logoUrl = null,
  onSuccess,
}: ClientLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      const response = await fetch(`/api/client-portals/${slug}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
        }),
      });

      const data = (await response.json()) as {
        session?: ClientPortalSession;
        error?: string;
      };

      if (!response.ok || !data.session) {
        setError(data.error || az.loginError);
        return;
      }

      onSuccess(data.session);
    } catch (loginError) {
      console.error(loginError);
      setError(az.loginError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="portal-page">
      <section className="portal-card">
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginBottom: "20px",
            }}
          >
            <ClientBrandMark
              name={companyName}
              logoUrl={logoUrl}
              size="lg"
            />
            <p style={clientNameStyle}>{companyName}</p>
          </div>
          <p style={eyebrowStyle}>{az.brand}</p>
          <h1 style={titleStyle}>{az.loginTitle}</h1>
        </div>

        <form onSubmit={(event) => void handleSubmit(event)} style={formStyle}>
          <label style={labelStyle}>
            {az.loginUsername}
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
              disabled={busy}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            {az.loginPassword}
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
              disabled={busy}
              style={inputStyle}
            />
          </label>

          {error && <p style={errorStyle}>{error}</p>}

          <button
            type="submit"
            className="portal-btn-primary"
            disabled={busy || !username.trim() || !password.trim()}
          >
            {busy ? az.loginSubmitting : az.loginSubmit}
          </button>
        </form>
      </section>
    </main>
  );
}

const clientNameStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.3,
};

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "clamp(1.5rem, 4vw, 1.875rem)",
  lineHeight: 1.15,
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "8px",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "15px",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  margin: 0,
  color: "#b91c1c",
  fontSize: "14px",
};
