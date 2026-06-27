"use client";

import { useState } from "react";

type AnalyzeTaskResponse = {
  ai_category: string;
  ai_priority: string;
  ai_summary: string;
  ai_confidence: number;
};

export default function AiTestPage() {
  const [issue, setIssue] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [result, setResult] = useState<AnalyzeTaskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAnalyze() {
    const trimmedIssue = issue.trim();

    if (!trimmedIssue) {
      setError("Please enter an issue description.");
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/ai/analyze-task", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue: trimmedIssue,
          attachments: imageUrl ? [imageUrl] : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze task");
      }

      setResult(data as AnalyzeTaskResponse);
    } catch (analyzeError) {
      console.error(analyzeError);
      setError(
        analyzeError instanceof Error
          ? analyzeError.message
          : "Failed to analyze task"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "40px 16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "28px",
          boxShadow: "0 10px 30px rgba(15, 23, 42, 0.08)",
        }}
      >
        <h1 style={{ margin: "0 0 8px", fontSize: "28px", color: "#111827" }}>
          AI Task Analysis Test
        </h1>
        <p style={{ margin: "0 0 24px", color: "#6b7280" }}>
          Temporary page for testing `/api/ai/analyze-task`.
        </p>

        <label
          htmlFor="issue"
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Issue description
        </label>
        <textarea
          id="issue"
          value={issue}
          onChange={(event) => setIssue(event.target.value)}
          placeholder="Describe the maintenance issue..."
          rows={8}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #d1d5db",
            fontSize: "15px",
            lineHeight: 1.5,
            resize: "vertical",
            marginBottom: "16px",
          }}
        />

        <label
          htmlFor="imageUrl"
          style={{
            display: "block",
            marginBottom: "8px",
            fontWeight: 600,
            color: "#374151",
          }}
        >
          Image URL
        </label>
        <input
          id="imageUrl"
          type="url"
          value={imageUrl}
          onChange={(event) => setImageUrl(event.target.value)}
          placeholder="https://..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "14px",
            borderRadius: "12px",
            border: "1px solid #d1d5db",
            fontSize: "15px",
            marginBottom: "16px",
          }}
        />

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          style={{
            background: loading ? "#6b7280" : "#111827",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "12px 20px",
            fontSize: "15px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Analyzing..." : "Analyze"}
        </button>

        {error && (
          <div
            style={{
              marginTop: "24px",
              padding: "14px 16px",
              borderRadius: "12px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
            }}
          >
            {error}
          </div>
        )}

        {result && (
          <div style={{ marginTop: "24px" }}>
            <h2
              style={{
                margin: "0 0 12px",
                fontSize: "18px",
                color: "#111827",
              }}
            >
              Response
            </h2>
            <pre
              style={{
                margin: 0,
                padding: "16px",
                borderRadius: "12px",
                background: "#111827",
                color: "#f9fafb",
                overflowX: "auto",
                fontSize: "14px",
                lineHeight: 1.6,
              }}
            >
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </main>
  );
}
