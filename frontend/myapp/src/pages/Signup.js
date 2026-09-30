// ============================================================
//  Signup.js  —  Law4u Signup Page
//  Two tabs: Client | Advocate
//  Client accounts are saved immediately (clientsStore).
//  Advocate accounts are saved with status "pending" and must
//  be approved on the Admin page before they can log in.
//  After signup → success screen → redirect to login
// ============================================================

import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerAdvocate } from "../data/Advocatesstore";
import { registerClient } from "../data/Clientsstore";
import {
  COURT_LEVELS,
  HIGH_COURT_BENCHES,
  KARNATAKA_DISTRICTS_TALUKS,
  getDistricts,
  getTaluksForDistrict,
  buildTargetCourt,
} from "../data/CourtsData";
import "./Signup.css";

// ── Data from JSON ────────────────────────────────────────────
const CITIES = [
  // =====================a====
  // A
  // =========================
  "Afzalpur",
  "Alur",
  "Aland",
  "Ankola",
  "Arakalgud",
  "Arasikere",
  "Athani",
  "Aurad",
  "Anekal",

  // =========================
  // B
  // =========================
  "Bagepalli",
  "Bagalkot",
  "Bailhongal",
  "Baindur",
  "Banahatti",
  "Bangarapet",
  "Bantwal",
  "Basavana Bagewadi",
  "Basavakalyan",
  "Belagavi",
  "Belthangady",
  "Belur",
  "Bhadravati",
  "Bhalki",
  "Bhatkal",
  "Bilagi",
  "Byadgi",
  "Bengaluru",
  "Bengaluru Rural",

  // =========================
  // C
  // =========================
  "Challakere",
  "Chamarajanagar",
  "Channagiri",
  "Channapatna",
  "Channarayapatna",
  "Chikkaballapur",
  "Chikkamagaluru",
  "Chikkodi",
  "Chiknayakanhalli",
  "Chincholi",
  "Chintamani",
  "Chitapur",
  "Chitradurga",

  // =========================
  // D
  // =========================
  "Dandeli",
  "Davangere",
  "Devanahalli",
  "Devadurga",
  "Dharwad",
  "Doddaballapur",

  // =========================
  // G
  // =========================
  "Gadag",
  "Gangavathi",
  "Gauribidanur",
  "Gokak",
  "Gudibande",
  "Gubbi",
  "Gundlupet",

  // =========================
  // H
  // =========================
  "H.D. Kote",
  "Hagaribommanahalli",
  "Haliyal",
  "Hanagal",
  "Harihar",
  "Hassan",
  "Haveri",
  "Holenarasipura",
  "Holalkere",
  "Honnavar",
  "Hosanagara",
  "Hospete",
  "Hosadurga",
  "Hoskote",
  "Humnabad",
  "Hukeri",
  "Hunsur",
  "Hungund",
  "Hirekerur",

  // =========================
  // I
  // =========================
  "Ilkal",
  "Indi",

  // =========================
  // J
  // =========================
  "Jamkhandi",
  "Jevargi",
  "Jagalur",

  // =========================
  // K
  // =========================
  "Kadur",
  "Kagwad",
  "Kalaburagi",
  "Kalghatgi",
  "Kanakapura",
  "Karwar",
  "Karkala",
  "Khanapur",
  "Kittur",
  "Kolar",
  "Kollegal",
  "Koppa",
  "Koratagere",
  "Krishnarajanagara",
  "Krishnarajapete",
  "Kundapura",
  "Kundgol",
  "Kumta",
  "Kushalnagar",
  "Kushtagi",
  "Kudachi",
  "Kudligi",
  "KGF",

  // =========================
  // L
  // =========================
  "Lakshmeshwar",
  "Lingasugur",

  // =========================
  // M
  // =========================
  "Maddur",
  "Madikeri",
  "Magadi",
  "Malavalli",
  "Malur",
  "Manvi",
  "Mangaluru",
  "Mandya",
  "Muddebihal",
  "Mudhol",
  "Mudigere",
  "Mudalagi",
  "Mundagod",
  "Mundargi",
  "Mulbagal",
  "Mysuru",

  // =========================
  // N
  // =========================
  "Nagamangala",
  "Nanjangud",
  "Narasimharajapura",
  "Navalgund",
  "Nelamangala",
  "Nippani",
  "Nargund",

  // =========================
  // P
  // =========================
  "Pandavapura",
  "Pavagada",
  "Periyapatna",
  "Ponnampet",
  "Puttur",

  // =========================
  // R
  // =========================
  "Raibag",
  "Raichur",
  "Ramanagara",
  "Ramdurg",
  "Ranebennur",
  "Ron",

  // =========================
  // S
  // =========================
  "Sagara",
  "Sakleshpur",
  "Sandalaga",
  "Sandur",
  "Sankeshwar",
  "Savanur",
  "Sedam",
  "Shahabad",
  "Shahapur",
  "Shiggaon",
  "Shikaripura",
  "Shivamogga",
  "Shorapur",
  "Shirsi",
  "Siddapur",
  "Sindagi",
  "Sindhanur",
  "Sira",
  "Siruguppa",
  "Sirsi",
  "Somwarpet",
  "Srinivaspur",
  "Sringeri",
  "Srirangapatna",
  "Sullia",

  // =========================
  // T
  // =========================
  "Tarikere",
  "Thirthahalli",
  "Tiptur",
  "Tirumakudalu Narasipura",
  "Tumakuru",
  "Turuvekere",

  // =========================
  // U
  // =========================
  "Udupi",

  // =========================
  // V
  // =========================
  "Vijayapura",
  "Virajpet",

  // =========================
  // Y
  // =========================
  "Yadgir",
  "Yaragatti",
  "Yellapur",
  "Yelburga"
];

