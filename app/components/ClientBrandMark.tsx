"use client";

import { useState } from "react";
import {
  getClientInitials,
  normalizeLogoUrl,
} from "@/lib/clientBranding/getClientInitials";

type ClientBrandMarkProps = {
  name: string;
  logoUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: 36,
  md: 56,
  lg: 72,
} as const;

export default function ClientBrandMark({
  name,
  logoUrl,
  size = "md",
}: ClientBrandMarkProps) {
  const dimension = sizeMap[size];
  const normalizedLogoUrl = normalizeLogoUrl(logoUrl);
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = Boolean(normalizedLogoUrl) && !logoFailed;
  const initials = getClientInitials(name);

  return (
    <div
      aria-label={name}
      style={{
        width: dimension,
        height: dimension,
        borderRadius: "999px",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: showLogo ? "#ffffff" : "#111827",
        color: "#ffffff",
        fontWeight: 700,
        fontSize: size === "sm" ? "13px" : size === "lg" ? "22px" : "18px",
        border: "1px solid #e5e7eb",
        flexShrink: 0,
      }}
    >
      {showLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={normalizedLogoUrl!}
          alt={`${name} logo`}
          onError={() => setLogoFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "#ffffff",
          }}
        />
      ) : (
        initials
      )}
    </div>
  );
}
