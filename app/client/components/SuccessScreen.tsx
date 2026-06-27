type SuccessScreenProps = {
  requestNumber: string;
  onSubmitAnother: () => void;
};

export default function SuccessScreen({
  requestNumber,
  onSubmitAnother,
}: SuccessScreenProps) {
  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <div style={headerStyle}>
          <div style={successIconStyle}>✓</div>

          <p style={eyebrowStyle}>Retail Systems</p>

          <h1 style={titleStyle}>Request Submitted Successfully</h1>

          <p style={subtitleStyle}>
            Our maintenance team has received your request.
          </p>
        </div>

        <div style={requestBoxStyle}>
          <p style={requestLabelStyle}>Request Number</p>
          <p style={requestNumberStyle}>{requestNumber}</p>

          <p style={requestLabelStyle}>Status</p>
          <p style={statusStyle}>OPEN</p>
        </div>

        <p style={{ ...subtitleStyle, textAlign: "center", marginTop: "22px" }}>
          You will be contacted shortly.
        </p>

        <button
          type="button"
          style={{ ...buttonStyle, marginTop: "24px" }}
          onClick={onSubmitAnother}
        >
          Submit Another Request
        </button>
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

const successIconStyle: React.CSSProperties = {
  width: "64px",
  height: "64px",
  borderRadius: "50%",
  background: "#16a34a",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "34px",
  fontWeight: 800,
  margin: "0 auto 18px",
};

const requestBoxStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "24px",
  textAlign: "center",
};

const requestLabelStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const requestNumberStyle: React.CSSProperties = {
  margin: "0 0 22px",
  color: "#111827",
  fontSize: "30px",
  fontWeight: 800,
  letterSpacing: "0.04em",
};

const statusStyle: React.CSSProperties = {
  display: "inline-block",
  margin: 0,
  background: "#fef3c7",
  color: "#92400e",
  padding: "8px 14px",
  borderRadius: "999px",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.06em",
};
