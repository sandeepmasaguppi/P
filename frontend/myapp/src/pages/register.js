// ============================================================
//  register.js  —  Advocate Hub CLIENT Registration Page
//  ------------------------------------------------------------
//  Standalone page (no advocate tab) for clients only.
//  On submit -> POST /api/auth/client/register
//  Success    -> shows success screen -> redirects to /login
//  Duplicate email (409) / other errors are shown inline + toast
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import "./Register.css";

// ── If your backend runs on a different origin/port, set it here ──
// e.g. const API_BASE = "http://localhost:5000";
const API_BASE = "";

// ── Data ─────────────────────────────────────────────────────
const CITIES = [
  "Afzalpur","Alur","Aland","Ankola","Arakalgud","Arasikere","Athani","Aurad","Anekal",
  "Bagepalli","Bagalkot","Bailhongal","Baindur","Banahatti","Bangarapet","Bantwal",
  "Basavana Bagewadi","Basavakalyan","Belagavi","Belthangady","Belur","Bhadravati",
  "Bhalki","Bhatkal","Bilagi","Byadgi","Bengaluru","Bengaluru Rural",
  "Challakere","Chamarajanagar","Channagiri","Channapatna","Channarayapatna",
  "Chikkaballapur","Chikkamagaluru","Chikkodi","Chiknayakanhalli","Chincholi",
  "Chintamani","Chitapur","Chitradurga",
  "Dandeli","Davangere","Devanahalli","Devadurga","Dharwad","Doddaballapur",
  "Gadag","Gangavathi","Gauribidanur","Gokak","Gudibande","Gubbi","Gundlupet",
  "H.D. Kote","Hagaribommanahalli","Haliyal","Hanagal","Harihar","Hassan","Haveri",
  "Holenarasipura","Holalkere","Honnavar","Hosanagara","Hospete","Hosadurga",
  "Hoskote","Humnabad","Hukeri","Hunsur","Hungund","Hirekerur",
  "Ilkal","Indi",
  "Jamkhandi","Jevargi","Jagalur",
  "Kadur","Kagwad","Kalaburagi","Kalghatgi","Kanakapura","Karwar","Karkala",
  "Khanapur","Kittur","Kolar","Kollegal","Koppa","Koratagere","Krishnarajanagara",
  "Krishnarajapete","Kundapura","Kundgol","Kumta","Kushalnagar","Kushtagi",
  "Kudachi","Kudligi","KGF",
  "Lakshmeshwar","Lingasugur",
  "Maddur","Madikeri","Magadi","Malavalli","Malur","Manvi","Mangaluru","Mandya",
  "Muddebihal","Mudhol","Mudigere","Mudalagi","Mundagod","Mundargi","Mulbagal","Mysuru",
  "Nagamangala","Nanjangud","Narasimharajapura","Navalgund","Nelamangala","Nippani","Nargund",
  "Pandavapura","Pavagada","Periyapatna","Ponnampet","Puttur",
  "Raibag","Raichur","Ramanagara","Ramdurg","Ranebennur","Ron",
  "Sagara","Sakleshpur","Sandalaga","Sandur","Sankeshwar","Savanur","Sedam",
  "Shahabad","Shahapur","Shiggaon","Shikaripura","Shivamogga","Shorapur","Shirsi",
  "Siddapur","Sindagi","Sindhanur","Sira","Siruguppa","Sirsi","Somwarpet",
  "Srinivaspur","Sringeri","Srirangapatna","Sullia",
  "Tarikere","Thirthahalli","Tiptur","Tirumakudalu Narasipura","Tumakuru","Turuvekere",
  "Udupi",
  "Vijayapura","Virajpet",
  "Yadgir","Yaragatti","Yellapur","Yelburga",
];

const PRACTICE_AREAS = [
  "Criminal Law","Family Law","Property Law","Civil Law",
  "Corporate Law","Tax Law","Labour Law","Consumer Law",
  "Cyber Law","Immigration","Banking Law","Intellectual Property",
  "Divorce","Cheque Bounce","NRI Matters","Supreme Court",
];

// ── Helpers ───────────────────────────────────────────────────
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPhone(p) { return /^\d{10}$/.test(p.replace(/\s|-/g, "")); }