const PRACTICE_AREAS = [
  "Criminal Law","Family Law","Property Law","Civil Law",
  "Corporate Law","Tax Law","Labour Law","Consumer Law",
  "Cyber Law","Immigration","Banking Law","Intellectual Property",
  "Divorce","Cheque Bounce","NRI Matters","Supreme Court",
];


const BAR_COUNCILS = [
  "Bar Council of India","Bar Council of Karnataka"
];

const EXPERIENCE_YEARS = [
  "Less than 1 year","1–3 years","3–5 years",
  "5–10 years","10–15 years","15–20 years","20+ years",
];

const ADVOCATES_JSON = [
  { name:"Adv. Rajesh Kumar",  email:"rajesh.kumar@law4u.in",  phone:"9876543210", city:"Delhi",     speciality:"Criminal Law",  experience:"10–15 years", barId:"BCI/DL/2012/1234", court:"High Court",     fee:"₹2000/hr", bio:"15 years of experience in criminal defense and bail matters.",   initials:"RK", color:"#2563eb" },
  { name:"Adv. Priya Sharma",  email:"priya.sharma@law4u.in",  phone:"9823456781", city:"Bengaluru", speciality:"Family Law",    experience:"5–10 years",  barId:"BCI/KA/2016/4321", court:"Family Court",   fee:"₹1500/hr", bio:"Specialist in divorce, child custody and matrimonial disputes.", initials:"PS", color:"#16a34a" },
  { name:"Adv. Amit Verma",    email:"amit.verma@law4u.in",    phone:"9812345670", city:"Mumbai",    speciality:"Property Law",  experience:"15–20 years", barId:"BCI/MH/2008/7654", court:"High Court",     fee:"₹3000/hr", bio:"Expert in property disputes, title verification and RERA.",      initials:"AV", color:"#7c3aed" },
  { name:"Adv. Sneha Nair",    email:"sneha.nair@law4u.in",    phone:"9801234567", city:"Chennai",   speciality:"Corporate Law", experience:"5–10 years",  barId:"BCI/TN/2015/2345", court:"High Court",     fee:"₹2500/hr", bio:"Corporate lawyer specializing in company law and compliance.",   initials:"SN", color:"#dc2626" },
  { name:"Adv. Rohit Gupta",   email:"rohit.gupta@law4u.in",   phone:"9890123456", city:"Hyderabad", speciality:"Civil Law",     experience:"10–15 years", barId:"BCI/TS/2011/3456", court:"Civil Court",    fee:"₹1800/hr", bio:"Civil suits, injunctions and recovery matters specialist.",      initials:"RG", color:"#ea580c" },
  { name:"Adv. Ananya Singh",  email:"ananya.singh@law4u.in",  phone:"9879012345", city:"Pune",      speciality:"Tax Law",       experience:"5–10 years",  barId:"BCI/MH/2017/5678", court:"District Court", fee:"₹2000/hr", bio:"GST, income tax and corporate taxation consultant.",             initials:"AS", color:"#0891b2" },
];

// ── Helpers ───────────────────────────────────────────────────
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function isValidPhone(p) { return /^\d{10}$/.test(p.replace(/\s|-/g, "")); }

function PwStrength({ pw }) {
  if (!pw) return null;
  let s = 0;
  if (pw.length >= 6)           s++;
  if (pw.length >= 10)          s++;
  if (/[A-Z]/.test(pw))        s++;
  if (/[0-9]/.test(pw))        s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  const LV = [
    { label:"Very Weak", c:"#ef4444" },
    { label:"Weak",      c:"#f97316" },
    { label:"Fair",      c:"#f59e0b" },
    { label:"Good",      c:"#84cc16" },
    { label:"Strong",    c:"#22c55e" },
  ];
  const lv = LV[Math.min(s, 4)];
  return (
    <div className="su-pw-strength">
      <div className="su-pw-bars">
        {LV.map((_, i) => (
          <div key={i} className="su-pw-bar" style={{ background: i < s ? lv.c : "#e2e8f0" }} />
        ))}
      </div>
      <span style={{ color: lv.c, fontSize: 11, fontWeight: 600 }}>{lv.label}</span>
    </div>
  );
}

function Field({ label, required, error, hint, children }) {
  return (
    <div className="su-field">
      {label && (
        <label className="su-label">
          {label}{required && <span className="su-req"> *</span>}
        </label>
      )}
      {children}
      {hint  && !error && <p className="su-hint">{hint}</p>}
      {error && <p className="su-field-err">⚠ {error}</p>}
    </div>
  );
}

function Input({ icon, error, type = "text", rightEl, ...props }) {
  return (
    <div className={`su-input-wrap ${error ? "error" : ""}`}>
      {icon && <span className="su-input-icon">{icon}</span>}
      <input type={type} className="su-input" {...props} />
      {rightEl}
    </div>
  );
}

function Select({ icon, error, children, ...props }) {
  return (
    <div className={`su-input-wrap ${error ? "error" : ""}`}>
      {icon && <span className="su-input-icon">{icon}</span>}
      <select className="su-input su-select" {...props}>{children}</select>
    </div>
  );
}

// ── Success Screen ────────────────────────────────────────────
function SuccessScreen({ type, name, onLogin }) {
  const [count, setCount] = useState(5);
  useEffect(() => {
    const t = setInterval(() => setCount(c => {
      if (c <= 1) { clearInterval(t); onLogin(); return 0; }
      return c - 1;
    }), 1000);
    return () => clearInterval(t);
  }, [onLogin]);

  return (
    <div className="su-success">
      <div className="su-success-icon">🎉</div>
      <h2 className="su-success-title">Registration Successful!</h2>
      <p className="su-success-msg">
        Welcome to Law4u, <strong>{name}</strong>!<br />
        {type === "advocate"
          ? "Your advocate profile has been submitted. An admin will review and approve your account before you can log in."
          : "Your client account has been created. You can now find and connect with advocates."}
      </p>
      <div className="su-success-steps">
        <div className="su-ss done">✅ Account created</div>
        {type === "advocate" && <div className="su-ss pending">⏳ Awaiting admin approval</div>}
        <div className="su-ss">🔓 Login to get started</div>
      </div>
      <div className="su-success-countdown">
        Redirecting to login in <strong>{count}</strong> seconds…
      </div>
      <button className="su-btn-primary su-btn-lg" onClick={onLogin}>
        Go to Login Now →
      </button>
    </div>
  );
}

