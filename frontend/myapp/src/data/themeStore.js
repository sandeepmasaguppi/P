// themeStore.js — Centralized Black & White Theme Manager for Advocates Hub
export const THEME_KEY = "law4u_theme";
export const CLIENT_THEME_KEY = "law4u_client_theme";

export function getTheme() {
  if (typeof window === "undefined") return "light";
  return (
    localStorage.getItem(THEME_KEY) ||
    localStorage.getItem(CLIENT_THEME_KEY) ||
    "light"
  );
}

export function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark";
  document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  
  if (document.body) {
    if (isDark) {
      document.body.classList.add("theme-dark");
      document.body.classList.remove("theme-light");
    } else {
      document.body.classList.add("theme-light");
      document.body.classList.remove("theme-dark");
    }
  }
}

export function setTheme(theme) {
  const safeTheme = theme === "dark" ? "dark" : "light";
  try {
    localStorage.setItem(THEME_KEY, safeTheme);
    localStorage.setItem(CLIENT_THEME_KEY, safeTheme);
  } catch (e) {
    // Ignore private mode storage errors
  }
  applyTheme(safeTheme);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("law4u_theme_change", { detail: safeTheme }));
  }
  return safeTheme;
}

export function toggleTheme() {
  const current = getTheme();
  const next = current === "dark" ? "light" : "dark";
  return setTheme(next);
}

export function initTheme() {
  const initial = getTheme();
  applyTheme(initial);

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === THEME_KEY || e.key === CLIENT_THEME_KEY) {
        if (e.newValue) {
          applyTheme(e.newValue);
          window.dispatchEvent(new CustomEvent("law4u_theme_change", { detail: e.newValue }));
        }
      }
    });
  }
  return initial;
}
