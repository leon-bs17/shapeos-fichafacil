import React from "react";

/**
 * shapeOS logo — matches the brand asset:
 *  - Chrome metallic dumbbells (two plates each side)
 *  - Central power button ring with vertical bar (Aqua Digital #00D2D2)
 *  - Wordmark "shape" white + "OS" aqua + tagline "ficha fácil"
 */
export const Logo = ({ size = "md", showTagline = true, stacked = false }) => {
  const dim = size === "xl" ? 120 : size === "lg" ? 68 : size === "sm" ? 36 : 48;

  const mark = (
    <svg
      viewBox="0 0 128 128"
      width={dim}
      height={dim}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        {/* Chrome gradient for dumbbells */}
        <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a8f96" />
          <stop offset="45%" stopColor="#d7dbe0" />
          <stop offset="55%" stopColor="#5b6067" />
          <stop offset="100%" stopColor="#20232a" />
        </linearGradient>
        <linearGradient id="chromeBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#9aa0a8" />
          <stop offset="50%" stopColor="#e2e6eb" />
          <stop offset="100%" stopColor="#3c4048" />
        </linearGradient>
        {/* Aqua glow */}
        <radialGradient id="aquaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7ffbfb" stopOpacity="1" />
          <stop offset="55%" stopColor="#00D2D2" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#003a3a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a9b0b8" />
          <stop offset="50%" stopColor="#3f434b" />
          <stop offset="100%" stopColor="#8f959d" />
        </linearGradient>
        <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="1.2" />
        </filter>
      </defs>

      {/* LEFT dumbbell */}
      <rect x="4" y="52" width="8" height="24" rx="2" fill="url(#chrome)" />
      <rect x="14" y="46" width="10" height="36" rx="2.5" fill="url(#chrome)" />
      <rect x="26" y="58" width="18" height="12" rx="2" fill="url(#chromeBar)" />

      {/* RIGHT dumbbell */}
      <rect x="116" y="52" width="8" height="24" rx="2" fill="url(#chrome)" />
      <rect x="104" y="46" width="10" height="36" rx="2.5" fill="url(#chrome)" />
      <rect x="84" y="58" width="18" height="12" rx="2" fill="url(#chromeBar)" />

      {/* Center bezel ring (metal) */}
      <circle cx="64" cy="64" r="30" fill="#1a1a1a" stroke="url(#ringGrad)" strokeWidth="3.5" />
      <circle cx="64" cy="64" r="26" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

      {/* Inner aqua glow */}
      <circle cx="64" cy="64" r="22" fill="url(#aquaGlow)" opacity="0.9" filter="url(#soft)" />
      <circle cx="64" cy="64" r="19" fill="none" stroke="#00D2D2" strokeWidth="2" opacity="0.85" />

      {/* Power symbol: open arc + vertical bar */}
      <path
        d="M 52 60 A 14 14 0 1 0 76 60"
        fill="none"
        stroke="#00F2F2"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <rect x="61.5" y="49" width="5" height="14" rx="2.5" fill="#00F2F2" />

      {/* Specular highlights */}
      <ellipse cx="60" cy="53" rx="10" ry="3" fill="rgba(255,255,255,0.18)" />
    </svg>
  );

  const wordmark = (
    <div className="leading-none">
      <div
        className="text-[#F5F5F5] tracking-tight"
        style={{
          fontFamily: "'Unbounded', sans-serif",
          fontWeight: 700,
          fontSize: size === "xl" ? "2.4rem" : size === "lg" ? "1.9rem" : size === "sm" ? "1.05rem" : "1.4rem",
          letterSpacing: "-0.02em",
        }}
      >
        shape<span className="text-[#00D2D2]" style={{ textShadow: "0 0 18px rgba(0,210,210,0.55)" }}>OS</span>
      </div>
      {showTagline && (
        <div
          className="text-zinc-400 mt-1.5"
          style={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 300,
            fontSize: size === "xl" ? "0.95rem" : size === "lg" ? "0.8rem" : "0.65rem",
            letterSpacing: "0.22em",
            textTransform: "lowercase",
          }}
        >
          ficha fácil
        </div>
      )}
    </div>
  );

  if (stacked) {
    return (
      <div className="flex flex-col items-center gap-3 select-none" data-testid="brand-logo">
        {mark}
        {wordmark}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 select-none" data-testid="brand-logo">
      {mark}
      {wordmark}
    </div>
  );
};

export default Logo;