// ── Advocate Card (from JSON) ─────────────────────────────────
function AdvCard({ adv, onFill }) {
  return (
    <div className="su-adv-card" onClick={() => onFill(adv)}>
      <div className="su-adv-avatar" style={{ background: adv.color }}>{adv.initials}</div>
      <div className="su-adv-info">
        <div className="su-adv-name">{adv.name}</div>
        <div className="su-adv-spec">{adv.speciality} · {adv.city}</div>
        <div className="su-adv-exp">{adv.experience}</div>
      </div>
      <span className="su-adv-fill">Use →</span>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const MAP = {
    success:{ bg:"#dcfce7", c:"#14532d", b:"#bbf7d0", i:"✅" },
    error:  { bg:"#fee2e2", c:"#7f1d1d", b:"#fecaca", i:"❌" },
    info:   { bg:"#dbeafe", c:"#1e3a5f", b:"#bfdbfe", i:"ℹ️" },
  };
  const s = MAP[toast.type] || MAP.info;
  return (
    <div className="su-toast" style={{ background:s.bg, color:s.c, border:`1px solid ${s.b}` }}>
      {s.i} {toast.msg}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  MAIN SIGNUP COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Signup() {
  const navigate = useNavigate();
  const [tab,     setTab]     = useState("client");   // "client" | "advocate"
  const [view,    setView]    = useState("form");      // "form" | "success"
  const [toast,   setToast]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDemoAdvocates, setShowDemoAdvocates] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const [showCPw, setShowCPw] = useState(false);
  const [successName, setSuccessName] = useState("");

  // ── Client form ───────────────────────────────────────────
  const [client, setClient] = useState({
    fullName:"", email:"", phone:"", password:"", confirmPw:"",
    city:"", legalIssue:"", agreeTerms: false,
  });
  const [clientErr, setClientErr] = useState({});

  // ── Advocate form ─────────────────────────────────────────
  const [adv, setAdv] = useState({
    fullName:"", email:"", phone:"", password:"", confirmPw:"",
    barId:"", speciality:"", specialities:[],
    courtLevel:"", district:"", taluk:"", bench:"", court:"",
    barCouncil:"",
    experience:"", city:"", fee:"", bio:"", avatarData:"", agreeTerms: false,
  });
  const [advErr, setAdvErr] = useState({});
  const [customArea, setCustomArea] = useState("");

  const handleCourtLevelChange = (level) => {
    setAdv(prev => {
      let nextDistrict = prev.district;
      let nextTaluk = prev.taluk;
      let nextBench = prev.bench;
      let nextCity = prev.city;

      if (level === "Supreme Court") {
        nextDistrict = "New Delhi";
        nextTaluk = "New Delhi";
        nextBench = "";
        nextCity = "New Delhi";
      } else if (level === "High Court") {
        nextDistrict = "";
        nextTaluk = "";
        if (!nextBench) nextBench = HIGH_COURT_BENCHES[0];
        nextCity = nextBench.includes("Dharwad") ? "Dharwad" : (nextBench.includes("Kalaburagi") ? "Kalaburagi" : "Bengaluru");
      } else {
        nextBench = "";
        if (nextDistrict === "New Delhi") nextDistrict = "";
        if (nextTaluk === "New Delhi") nextTaluk = "";
      }

      const computedCourt = buildTargetCourt({
        courtLevel: level,
        district: nextDistrict,
        taluk: nextTaluk,
        bench: nextBench,
      });

      return {
        ...prev,
        courtLevel: level,
        district: nextDistrict,
        taluk: nextTaluk,
        bench: nextBench,
        court: computedCourt,
        city: nextCity || nextTaluk || nextDistrict || prev.city,
      };
    });
    setAdvErr(p => ({ ...p, courtLevel: "", court: "", district: "", taluk: "" }));
  };

  const handleDistrictChange = (dist) => {
    setAdv(prev => {
      const taluks = getTaluksForDistrict(dist);
      const nextTaluk = taluks.includes(prev.taluk) ? prev.taluk : (taluks.length > 0 ? taluks[0] : "");
      const nextCity = nextTaluk || dist || "";
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: dist,
        taluk: nextTaluk,
        bench: prev.bench,
      });
      return {
        ...prev,
        district: dist,
        taluk: nextTaluk,
        court: computedCourt,
        city: nextCity,
      };
    });
    setAdvErr(p => ({ ...p, district: "", court: "" }));
  };

  const handleTalukChange = (tlk) => {
    setAdv(prev => {
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: prev.district,
        taluk: tlk,
        bench: prev.bench,
      });
      return {
        ...prev,
        taluk: tlk,
        court: computedCourt,
        city: tlk || prev.district || prev.city,
      };
    });
    setAdvErr(p => ({ ...p, taluk: "", court: "" }));
  };

  const handleBenchChange = (bnch) => {
    setAdv(prev => {
      const computedCourt = buildTargetCourt({
        courtLevel: prev.courtLevel,
        district: prev.district,
        taluk: prev.taluk,
        bench: bnch,
      });
      const nextCity = bnch.includes("Dharwad") ? "Dharwad" : (bnch.includes("Kalaburagi") ? "Kalaburagi" : "Bengaluru");
      return {
        ...prev,
        bench: bnch,
        court: computedCourt,
        city: nextCity,
      };
    });
    setAdvErr(p => ({ ...p, court: "" }));
  };

  const handleTogglePracticeArea = (area) => {
    if (!area) return;
    setAdv(prev => {
      const current = Array.isArray(prev.specialities) && prev.specialities.length > 0
        ? prev.specialities
        : (prev.speciality ? prev.speciality.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
      const exists = current.includes(area);
      const next = exists ? current.filter(x => x !== area) : [...current, area];
      return {
        ...prev,
        specialities: next,
        speciality: next.join(", "),
      };
    });
    setAdvErr(p => ({ ...p, speciality: "" }));
  };

  const handleAddCustomPracticeArea = (customName) => {
    const trimmed = (customName || "").trim();
    if (!trimmed) return;
    setAdv(prev => {
      const current = Array.isArray(prev.specialities) && prev.specialities.length > 0
        ? prev.specialities
        : (prev.speciality ? prev.speciality.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
      if (current.some(x => x.toLowerCase() === trimmed.toLowerCase())) return prev;
      const next = [...current, trimmed];
      return {
        ...prev,
        specialities: next,
        speciality: next.join(", "),
      };
    });
    setAdvErr(p => ({ ...p, speciality: "" }));
  };

  const handleRemovePracticeArea = (area) => {
    setAdv(prev => {
      const current = Array.isArray(prev.specialities) && prev.specialities.length > 0
        ? prev.specialities
        : (prev.speciality ? prev.speciality.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
      const next = current.filter(x => x !== area);
      return {
        ...prev,
        specialities: next,
        speciality: next.join(", "),
      };
    });
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  // ── Set client field ──────────────────────────────────────
  const setC = (k, v) => {
    setClient(p => ({ ...p, [k]: v }));
    setClientErr(p => ({ ...p, [k]: "" }));
  };
  const setA = (k, v) => {
    setAdv(p => ({ ...p, [k]: v }));
    setAdvErr(p => ({ ...p, [k]: "" }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAdvErr((p) => ({ ...p, avatarData: "Please select an image file" }));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAdvErr((p) => ({ ...p, avatarData: "Image must be smaller than 2 MB" }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setA("avatarData", reader.result);
    reader.readAsDataURL(file);
  };

  // ── Fill from JSON advocate ───────────────────────────────
  const fillAdvocate = (a) => {
    const specs = a.speciality
      ? a.speciality.split(/,\s*|&\s*/).map(s => s.trim()).filter(Boolean)
      : [];
    const courtLevel = a.courtLevel || (a.court?.includes("High Court") ? "High Court" : (a.court?.includes("Supreme Court") ? "Supreme Court" : "Taluk / JMFC / Civil Court"));
    const district = a.district || (a.city && KARNATAKA_DISTRICTS_TALUKS[a.city] ? a.city : "Belagavi");
    const taluk = a.taluk || a.city || "Gokak";
    const computedCourt = a.court || buildTargetCourt({ courtLevel, district, taluk });
    setAdv(p => ({
      ...p,
      fullName:     a.name,
      email:        a.email,
      phone:        a.phone,
      city:         a.city || taluk || district,
      speciality:   a.speciality,
      specialities: specs.length > 0 ? specs : [a.speciality].filter(Boolean),
      experience:   a.experience,
      barId:        a.barId,
      courtLevel,
      district,
      taluk,
      court:        computedCourt,
      fee:          a.fee,
      bio:          a.bio,
    }));
    setAdvErr({});
    setShowDemoAdvocates(false);
    showToast(`Filled details for ${a.name}`, "info");
  };

  // ── Validate client ───────────────────────────────────────
  const validateClient = () => {
    const e = {};
    if (!client.fullName.trim())      e.fullName  = "Full name is required";
    if (!client.email.trim())          e.email     = "Email is required";
    else if (!isValidEmail(client.email)) e.email  = "Invalid email format";
    if (!client.phone.trim())          e.phone     = "Phone is required";
    else if (!isValidPhone(client.phone)) e.phone  = "Enter valid 10-digit phone";
    if (!client.password)              e.password  = "Password is required";
    else if (client.password.length<6) e.password  = "Min 6 characters";
    if (client.password !== client.confirmPw) e.confirmPw = "Passwords do not match";
    if (!client.agreeTerms)            e.agreeTerms = "Please accept terms";
    setClientErr(e);
    return !Object.keys(e).length;
  };

  // ── Validate advocate ─────────────────────────────────────
  const validateAdvocate = () => {
    const e = {};
    if (!adv.fullName.trim())      e.fullName  = "Full name is required";
    if (!adv.email.trim())          e.email     = "Email is required";
    else if (!isValidEmail(adv.email)) e.email  = "Invalid email format";
    if (!adv.phone.trim())          e.phone     = "Phone is required";
    else if (!isValidPhone(adv.phone)) e.phone  = "Enter valid 10-digit phone";
    if (!adv.barId.trim())          e.barId     = "Bar enrollment number is required";
    
    const specsList = (adv.specialities && adv.specialities.length > 0)
      ? adv.specialities
      : (adv.speciality ? adv.speciality.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
    if (specsList.length === 0)     e.speciality = "Please select or add at least 1 practice area";
    
    if (!adv.courtLevel)            e.courtLevel = "Select level of court";
    if (adv.courtLevel !== "Supreme Court" && adv.courtLevel !== "High Court" && !adv.district) {
      e.district = "Select district";
    }
    if ((adv.courtLevel === "Taluk / JMFC / Civil Court" || adv.courtLevel === "Revenue Court / Land Tribunal") && !adv.taluk) {
      e.taluk = "Select taluk";
    }
    if (!adv.court)                 e.court      = "Target court is required";
    if (!adv.city && !adv.taluk && !adv.district) e.city = "City or district is required";
    if (!adv.avatarData)            e.avatarData  = "Profile image is required";
    if (!adv.password)              e.password   = "Password is required";
    else if (adv.password.length<6) e.password   = "Min 6 characters";
    if (adv.password !== adv.confirmPw) e.confirmPw = "Passwords do not match";
    if (!adv.agreeTerms)            e.agreeTerms = "Please accept terms";
    setAdvErr(e);
    return !Object.keys(e).length;
  };

  // ── Submit — persist locally via advocatesStore / clientsStore ──
  const handleSubmit = (e) => {
    e?.preventDefault();
    const valid = tab === "client" ? validateClient() : validateAdvocate();
    if (!valid) return;

    setLoading(true);

    // Simulate a short delay so the loading state is visible
    setTimeout(async () => {
      try {
        if (tab === "client") {
          const emailLower = client.email.trim().toLowerCase();

          await registerClient({
            name:       client.fullName.trim(),
            email:      emailLower,
            password:   client.password,
            phone:      client.phone.trim(),
            city:       client.city,
            legalIssue: client.legalIssue,
          });

          setSuccessName(client.fullName);
          showToast("Account created successfully! 🎉", "success");
          setView("success");

        } else {
          const emailLower = adv.email.trim().toLowerCase();
          const specsList = (adv.specialities && adv.specialities.length > 0)
            ? adv.specialities
            : (adv.speciality ? adv.speciality.split(/,\s*/).map(s => s.trim()).filter(Boolean) : []);
          const finalSpeciality = specsList.join(", ");

          await registerAdvocate({
            name:          adv.fullName.trim(),
            email:         emailLower,
            password:      adv.password,
            phone:         adv.phone.trim(),
            barId:         adv.barId.trim(),
            speciality:    finalSpeciality,
            practiceArea:  finalSpeciality,
            practiceAreas: specsList,
            courtLevel:    adv.courtLevel,
            district:      adv.district,
            taluk:         adv.taluk,
            court:         adv.court,
            barCouncil:    adv.barCouncil,
            experience:    adv.experience,
            city:          adv.city || adv.taluk || adv.district,
            fee:           adv.fee || "",
            bio:           adv.bio,
            avatarData:    adv.avatarData, // stored server-side; status starts as "pending"
          });

          setSuccessName(adv.fullName);
          showToast("Application submitted! Awaiting approval. 🎉", "success");
          setView("success");
        }
      } catch (err) {
        if (err.status === 409) (tab === "client" ? setClientErr : setAdvErr)({ email: err.message });
        showToast(err.message || "Something went wrong. Try again.", "error");
      } finally {
        setLoading(false);
      }
    }, 500);
  };

  const goToLogin = () => navigate("/login");

  // ── Success view ──────────────────────────────────────────
  if (view === "success") {
    return (
      <div className="su-page">
        <Toast toast={toast} />
        <div className="su-card su-success-card">
          <SuccessScreen type={tab} name={successName} onLogin={goToLogin} />
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  return (
    <div className="su-page">
      <Toast toast={toast} />

      <div className="su-card">

        {/* Header */}
        <div className="su-header">
          <Link to="/" className="su-logo">
            <span style={{ color:"#2563eb", fontWeight:800 }}>Law</span>
            <span style={{ color:"#dc2626", fontWeight:800 }}>4</span>
            <span style={{ color:"#16a34a", fontWeight:800 }}>u</span>
          </Link>
          <h1 className="su-title">Create Your Account</h1>
          <p className="su-subtitle">India's Most Trusted Legal Platform</p>
        </div>

        {/* Tabs */}
        <div className="su-tabs">
          <button
            className={`su-tab ${tab === "client" ? "active" : ""}`}
            onClick={() => { setTab("client"); setClientErr({}); }}>
            👤 I'm a Client
          </button>
          <button
            className={`su-tab ${tab === "advocate" ? "active" : ""}`}
            onClick={() => { setTab("advocate"); setAdvErr({}); }}>
            ⚖️ I'm an Advocate
          </button>
        </div>

        {/* Tab description */}
        <div className="su-tab-desc">
          {tab === "client"
            ? "🔍 Find trusted advocates, get legal advice, and resolve your legal matters."
            : "💼 Register as an advocate to receive client consultations and grow your practice."}
        </div>

        {/* ══ CLIENT FORM ══ */}
        {tab === "client" && (
          <form className="su-form" onSubmit={handleSubmit} noValidate>

            <div className="su-form-section-title">Personal Information</div>

            <div className="su-grid-2">
              <Field label="Full Name" required error={clientErr.fullName}>
                <Input icon="👤" placeholder="Your full name"
                  value={client.fullName} onChange={e => setC("fullName", e.target.value)}
                  error={clientErr.fullName} disabled={loading} />
              </Field>

              <Field label="Phone Number" required error={clientErr.phone}>
                <Input icon="📱" placeholder="10-digit mobile number" type="tel"
                  value={client.phone} onChange={e => setC("phone", e.target.value)}
                  error={clientErr.phone} disabled={loading} maxLength={10} />
              </Field>
            </div>

            <Field label="Email Address" required error={clientErr.email}>
              <Input icon="✉️" type="email" placeholder="your@email.com"
                value={client.email} onChange={e => setC("email", e.target.value)}
                error={clientErr.email} disabled={loading}
                rightEl={client.email && isValidEmail(client.email) && <span className="su-valid">✓</span>} />
            </Field>

            <div className="su-grid-2">
              <Field label="City" error={clientErr.city}>
                <Select icon="📍" value={client.city} onChange={e => setC("city", e.target.value)} disabled={loading}>
                  <option value="">Select your city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>

              <Field label="Legal Issue" error={clientErr.legalIssue}>
                <Select icon="⚖️" value={client.legalIssue} onChange={e => setC("legalIssue", e.target.value)} disabled={loading}>
                  <option value="">Select legal issue</option>
                  {PRACTICE_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                </Select>
              </Field>
            </div>

            <div className="su-form-section-title" style={{ marginTop: 8 }}>Security</div>

            <div className="su-grid-2">
              <Field label="Password" required error={clientErr.password}>
                <Input icon="🔒" type={showPw ? "text" : "password"} placeholder="Min 6 characters"
                  value={client.password} onChange={e => setC("password", e.target.value)}
                  error={clientErr.password} disabled={loading}
                  rightEl={<button type="button" className="su-eye" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁️"}</button>} />
                <PwStrength pw={client.password} />
              </Field>

              <Field label="Confirm Password" required error={clientErr.confirmPw}>
                <Input icon="🔑" type={showCPw ? "text" : "password"} placeholder="Re-enter password"
                  value={client.confirmPw} onChange={e => setC("confirmPw", e.target.value)}
                  error={clientErr.confirmPw} disabled={loading}
                  rightEl={
                    client.confirmPw && client.password === client.confirmPw
                      ? <span className="su-valid">✓</span>
                      : <button type="button" className="su-eye" onClick={() => setShowCPw(p => !p)}>{showCPw ? "🙈" : "👁️"}</button>
                  } />
              </Field>
            </div>

            <label className="su-agree">
              <input type="checkbox" checked={client.agreeTerms} onChange={e => setC("agreeTerms", e.target.checked)} />
              <span>I agree to the <a href="/terms" target="_blank">Terms of Service</a> and <a href="/privacy" target="_blank">Privacy Policy</a></span>
            </label>
            {clientErr.agreeTerms && <p className="su-field-err">⚠ {clientErr.agreeTerms}</p>}

            <button type="submit" className="su-btn-primary su-btn-lg" disabled={loading}>
              {loading ? <><span className="su-spinner" /> Creating account…</> : "Create Client Account →"}
            </button>

            <p className="su-login-link">
              Already have an account? <Link to="/login">Sign in here</Link>
            </p>
          </form>
        )}

        {/* ══ ADVOCATE FORM ══ */}
        {tab === "advocate" && (
          <form className="su-form" onSubmit={handleSubmit} noValidate>

            {/* Demo fill from JSON */}
            <div className="su-demo-section">
              <button type="button" className="su-demo-toggle"
                onClick={() => setShowDemoAdvocates(p => !p)}>
                ⚖️ {showDemoAdvocates ? "Hide" : "Use"} Sample Advocate Profiles
              </button>
              {showDemoAdvocates && (
                <div className="su-demo-list">
                  <div className="su-demo-label">Select a profile to auto-fill the form</div>
                  {ADVOCATES_JSON.map(a => (
                    <AdvCard key={a.email} adv={a} onFill={fillAdvocate} />
                  ))}
                </div>
              )}
            </div>

            <div className="su-form-section-title">Personal Information</div>

            <div className="su-grid-2">
              <Field label="Full Name" required error={advErr.fullName}>
                <Input icon="👤" placeholder="Adv. Full Name"
                  value={adv.fullName} onChange={e => setA("fullName", e.target.value)}
                  error={advErr.fullName} disabled={loading} />
              </Field>

              <Field label="Phone Number" required error={advErr.phone}>
                <Input icon="📱" placeholder="10-digit mobile" type="tel"
                  value={adv.phone} onChange={e => setA("phone", e.target.value)}
                  error={advErr.phone} disabled={loading} maxLength={10} />
              </Field>
            </div>

            <Field label="Email Address" required error={advErr.email}>
              <Input icon="✉️" type="email" placeholder="advocate@email.com"
                value={adv.email} onChange={e => setA("email", e.target.value)}
                error={advErr.email} disabled={loading}
                rightEl={adv.email && isValidEmail(adv.email) && <span className="su-valid">✓</span>} />
            </Field>

            <div className="su-form-section-title" style={{ marginTop: 8 }}>Professional Details</div>

            <div className="su-grid-2">
              <Field label="Bar Enrollment Number" required error={advErr.barId}>
                <Input icon="🪪" placeholder="e.g. BCI/KA/2016/4321"
                  value={adv.barId} onChange={e => setA("barId", e.target.value)}
                  error={advErr.barId} disabled={loading} />
              </Field>

              <Field label="Bar Council" error={advErr.barCouncil}>
                <Select icon="🏛️" value={adv.barCouncil} onChange={e => setA("barCouncil", e.target.value)} disabled={loading}>
                  <option value="">Select bar council</option>
                  {BAR_COUNCILS.map(b => <option key={b} value={b}>{b}</option>)}
                </Select>
              </Field>
            </div>

            {/* 1. Primary Practice Area(s) & Fields of Expertise — 1 or more with Add & Show */}
            <div className="su-field" style={{ marginBottom: 6 }}>
              <label className="su-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 13.5 }}>
                  Practice Area &amp; Fields of Expertise <span className="su-req">*</span>
                </span>
                {adv.specialities && adv.specialities.length > 0 && (
                  <span style={{ fontSize: 12, color: "#166534", background: "#dcfce7", padding: "2px 8px", borderRadius: 12, fontWeight: 700, border: "1px solid #bbf7d0" }}>
                    ✓ {adv.specialities.length} {adv.specialities.length === 1 ? "field selected" : "fields selected"}
                  </span>
                )}
              </label>

              {/* Selected practice areas displayed as interactive tags */}
              {adv.specialities && adv.specialities.length > 0 ? (
                <div style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  margin: "4px 0 10px 0",
                  background: "#f8fafc",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "1px solid #e2e8f0",
                  boxShadow: "inset 0 1px 2px rgba(0,0,0,0.03)"
                }}>
                  <div style={{ width: "100%", fontSize: 11.5, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 2 }}>
                    Selected Fields of Expertise (Click ✕ to remove):
                  </div>
                  {adv.specialities.map((item) => (
                    <span
                      key={item}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
                        color: "#ffffff",
                        padding: "6px 14px",
                        borderRadius: 20,
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: "0 2px 4px rgba(30, 58, 138, 0.2)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>⚖️ {item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemovePracticeArea(item)}
                        style={{
                          background: "rgba(255,255,255,0.22)",
                          border: "none",
                          color: "#ffffff",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: "pointer",
                          fontSize: 11,
                          lineHeight: 1,
                          padding: 0,
                          fontWeight: 700,
                        }}
                        title={`Remove ${item}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{
                  padding: "10px 14px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: "#64748b",
                  marginBottom: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}>
                  <span>ℹ️</span>
                  <span>No practice areas selected yet. Pick from the list below or add a custom field.</span>
                </div>
              )}

              {/* Selector and Custom Add Row */}
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 240px" }}>
                  <Select
                    icon="⚖️"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleTogglePracticeArea(e.target.value);
                      }
                    }}
                    error={advErr.speciality}
                    disabled={loading}
                  >
                    <option value="">+ Choose Practice Area to add…</option>
                    {PRACTICE_AREAS.filter(a => !(adv.specialities || []).includes(a)).map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </Select>
                </div>

                <div style={{ display: "flex", gap: 6, flex: "1 1 240px" }}>
                  <input
                    type="text"
                    placeholder="Or type custom expertise (e.g. RERA, NCLT)"
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (customArea.trim()) {
                          handleAddCustomPracticeArea(customArea);
                          setCustomArea("");
                        }
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                      fontSize: 13,
                      background: "#f8fafc",
                    }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="su-btn-secondary"
                    onClick={() => {
                      if (customArea.trim()) {
                        handleAddCustomPracticeArea(customArea);
                        setCustomArea("");
                      }
                    }}
                    style={{ padding: "8px 16px", fontSize: 13, whiteSpace: "nowrap", borderRadius: 10, fontWeight: 600 }}
                    disabled={loading}
                  >
                    + Add Field
                  </button>
                </div>
              </div>

              {advErr.speciality && <p className="su-field-err" style={{ marginTop: 6 }}>⚠ {advErr.speciality}</p>}
            </div>

            {/* ── 3 Dependent Court & Jurisdiction Sections ──────────────── */}
            <div style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderLeft: "5px solid #2563eb",
              borderRadius: 14,
              padding: "18px 20px",
              margin: "12px 0 18px 0",
              boxShadow: "0 4px 12px -2px rgba(0, 0, 0, 0.05), 0 2px 6px -1px rgba(0, 0, 0, 0.03)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🏛️</span>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                      Court Hierarchy &amp; Jurisdiction
                    </div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                      Select the 3 levels below — Target Court is determined automatically
                    </div>
                  </div>
                </div>
                <span style={{
                  fontSize: 11,
                  background: "#eff6ff",
                  color: "#1d4ed8",
                  padding: "4px 12px",
                  borderRadius: 20,
                  fontWeight: 700,
                  border: "1px solid #bfdbfe",
                }}>
                  3 Dependent Steps
                </span>
              </div>

              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                marginTop: 14,
              }}>
                {/* 1st Section: Level of Court */}
                <Field label="Step 1: Level of Court" required error={advErr.courtLevel}>
                  <Select
                    icon="⚖️"
                    value={adv.courtLevel}
                    onChange={(e) => handleCourtLevelChange(e.target.value)}
                    error={advErr.courtLevel}
                    disabled={loading}
                  >
                    <option value="">-- Choose Court Level --</option>
                    {COURT_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>{lvl}</option>
                    ))}
                  </Select>
                </Field>

                {/* Conditional Branch for High Court / Supreme Court or District + Taluk */}
                {adv.courtLevel === "High Court" ? (
                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Step 2: High Court Bench" required>
                      <Select
                        icon="🏛️"
                        value={adv.bench || HIGH_COURT_BENCHES[0]}
                        onChange={(e) => handleBenchChange(e.target.value)}
                        disabled={loading}
                      >
                        {HIGH_COURT_BENCHES.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </Select>
                    </Field>
                  </div>
                ) : adv.courtLevel === "Supreme Court" ? (
                  <div style={{ gridColumn: "span 2" }}>
                    <Field label="Step 2: Jurisdiction &amp; Location">
                      <Input
                        icon="📍"
                        value="Supreme Court of India (New Delhi)"
                        readOnly
                        disabled
                        style={{ background: "#f8fafc", color: "#334155", fontWeight: 600 }}
                      />
                    </Field>
                  </div>
                ) : (
                  <>
                    {/* 2nd Section: District */}
                    <Field label="Step 2: District" required error={advErr.district}>
                      <Select
                        icon="🗺️"
                        value={adv.district}
                        onChange={(e) => handleDistrictChange(e.target.value)}
                        error={advErr.district}
                        disabled={loading}
                      >
                        <option value="">-- Select District --</option>
                        {getDistricts().map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </Select>
                    </Field>

                    {/* 3rd Section: Taluk (Dependent on District) */}
                    <Field
                      label="Step 3: Taluk"
                      required={adv.courtLevel === "Taluk / JMFC / Civil Court" || adv.courtLevel === "Revenue Court / Land Tribunal"}
                      error={advErr.taluk}
                      hint={!adv.district ? "Choose district first" : undefined}
                    >
                      <Select
                        icon="📍"
                        value={adv.taluk}
                        onChange={(e) => handleTalukChange(e.target.value)}
                        error={advErr.taluk}
                        disabled={loading || !adv.district}
                      >
                        <option value="">
                          {!adv.district ? "Select District first" : "-- Select Taluk --"}
                        </option>
                        {getTaluksForDistrict(adv.district).map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </Select>
                    </Field>
                  </>
                )}
              </div>

              {/* Target Court Output Banner — Only what was selected! */}
              {adv.court ? (
                <div style={{
                  marginTop: 14,
                  background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
                  border: "1px solid #86efac",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#166534", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                      🎯 Target Court Jurisdiction (Selected &amp; Linked)
                    </div>
                    <span style={{ fontSize: 11.5, background: "#dcfce7", color: "#15803d", padding: "2px 8px", borderRadius: 12, fontWeight: 700 }}>
                      ✓ Verified Jurisdiction
                    </span>
                  </div>

                  <div style={{ fontSize: 15, fontWeight: 800, color: "#0f172a" }}>
                    🏛️ {adv.court}
                  </div>

                  {/* Summary Chips: ONLY what is selected! */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                    {adv.courtLevel && (
                      <span style={{ fontSize: 12, background: "#ffffff", color: "#1e3a8a", padding: "3px 10px", borderRadius: 16, fontWeight: 600, border: "1px solid #bfdbfe" }}>
                        ⚖️ Level: <strong>{adv.courtLevel}</strong>
                      </span>
                    )}
                    {adv.district && (
                      <span style={{ fontSize: 12, background: "#ffffff", color: "#065f46", padding: "3px 10px", borderRadius: 16, fontWeight: 600, border: "1px solid #a7f3d0" }}>
                        🗺️ District: <strong>{adv.district}</strong>
                      </span>
                    )}
                    {adv.taluk && (
                      <span style={{ fontSize: 12, background: "#ffffff", color: "#7c2d12", padding: "3px 10px", borderRadius: 16, fontWeight: 600, border: "1px solid #fed7aa" }}>
                        📍 Taluk: <strong>{adv.taluk}</strong>
                      </span>
                    )}
                    {adv.city && (
                      <span style={{ fontSize: 12, background: "#ffffff", color: "#475569", padding: "3px 10px", borderRadius: 16, fontWeight: 600, border: "1px solid #cbd5e1" }}>
                        🏙️ Base Location: <strong>{adv.city}</strong>
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div style={{
                  marginTop: 12,
                  padding: "10px 14px",
                  background: "#f8fafc",
                  border: "1px dashed #cbd5e1",
                  borderRadius: 10,
                  fontSize: 12.5,
                  color: "#64748b",
                }}>
                  👉 Please choose <strong>Level of Court</strong> and <strong>District</strong> above to set the target court jurisdiction.
                </div>
              )}

              {advErr.court && <p className="su-field-err" style={{ marginTop: 6 }}>⚠ {advErr.court}</p>}
            </div>

            <div className="su-grid-2">
              <Field label="City / Location Name" required error={advErr.city} hint="Auto-filled from Taluk/District or customize">
                <Input
                  icon="📍"
                  placeholder="e.g. Gokak, Belagavi"
                  value={adv.city}
                  onChange={(e) => setA("city", e.target.value)}
                  error={advErr.city}
                  disabled={loading}
                />
              </Field>

              <Field label="Years of Experience" error={advErr.experience}>
                <Select icon="📅" value={adv.experience} onChange={(e) => setA("experience", e.target.value)} disabled={loading}>
                  <option value="">Select experience</option>
                  {EXPERIENCE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Short Bio" error={advErr.bio}
              hint="A brief description about your expertise (max 300 chars)">
              <div className="su-textarea-wrap">
                <textarea className="su-textarea" rows={3} maxLength={300}
                  placeholder="e.g. 10+ years in criminal defense, specializing in bail matters and district courts…"
                  value={adv.bio} onChange={e => setA("bio", e.target.value)}
                  disabled={loading} />
                <span className="su-char-count">{adv.bio.length}/300</span>
              </div>
            </Field>

            <Field label="Profile Image" required error={advErr.avatarData}
              hint="Use a clear JPG, PNG, or WEBP image up to 2 MB">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="su-avatar-input"
                onChange={handleAvatarChange}
                disabled={loading}
              />
              {adv.avatarData && (
                <img
                  src={adv.avatarData}
                  alt="Profile preview"
                  className="su-avatar-preview"
                />
              )}
            </Field>

            <div className="su-form-section-title" style={{ marginTop: 8 }}>Security</div>

            <div className="su-grid-2">
              <Field label="Password" required error={advErr.password}>
                <Input icon="🔒" type={showPw ? "text" : "password"} placeholder="Min 6 characters"
                  value={adv.password} onChange={e => setA("password", e.target.value)}
                  error={advErr.password} disabled={loading}
                  rightEl={<button type="button" className="su-eye" onClick={() => setShowPw(p => !p)}>{showPw ? "🙈" : "👁️"}</button>} />
                <PwStrength pw={adv.password} />
              </Field>

              <Field label="Confirm Password" required error={advErr.confirmPw}>
                <Input icon="🔑" type={showCPw ? "text" : "password"} placeholder="Re-enter password"
                  value={adv.confirmPw} onChange={e => setA("confirmPw", e.target.value)}
                  error={advErr.confirmPw} disabled={loading}
                  rightEl={
                    adv.confirmPw && adv.password === adv.confirmPw
                      ? <span className="su-valid">✓</span>
                      : <button type="button" className="su-eye" onClick={() => setShowCPw(p => !p)}>{showCPw ? "🙈" : "👁️"}</button>
                  } />
              </Field>
            </div>

            {/* Advocate verification note */}
            <div className="su-verify-note">
              <span style={{ fontSize: 18 }}>🛡️</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 3 }}>Verification Process</div>
                <div style={{ fontSize: 12.5, color: "#1d4ed8", lineHeight: 1.6 }}>
                  Your Bar enrollment number will be verified by our admin team.
                  Once approved on the Admin page, clients can find you and send consultation requests directly.
                </div>
              </div>
            </div>

            <label className="su-agree">
              <input type="checkbox" checked={adv.agreeTerms} onChange={e => setA("agreeTerms", e.target.checked)} />
              <span>I agree to the <a href="/terms" target="_blank">Terms of Service</a>, <a href="/privacy" target="_blank">Privacy Policy</a> and <a href="/advocate-terms" target="_blank">Advocate Guidelines</a></span>
            </label>
            {advErr.agreeTerms && <p className="su-field-err">⚠ {advErr.agreeTerms}</p>}

            <button type="submit" className="su-btn-advocate su-btn-lg" disabled={loading}>
              {loading ? <><span className="su-spinner" /> Registering…</> : "Register as Advocate →"}
            </button>

            <p className="su-login-link">
              Already registered? <Link to="/login">Sign in here</Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}