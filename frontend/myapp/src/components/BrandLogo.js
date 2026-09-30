// ============================================================
//  BrandLogo.js — AdvocatesHub mark + optional wordmark.
//  The mark lives at public/brand/logo-mark.svg (also used for the
//  favicon / PWA icons), so every surface shares one asset.
// ============================================================

import React, { useState, useEffect } from "react";
import { getTheme } from "../data/themeStore";

const MARK = `${process.env.PUBLIC_URL || ""}/brand/logo-mark.svg`;

export default function BrandLogo({ size = 32, wordmark = true, dark, style }) {
  const [activeTheme, setActiveTheme] = useState(() => {
    if (typeof dark === "boolean") return dark ? "dark" : "light";
    return getTheme();
  });

  useEffect(() => {
    if (typeof dark === "boolean") {
      setActiveTheme(dark ? "dark" : "light");
      return;
    }
    const handleTheme = (e) => {
      setActiveTheme(e?.detail || getTheme());
    };
    window.addEventListener("law4u_theme_change", handleTheme);
    return () => window.removeEventListener("law4u_theme_change", handleTheme);
  }, [dark]);

  const isDark = typeof dark === "boolean" ? dark : activeTheme === "dark";

  return (
    <span className="brand-logo-wrap" style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * 0.3), ...style }}>
      <img src={MARK} width={size} height={size} alt={wordmark ? "" : "AdvocatesHub"} style={{ display: "block", borderRadius: size * 0.25 }} />
      {wordmark && (
        <span
          className="brand-logo-wordmark"
          style={{
            fontWeight: 800,
            fontSize: Math.round(size * 0.62),
            letterSpacing: "-0.01em",
            color: isDark ? "#ffffff" : "#0f172a",
            whiteSpace: "nowrap",
            transition: "color 0.2s ease"
          }}
        >
          Advocates<span className="brand-logo-hub" style={{ color: isDark ? "#5eead4" : "#0f766e", transition: "color 0.2s ease" }}>Hub</span>
        </span>
      )}
    </span>
  );
}
