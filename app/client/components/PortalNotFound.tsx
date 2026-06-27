type PortalNotFoundProps = {
  message?: string;
};

export default function PortalNotFound({
  message = "Portal not found",
}: PortalNotFoundProps) {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#ffffff",
          borderRadius: "22px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
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

        <p
          style={{
            margin: "0 0 8px",
            color: "#6b7280",
            fontSize: "14px",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Retail Systems
        </p>

        <h1
          style={{
            margin: 0,
            color: "#111827",
            fontSize: "30px",
            lineHeight: 1.2,
          }}
        >
          {message}
        </h1>
      </section>
    </main>
  );
}
