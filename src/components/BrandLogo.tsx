import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

const SIZES = {
  sm: { icon: 18, fontSize: "0.85rem", gap: "6px" },
  md: { icon: 24, fontSize: "1.05rem", gap: "8px" },
  lg: { icon: 32, fontSize: "1.35rem", gap: "10px" },
  xl: { icon: 44, fontSize: "1.75rem", gap: "14px" },
};

/**
 * The Prism Nexus — Official NextGen Anime Brand Mark.
 * A precision-faceted geometric 'N' with kinetic angular cuts and specular lighting.
 */
export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="nexus-left" x1="4" y1="5" x2="13" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff4d6d" />
          <stop offset="100%" stopColor="#c2183d" />
        </linearGradient>
        <linearGradient id="nexus-cross" x1="13" y1="5" x2="23" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff2a55" />
          <stop offset="100%" stopColor="#8a0e28" />
        </linearGradient>
        <linearGradient id="nexus-right" x1="23" y1="7" x2="32" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ff6b8b" />
          <stop offset="100%" stopColor="#e61b45" />
        </linearGradient>
        <linearGradient id="nexus-sheen" x1="4" y1="5" x2="32" y2="31" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Left forward prism blade */}
      <path
        d="M5 29L5 10.5L13.5 5L13.5 23.5L5 29Z"
        fill="url(#nexus-left)"
      />

      {/* Central kinetic bridge */}
      <path
        d="M13.5 5L22.5 22.5L22.5 31L13.5 13.5L13.5 5Z"
        fill="url(#nexus-cross)"
      />

      {/* Right upward prism blade */}
      <path
        d="M22.5 12.5L31 7L31 25.5L22.5 31L22.5 12.5Z"
        fill="url(#nexus-right)"
      />

      {/* Precision kinetic light sheen */}
      <path
        d="M5 10.5L13.5 5L22.5 22.5L31 7"
        stroke="url(#nexus-sheen)"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Lower specular edge */}
      <path
        d="M5 29L13.5 23.5L22.5 31L31 25.5"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function BrandLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: BrandLogoProps) {
  const config = SIZES[size];

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: config.gap,
        textDecoration: "none",
        userSelect: "none",
      }}
    >
      <BrandMark size={config.icon} />
      {showWordmark && (
        <span
          style={{
            fontFamily: "var(--font-family, inherit)",
            fontSize: config.fontSize,
            fontWeight: 800,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            display: "inline-flex",
            alignItems: "center",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "#f8fafc" }}>Next</span>
          <span style={{ color: "var(--primary, #ff2a55)" }}>Gen</span>
          <span
            style={{
              marginLeft: "4px",
              paddingLeft: "6px",
              borderLeft: "1px solid rgba(255, 255, 255, 0.2)",
              color: "var(--text-secondary, #94a3b8)",
              fontSize: "0.8em",
              fontWeight: 600,
              letterSpacing: "0.08em",
            }}
          >
            Anime
          </span>
        </span>
      )}
    </div>
  );
}
