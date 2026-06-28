"use client";

import { useState } from "react";

type KpiAccent = "blue" | "red" | "orange" | "green" | "purple";

const kpiAccentStyles: Record<
  KpiAccent,
  { iconBg: string; iconColor: string; valueColor: string }
> = {
  blue: { iconBg: "#dbeafe", iconColor: "#1d4ed8", valueColor: "#111827" },
  red: { iconBg: "#fecaca", iconColor: "#b91c1c", valueColor: "#991b1b" },
  orange: { iconBg: "#ffedd5", iconColor: "#c2410c", valueColor: "#9a3412" },
  green: { iconBg: "#dcfce7", iconColor: "#15803d", valueColor: "#111827" },
  purple: { iconBg: "#ede9fe", iconColor: "#6d28d9", valueColor: "#111827" },
};

export default function DashboardKpiCard({
  icon,
  title,
  value,
  helperText,
  accent,
  active = false,
  warning = false,
  onClick,
}: {
  icon: string;
  title: string;
  value: number | string;
  helperText: string;
  accent: KpiAccent;
  active?: boolean;
  warning?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accentStyle = kpiAccentStyles[accent];
  const isClickable = Boolean(onClick);

  const borderColor = active
    ? "2px solid #2563eb"
    : warning && !hovered
      ? "2px solid #dc2626"
      : hovered
        ? "1px solid #cbd5e1"
        : "1px solid #e5e7eb";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        isClickable
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: warning ? "#fee2e2" : "white",
        color: "#111827",
        padding: "18px",
        borderRadius: "16px",
        boxShadow: hovered
          ? "0 10px 24px rgba(15, 23, 42, 0.1)"
          : "0 2px 10px rgba(0,0,0,0.06)",
        border: borderColor,
        cursor: isClickable ? "pointer" : "default",
        transform: hovered && isClickable ? "translateY(-3px)" : "translateY(0)",
        transition:
          "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: "148px",
      }}
    >
      <div
        style={{
          width: "44px",
          height: "44px",
          borderRadius: "12px",
          background: accentStyle.iconBg,
          color: accentStyle.iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "22px",
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {icon}
      </div>

      <div>
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 600,
            color: "#64748b",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: "6px 0 0",
            fontSize: "32px",
            fontWeight: 700,
            lineHeight: 1.1,
            color: accentStyle.valueColor,
          }}
        >
          {value}
        </p>
        <p
          style={{
            margin: "8px 0 0",
            fontSize: "12px",
            color: warning ? "#991b1b" : "#94a3b8",
            lineHeight: 1.4,
          }}
        >
          {helperText}
        </p>
      </div>
    </div>
  );
}
