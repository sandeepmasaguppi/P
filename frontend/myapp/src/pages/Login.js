// ============================================================
//  Login.js  —  Law4u Advocate Login Page
//  Matches the UI styling, gradients, and dark mode of /admin
// ============================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginAdvocate } from "../data/Advocatesstore";
import BrandLogo from "../components/BrandLogo";
import "./Login.css";

const SESSION_KEY = "law4u_advocate_id";
const THEME_KEY = "law4u_advocate_theme";

function ThemeToggle({ theme, onToggle }) {
  const dark = theme === "dark";
  return (
    <button
      type="button"
      className="am-theme-btn"
      onClick={onToggle}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      )}
    </button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(null);

  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === "dark" || saved === "light") return saved;
    } catch {}
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    try { localStorage.setItem(THEME_KEY, theme); } catch {}
  }, [theme]);

  const toggleTheme = useCallback(() => setTheme(t => (t === "dark" ? "light" : "dark")), []);

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: true,
  });

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const em = form.email.trim();
    const pw = form.password;

    if (!em || !pw) {
      setErr("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setErr("");

    try {
      const match = await loginAdvocate(em, pw, form.remember);

      if (form.remember) {
        localStorage.setItem(SESSION_KEY, String(match.id));
      } else {
        sessionStorage.setItem(SESSION_KEY, String(match.id));
      }

      showToast(`Welcome back, ${match.name.replace(/^Adv\.\s*/i, "")}! 🎉`, "success");
      setLoading(false);
      setTimeout(() => navigate("/advocate-dashboard"), 600);
    } catch (error) {
      setLoading(false);
      if (error.status === 401) {
        setErr("Incorrect email or password.");
      } else {
        setErr(error.message || "Login failed. Please check your credentials.");
      }
    }
  };

  return (
    <div className={`am-login-page ${theme === "dark" ? "am-dark" : ""}`}>
      <ThemeToggle theme={theme} onToggle={toggleTheme} />

      {toast && (
        <div
          className="am-toast"
          style={{
            background: toast.type === "success" ? "#0f766e" : "#b91c1c",
            color: "#ffffff",
          }}
        >
          {toast.msg}
        </div>
      )}

      <form className="am-login-card" onSubmit={handleSubmit} noValidate>
        <BrandLogo size={56} wordmark={false} style={{ margin: "0 auto" }} />
        
        <div className="am-role-badge">⚖️ Advocate Portal</div>
        <h1 className="am-login-title">Advocate Login</h1>
        <p className="am-login-sub">Law4u — Practice & Client Management</p>

        <div className="am-field">
          <label>Advocate Email</label>
          <input
            type="email"
            placeholder="advocate@advocateshub.in"
            value={form.email}
            onChange={(e) => {
              setForm((p) => ({ ...p, email: e.target.value }));
              setErr("");
            }}
            disabled={loading}
          />
        </div>

        <div className="am-field">
          <label>Password</label>
          <div className="am-pw-wrap">
            <input
              type={showPw ? "text" : "password"}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => {
                setForm((p) => ({ ...p, password: e.target.value }));
                setErr("");
              }}
              disabled={loading}
            />
            <button
              type="button"
              className="am-eye"
              onClick={() => setShowPw((p) => !p)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="am-login-options">
          <label className="am-remember">
            <input
              type="checkbox"
              checked={form.remember}
              onChange={(e) => setForm((p) => ({ ...p, remember: e.target.checked }))}
            />
            <span>Remember me</span>
          </label>
          <Link to="/forgot-password" className="am-forgot-link">
            Forgot password?
          </Link>
        </div>

        {err && <p className="am-err">⚠ {err}</p>}

        <button type="submit" className="am-btn-primary" disabled={loading}>
          {loading ? "Signing in…" : "Login to Advocate Portal →"}
        </button>

        <p className="am-alt-link">
          Not registered as an advocate yet? <Link to="/signup">Apply for Account</Link>
        </p>

        <p className="am-alt-sub">
          Are you a client? <Link to="/client-login">Client Login here</Link>
        </p>

        <Link to="/" className="am-back-link">
          ← Back to site
        </Link>
      </form>
    </div>
  );
}