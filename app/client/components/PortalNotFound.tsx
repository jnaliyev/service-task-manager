import { az } from "@/app/client/i18n/az";

type PortalNotFoundProps = {
  message?: string;
};

export default function PortalNotFound({
  message = az.portalNotFound,
}: PortalNotFoundProps) {
  return (
    <main className="portal-page">
      <section className="portal-card" style={{ textAlign: "center" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "18px",
            background: "#fee2e2",
            color: "#b91c1c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 800,
            fontSize: "22px",
            margin: "0 auto 16px",
          }}
        >
          !
        </div>

        <p style={eyebrowStyle}>{az.brand}</p>

        <h1 style={titleStyle}>{message}</h1>
      </section>
    </main>
  );
}

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 8px",
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "clamp(1.5rem, 4.5vw, 1.875rem)",
  lineHeight: 1.2,
};
