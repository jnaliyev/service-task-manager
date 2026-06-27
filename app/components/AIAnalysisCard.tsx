type AIAnalysisCardProps = {
  ai_category?: string | null;
  ai_department?: string | null;
  ai_priority?: string | null;
  ai_summary?: string | null;
  ai_confidence?: number | null;
  client_description?: string | null;
  embedded?: boolean;
};

function getConfidenceBadgeStyle(confidence: number): React.CSSProperties {
  if (confidence >= 90) {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  if (confidence >= 70) {
    return {
      background: "#ffedd5",
      color: "#c2410c",
    };
  }

  return {
    background: "#fee2e2",
    color: "#b91c1c",
  };
}

export default function AIAnalysisCard({
  ai_category,
  ai_department,
  ai_priority,
  ai_summary,
  ai_confidence,
  client_description,
  embedded = false,
}: AIAnalysisCardProps) {
  if (!ai_summary?.trim()) return null;

  const numericConfidence = Number(ai_confidence);
  const displayConfidence = Number.isFinite(numericConfidence)
    ? Math.min(100, Math.max(0, Math.round(numericConfidence)))
    : 0;

  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #bfdbfe",
        borderRadius: "14px",
        padding: "20px",
        marginBottom: embedded ? 0 : "20px",
        boxShadow: "0 4px 14px rgba(37, 99, 235, 0.08)",
      }}
    >
      {!embedded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "16px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🤖
          </div>
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "#111827",
              letterSpacing: "-0.01em",
            }}
          >
            AI Analysis
          </h3>
        </div>
      )}

      {client_description?.trim() && (
        <div style={{ marginBottom: "16px" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "12px",
              fontWeight: 700,
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Original Client Description
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              lineHeight: 1.6,
              color: "#374151",
            }}
          >
            {client_description}
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "16px",
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
            Category
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {ai_category || "—"}
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
            Department
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {ai_department || "—"}
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
            Priority
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "15px",
              fontWeight: 600,
              color: "#111827",
            }}
          >
            {ai_priority || "—"}
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
            Confidence
          </p>
          <span
            style={{
              display: "inline-block",
              padding: "6px 12px",
              borderRadius: "999px",
              fontSize: "13px",
              fontWeight: 800,
              ...getConfidenceBadgeStyle(displayConfidence),
            }}
          >
            {displayConfidence}%
          </span>
        </div>
      </div>

      <div>
        <p
          style={{
            margin: "0 0 8px",
            fontSize: "12px",
            fontWeight: 700,
            color: "#6b7280",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          AI Summary (Azerbaijani)
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "15px",
            lineHeight: 1.6,
            color: "#374151",
          }}
        >
          {ai_summary}
        </p>
      </div>
    </div>
  );
}