function PwStrength({ pw }) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 6)          s++;
  if (pw.length >= 10)         s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const LV = [
    { label: "Very Weak", c: "#ef4444" },
    { label: "Weak",      c: "#f97316" },
    { label: "Fair",      c: "#f59e0b" },
    { label: "Good",      c: "#84cc16" },
    { label: "Strong",    c: "#22c55e" },
  ];
  const lv = LV[Math.min(s, 4)];
  return (
    <div className="rg-pw-strength">
      <div className="rg-pw-bars">
        {LV.map((_, i) => (
          <div key={i} className="rg-pw-bar" style={{ background: i < s ? lv.c : "#e2e8f0" }} />
        ))}
      </div>
      <span style={{ color: lv.c, fontSize: 11, fontWeight: 600 }}>{lv.label}</span>
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="rg-field">
      {label && (
        <label className="rg-label">
          {label}{required && <span className="rg-req"> *</span>}
        </label>
      )}
      {children}
      {hint  && !error && <p className="rg-hint">{hint}</p>}
      {error && <p className="rg-field-err">⚠ {error}</p>}
    </div>
  );
}

function Input({ icon, error, type = "text", rightEl, ...props }) {
  return (
    <div className={`rg-input-wrap ${error ? "error" : ""}`}>
      {icon && <span className="rg-input-icon">{icon}</span>}
      <input type={type} className="rg-input" {...props} />
      {rightEl}
    </div>
  );
}

