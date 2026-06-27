import { az } from "@/app/client/i18n/az";

type SuccessScreenProps = {
  requestNumber: string;
  onSubmitAnother: () => void;
};

export default function SuccessScreen({
  requestNumber,
  onSubmitAnother,
}: SuccessScreenProps) {
  return (
    <main className="portal-page">
      <section className="portal-card portal-card--success">
        <div style={headerStyle}>
          <div className="portal-success-icon" aria-hidden="true">
            ✓
          </div>

          <p style={eyebrowStyle}>{az.brand}</p>

          <h1 style={titleStyle}>{az.successTitle}</h1>

          <p style={thankYouStyle}>{az.successThankYou}</p>
        </div>

        <div style={requestBoxStyle}>
          <p style={requestLabelStyle}>{az.requestNumber}</p>
          <p className="portal-request-number">{requestNumber}</p>

          <div style={statusRowStyle}>
            <p style={requestLabelStyle}>{az.status}</p>
            <p className="portal-status-badge">{az.statusOpen}</p>
          </div>
        </div>

        <p style={contactStyle}>{az.contactShortly}</p>

        <button
          type="button"
          className="portal-btn-primary"
          style={{ marginTop: "28px" }}
          onClick={onSubmitAnother}
        >
          {az.submitAnother}
        </button>
      </section>
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "10px 0 12px",
  color: "#111827",
  fontSize: "clamp(1.5rem, 4.5vw, 1.875rem)",
  lineHeight: 1.2,
  letterSpacing: "-0.02em",
};

const thankYouStyle: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: "15px",
  lineHeight: 1.55,
  maxWidth: "360px",
  marginInline: "auto",
};

const requestBoxStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "22px",
  padding: "28px 24px",
  textAlign: "center",
};

const requestLabelStyle: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const statusRowStyle: React.CSSProperties = {
  marginTop: "24px",
  paddingTop: "24px",
  borderTop: "1px solid #e5e7eb",
};

const contactStyle: React.CSSProperties = {
  margin: "24px 0 0",
  color: "#6b7280",
  fontSize: "15px",
  lineHeight: 1.55,
  textAlign: "center",
};
