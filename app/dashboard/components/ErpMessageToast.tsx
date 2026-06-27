"use client";

type ErpMessageToastProps = {
  taskId: number;
  senderName: string;
  preview: string;
  onOpenTask: (taskId: number) => void;
  onDismiss: () => void;
};

export default function ErpMessageToast({
  taskId,
  senderName,
  preview,
  onOpenTask,
  onDismiss,
}: ErpMessageToastProps) {
  return (
    <div
      role="status"
      style={{
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: 1200,
        width: "min(360px, calc(100vw - 32px))",
        background: "#111827",
        color: "white",
        borderRadius: "14px",
        padding: "16px",
        boxShadow: "0 12px 30px rgba(0, 0, 0, 0.25)",
      }}
    >
      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#93c5fd" }}>
        New client message
      </p>
      <p style={{ margin: "0 0 4px", fontWeight: 700 }}>{senderName}</p>
      <p
        style={{
          margin: "0 0 14px",
          fontSize: "14px",
          color: "#e5e7eb",
          lineHeight: 1.4,
        }}
      >
        {preview.trim() || "Photo attachment"}
      </p>
      <div style={{ display: "flex", gap: "8px" }}>
        <button
          type="button"
          onClick={() => onOpenTask(taskId)}
          style={{
            flex: 1,
            padding: "10px 12px",
            borderRadius: "10px",
            border: "none",
            background: "#2563eb",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Open Task
        </button>
        <button
          type="button"
          onClick={onDismiss}
          style={{
            padding: "10px 12px",
            borderRadius: "10px",
            border: "1px solid #374151",
            background: "transparent",
            color: "white",
            cursor: "pointer",
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