function Select({ icon, error, children, ...props }) {
  return (
    <div className={`rg-input-wrap ${error ? "error" : ""}`}>
      {icon && <span className="rg-input-icon">{icon}</span>}
      <select className="rg-input rg-select" {...props}>{children}</select>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────
function SuccessScreen({ name, onLogin }) {
  const [count, setCount] = useState(5);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => {
      if (c <= 1) { clearInterval(t); onLogin(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [onLogin]);

  return (
    <div className="rg-success">
      <div className="rg-success-icon">🎉</div>
      <h2 className="rg-success-title">Registration Successful!</h2>
      <p className="rg-success-msg">
        Welcome to Advocate Hub, <strong>{name}</strong>!<br />
        Your client account has been created. You can now find and connect with advocates.
      </p>
      <div className="rg-success-steps">
        <div className="rg-ss done">✅ Account created</div>
        <div className="rg-ss">🔓 Login to get started</div>
      </div>
      <div className="rg-success-countdown">
        Redirecting to login in <strong>{count}</strong> seconds…
      </div>
      <button className="rg-btn-primary rg-btn-lg" onClick={onLogin}>
        Go to Login Now →
      </button>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const MAP = {
    success: { bg: "#dcfce7", c: "#14532d", b: "#bbf7d0", i: "✅" },
    error:   { bg: "#fee2e2", c: "#7f1d1d", b: "#fecaca", i: "❌" },
    info:    { bg: "#dbeafe", c: "#1e3a5f", b: "#bfdbfe", i: "ℹ️" },
  };
  const s = MAP[toast.type] || MAP.info;
  return (
    <div className="rg-toast" style={{ background: s.bg, color: s.c, border: `1px solid ${s.b}` }}>
      {s.i} {toast.msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN CLIENT REGISTER COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Register() {
  const navigate = useNavigate();
  const [view, setView]       = useState("form"); // "form" | "success"
  const [toast, setToast]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [successName, setSuccessName] = useState("");

  const [client, setClient] = useState({
    fullName: "", email: "", phone: "", password: "", confirmPw: "",
    city: "", legalIssue: "", agreeTerms: false,
  });
  const [err, setErr] = useState({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const setC = (k, v) => {
    setClient((p) => ({ ...p, [k]: v }));
    setErr((p) => ({ ...p, [k]: "" }));
  };

  // ── Validate ──────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!client.fullName.trim())          e.fullName  = "Full name is required";
    if (!client.email.trim())              e.email     = "Email is required";
    else if (!isValidEmail(client.email))  e.email     = "Invalid email format";
    if (!client.phone.trim())              e.phone     = "Phone is required";
    else if (!isValidPhone(client.phone))  e.phone     = "Enter valid 10-digit phone";
    if (!client.password)                  e.password  = "Password is required";
    else if (client.password.length < 6)   e.password  = "Min 6 characters";
    if (client.password !== client.confirmPw) e.confirmPw = "Passwords do not match";
    if (!client.agreeTerms)                e.agreeTerms = "Please accept terms";
    setErr(e);
    return !Object.keys(e).length;
  };

  // ── Submit — POST /api/auth/client/register ────────────────
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setLoading(true);

    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/client/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: client.fullName.trim(),
            email: client.email.trim().toLowerCase(),
            password: client.password,
            phone: client.phone.trim(),
            city: client.city,
            legalIssue: client.legalIssue,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          if (res.status === 409) {
            setErr((p) => ({ ...p, email: data.message || "Email already registered" }));
          }
          showToast(data.message || "Something went wrong. Try again.", "error");
          setLoading(false);
          return;
        }

        setSuccessName(client.fullName);
        showToast("Account created successfully! 🎉", "success");
        setView("success");
      } catch (err) {
        console.error(err);
        showToast("Could not reach the server. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    })();
  };

  const goToLogin = () => navigate("/login");

  if (view === "success") {
    return (
      <div className="rg-page">
        <Toast toast={toast} />
        <div className="rg-card rg-success-card">
          <SuccessScreen name={successName} onLogin={goToLogin} />
        </div>
      </div>
    );
  }

  return (
    <div className="rg-page">
      <Toast toast={toast} />

      <div className="rg-card">

        {/* Header */}
        <div className="rg-header">
          <Link to="/" className="rg-logo" style={{ textDecoration: "none", display: "inline-flex", justifyContent: "center" }}>
            <BrandLogo size={40} wordmark={true} />
          </Link>
          <h1 className="rg-title">Create Your Client Account</h1>
          <p className="rg-subtitle">India's Most Trusted Legal Platform</p>
        </div>

        <div className="rg-tab-desc">
          🔍 Find trusted advocates, get legal advice, and resolve your legal matters.
        </div>

        <form className="rg-form" onSubmit={handleSubmit} noValidate>

          <div className="rg-form-section-title">Personal Information</div>

          <div className="rg-grid-2">
            <Field label="Full Name" required error={err.fullName}>
              <Input icon="👤" placeholder="Your full name"
                value={client.fullName} onChange={(e) => setC("fullName", e.target.value)}
                error={err.fullName} disabled={loading} />
            </Field>

            <Field label="Phone Number" required error={err.phone}>
              <Input icon="📱" placeholder="10-digit mobile number" type="tel"
                value={client.phone} onChange={(e) => setC("phone", e.target.value)}
                error={err.phone} disabled={loading} maxLength={10} />
            </Field>
          </div>

          <Field label="Email Address" required error={err.email}>
            <Input icon="✉️" type="email" placeholder="your@email.com"
              value={client.email} onChange={(e) => setC("email", e.target.value)}
              error={err.email} disabled={loading}
              rightEl={client.email && isValidEmail(client.email) && <span className="rg-valid">✓</span>} />
          </Field>

          <div className="rg-grid-2">
            <Field label="City" error={err.city}>
              <Select icon="📍" value={client.city} onChange={(e) => setC("city", e.target.value)} disabled={loading}>
                <option value="">Select your city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </Field>

            <Field label="Legal Issue" error={err.legalIssue}>
              <Select icon="⚖️" value={client.legalIssue} onChange={(e) => setC("legalIssue", e.target.value)} disabled={loading}>
                <option value="">Select legal issue</option>
                {PRACTICE_AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </Field>
          </div>

          <div className="rg-form-section-title" style={{ marginTop: 8 }}>Security</div>

          <div className="rg-grid-2">
            <Field label="Password" required error={err.password}>
              <Input icon="🔒" type={showPw ? "text" : "password"} placeholder="Min 6 characters"
                value={client.password} onChange={(e) => setC("password", e.target.value)}
                error={err.password} disabled={loading}
                rightEl={<button type="button" className="rg-eye" onClick={() => setShowPw((p) => !p)}>{showPw ? "🙈" : "👁️"}</button>} />
              <PwStrength pw={client.password} />
            </Field>

            <Field label="Confirm Password" required error={err.confirmPw}>
              <Input icon="🔑" type={showCPw ? "text" : "password"} placeholder="Re-enter password"
                value={client.confirmPw} onChange={(e) => setC("confirmPw", e.target.value)}
                error={err.confirmPw} disabled={loading}
                rightEl={
                  client.confirmPw && client.password === client.confirmPw
                    ? <span className="rg-valid">✓</span>
                    : <button type="button" className="rg-eye" onClick={() => setShowCPw((p) => !p)}>{showCPw ? "🙈" : "👁️"}</button>
                } />
            </Field>
          </div>

          <label className="rg-agree">
            <input type="checkbox" checked={client.agreeTerms} onChange={(e) => setC("agreeTerms", e.target.checked)} />
            <span>I agree to the <a href="/terms" target="_blank" rel="noreferrer">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noreferrer">Privacy Policy</a></span>
          </label>
          {err.agreeTerms && <p className="rg-field-err">⚠ {err.agreeTerms}</p>}

          <button type="submit" className="rg-btn-primary rg-btn-lg" disabled={loading}>
            {loading ? <><span className="rg-spinner" /> Creating account…</> : "Create Client Account →"}
          </button>

          <p className="rg-login-link">
            Already have an account? <Link to="/login">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
  );
}