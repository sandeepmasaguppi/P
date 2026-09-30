// ============================================================
//   AdvocateDashboard.js  —  Law4u Advocate Account Page
// ============================================================

import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./AdvocateDashboard.css";
import { getAdvocateById, logoutAdvocate, updateAdvocate } from "../data/Advocatesstore";
import BrandLogo from "../components/BrandLogo";
import { api, getAdvocateToken, assetUrl } from "../data/api";


const SESSION_KEY  = "law4u_advocate_id";
const REQUESTS_KEY = "law4u_requests";
const EARNINGS_OVERRIDES_KEY = "law4u_earnings_overrides";

function loadAllRequests() {
  try {
    const raw = localStorage.getItem(REQUESTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveAllRequests(all) {
  localStorage.setItem(REQUESTS_KEY, JSON.stringify(all));
}

function loadEarningsOverrides() {
  try {
    const raw = localStorage.getItem(EARNINGS_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveEarningsOverrides(all) {
  localStorage.setItem(EARNINGS_OVERRIDES_KEY, JSON.stringify(all));
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// Profile fields the store defines that clients actually see; used for the completeness tile.
const PROFILE_FIELDS = [
  { key: "avatar",    label: "Profile photo" },
  { key: "bio",       label: "Bio" },
  { key: "barId",     label: "Bar Council ID" },
  { key: "court",     label: "Court" },
  { key: "languages", label: "Languages" },
];

// `group` only affects the desktop sidebar headings; the mobile drawer ignores it.
const NAV_ITEMS = [
  { key: "dashboard", icon: "🏠", label: "Dashboard",       group: "Work" },
  { key: "requests",  icon: "📥", label: "Client Requests", group: "Work" },
  { key: "chat",      icon: "💬", label: "Chat",           group: "Work" },
  { key: "sessions",  icon: "📅", label: "My Sessions",     group: "Work" },
  { key: "cases",     icon: "⚖️", label: "My Cases",        group: "Work" },
  { key: "earnings",  icon: "💰", label: "Earnings",        group: "Work" },
  { key: "profile",   icon: "👤", label: "My Profile",      group: "Account" },
  { key: "settings",  icon: "⚙️", label: "Settings",        group: "Account" },
];

function StatusBadge({ status }) {
  const MAP = {
    pending:  { label: "Pending",  bg: "#fef3c7", c: "#92400e" },
    accepted: { label: "Accepted", bg: "#dcfce7", c: "#14532d" },
    declined: { label: "Declined", bg: "#fee2e2", c: "#7f1d1d" },
    "accepted status": { label: "Accepted Status", bg: "#dcfce7", c: "#14532d" },
  };
  const s = MAP[status] || MAP.pending;
  return <span className="ad-status-badge" style={{ background: s.bg, color: s.c }}>{s.label}</span>;
}

function RequestCard({ req, onAccept, onDecline, onSaveStage }) {
  const [caseStage, setCaseStage] = useState(req.caseStage || "Start Case");
  const [isEditing, setIsEditing] = useState(false);
  const [showSavedAlert, setShowSavedAlert] = useState(false);

  const handleSaveStage = () => {
    if (onSaveStage) onSaveStage(req.id, caseStage);
    setIsEditing(false);
    setShowSavedAlert(true);
    setTimeout(() => setShowSavedAlert(false), 3000);
  };

  return (
    <div className="ad-request-card">
      <div className="ad-request-top">
        <div className="ad-request-avatar">{req.clientName.split(" ").map(n => n[0]).join("").slice(0, 2)}</div>
        <div className="ad-request-info">
          <div className="ad-request-name">{req.clientName}</div>
          <div className="ad-request-meta">
            {req.clientCity ? `${req.clientCity} · ` : ""}{formatDate(req.requestedAt)}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <StatusBadge status={req.status} />
        </div>
      </div>

      {(req.clientPhone || req.clientEmail) && (
        <div className="ad-request-contact">
          {req.clientPhone && <span className="ad-request-contact-item">📱 {req.clientPhone}</span>}
          {req.clientEmail && <span className="ad-request-contact-item">✉️ {req.clientEmail}</span>}
        </div>
      )}

      <p className="ad-request-msg">{req.message}</p>

      {req.status === "pending" && (
        <div className="ad-request-actions">
          <button className="ad-btn-accept" onClick={() => onAccept(req.id)}>✓ Accept</button>
          <button className="ad-btn-decline" onClick={() => onDecline(req.id)}>✕ Decline</button>
        </div>
      )}

      {req.status === "accepted" && (
        <div className="ad-case-stage" style={{ marginTop: "12px" }}>
          {!isEditing ? (
            <div className="ad-saved-indicator" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {showSavedAlert && (
                <div className="ad-alert-banner">
                  <span>Successfully saved status!</span>
                  <button onClick={() => setShowSavedAlert(false)} className="ad-alert-close">×</button>
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                <span className={`ad-stage-pill ${(req.caseStage || caseStage).toLowerCase().replace(" ", "-")}`}>
                  ✓ Current Case Status: {req.caseStage || caseStage}
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{ background: "transparent", border: "1px solid #cbd5e1", borderRadius: "4px", padding: "2px 8px", cursor: "pointer", fontSize: "12px", color: "#475569" }}
                >
                  ✎ Edit Status
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <select
                value={caseStage}
                onChange={(e) => setCaseStage(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "13px" }}
              >
                <option value="Start Case">Start Case</option>
                <option value="Evidence Gathering">Evidence Gathering</option>
                <option value="Court Hearing">Court Hearing</option>
                <option value="Verdict / Completed">Verdict / Completed</option>
              </select>
              <button
                type="button"
                onClick={handleSaveStage}
                style={{ background: "#2563eb", color: "#fff", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => { setCaseStage(req.caseStage || "Start Case"); setIsEditing(false); }}
                style={{ background: "#f1f5f9", color: "#475569", border: "1px solid #cbd5e1", padding: "4px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Main Advocate dashboard component
export default function AdvocateDashboard() {
  // component state and memoized advocate record
  const navigate = useNavigate();
  const advocateId = Number(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 0);
  const [advocateVersion, setAdvocateVersion] = useState(0);
  const advocate = useMemo(() => (advocateId && advocateVersion >= 0 ? getAdvocateById(advocateId) : null), [advocateId, advocateVersion]);

  // UI state used across the dashboard
  const [ready] = useState(true);
  const [requests, setRequests] = useState([]);
  const [earningsOverrides, setEarningsOverrides] = useState({});
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [convMessages, setConvMessages] = useState([]);
  const [convInput, setConvInput] = useState("");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [editingEarningId, setEditingEarningId] = useState(null);
  const [editForm, setEditForm] = useState({ clientName: "", requestedAt: "", amount: "", paymentStatus: "Paid / Completed" });
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [profileForm, setProfileForm] = useState(null);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Initialize profile form when advocate loads or changes
  useEffect(() => {
    if (!advocate) return;
    setProfileForm({
      name: advocate.name || "",
      city: advocate.city || "",
      phone: advocate.phone || "",
      speciality: advocate.speciality || "",
      practiceArea: advocate.practiceArea || "",
      court: advocate.court || "",
      barCouncil: advocate.barCouncil || "",
      barId: advocate.barId || "",
      experience: advocate.experience || "",
      fee: advocate.fee || "",
      availability: advocate.availability || "",
      bio: advocate.bio || "",
      languages: Array.isArray(advocate.languages) ? advocate.languages.join(", ") : (advocate.languages || ""),
      avatarData: null,
    });
    setIsProfileEditing(false);
  }, [advocate]);

  useEffect(() => {
    const refreshFromCache = () => {
      setAdvocateVersion((v) => v + 1);
    };

    window.addEventListener("law4u_advocates_updated", refreshFromCache);
    return () => window.removeEventListener("law4u_advocates_updated", refreshFromCache);
  }, []);

  useEffect(() => {
    if (ready && advocate && advocate.status !== "approved") {
      logoutAdvocate();
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      navigate("/login");
    }
  }, [ready, advocate, navigate]);

  useEffect(() => {
    if (!advocateId) return;
    const refresh = () => {
      const all = loadAllRequests();
      const list = all[advocateId] || [];
      list.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
      setRequests(list);

      const allOverrides = loadEarningsOverrides();
      setEarningsOverrides(allOverrides[advocateId] || {});
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [advocateId]);

  // Load conversations for chat view: scan localStorage for keys chat_{clientId}_{advocateId}
  useEffect(() => {
    if (!advocateId) return;
    const buildList = () => {
      const list = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (!k || !k.startsWith("chat_")) continue;
          const parts = k.split("_");
          if (parts.length !== 3) continue;
          const clientId = Number(parts[1]);
          const advId = Number(parts[2]);
          if (advId !== Number(advocateId)) continue;
          const raw = localStorage.getItem(k);
          const msgs = raw ? JSON.parse(raw) : [];
          const last = msgs.length ? msgs[msgs.length - 1] : null;
          const clientName = msgs.find(m => m.clientName)?.clientName || null;
          // detect last admin reply timestamp (if any) to give priority
          let adminReplyAt = null;
          for (let j = msgs.length - 1; j >= 0; j--) {
            if (msgs[j] && msgs[j].from === "admin") { adminReplyAt = msgs[j].t; break; }
          }
          list.push({ clientId, key: k, lastMsg: last, clientName, adminReplyAt });
        }
      } catch (e) { /* ignore */ }
      return list;
    };

    const resolveNamesAndSet = async () => {
      let list = buildList();
      // prioritize conversations with admin replies, then by last message time desc
      const convCompare = (a, b) => {
        const aa = a.adminReplyAt ? new Date(a.adminReplyAt).getTime() : 0;
        const bb = b.adminReplyAt ? new Date(b.adminReplyAt).getTime() : 0;
        if (aa !== bb) return bb - aa; // more recent admin reply first
        const ta = a.lastMsg ? new Date(a.lastMsg.t).getTime() : 0;
        const tb = b.lastMsg ? new Date(b.lastMsg.t).getTime() : 0;
        return tb - ta;
      };
      list.sort(convCompare);

      // for any entry missing clientName, try fetching minimal public info from backend
      const missing = list.filter(l => !l.clientName);
      const token = getAdvocateToken();
      if (missing.length && token) {
        await Promise.all(missing.map(async (m) => {
          try {
            const c = await api(`/api/clients/${m.clientId}`, { token });
            if (c && c.name) m.clientName = c.name;
          } catch (err) { /* ignore fetch errors */ }
        }));
      }

      // fallback to generic label if still missing
      list = list.map(l => ({ ...l, clientName: l.clientName || `Client ${l.clientId}` }));
      setConversations(list);
    };

    resolveNamesAndSet();
  }, [advocateId]);

  // Update conversations when localStorage changes in another tab (client sends message)
  useEffect(() => {
    const handler = (e) => {
      if (!e.key || !e.key.startsWith("chat_")) return;
      // trigger re-scan
      try {
        // rebuild list and attempt to resolve missing names when the storage key changes
        const rebuild = () => {
          const list = [];
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || !k.startsWith("chat_")) continue;
            const parts = k.split("_");
            if (parts.length !== 3) continue;
            const clientId = Number(parts[1]);
            const advId = Number(parts[2]);
            if (advId !== Number(advocateId)) continue;
            const raw = localStorage.getItem(k);
            const msgs = raw ? JSON.parse(raw) : [];
              const last = msgs.length ? msgs[msgs.length - 1] : null;
              const clientName = msgs.find(m => m.clientName)?.clientName || null;
              let adminReplyAt = null;
              for (let j = msgs.length - 1; j >= 0; j--) {
                if (msgs[j] && msgs[j].from === "admin") { adminReplyAt = msgs[j].t; break; }
              }
              list.push({ clientId, key: k, lastMsg: last, clientName, adminReplyAt });
          }
          const convCompare = (a, b) => {
            const aa = a.adminReplyAt ? new Date(a.adminReplyAt).getTime() : 0;
            const bb = b.adminReplyAt ? new Date(b.adminReplyAt).getTime() : 0;
            if (aa !== bb) return bb - aa;
            const ta = a.lastMsg ? new Date(a.lastMsg.t).getTime() : 0;
            const tb = b.lastMsg ? new Date(b.lastMsg.t).getTime() : 0;
            return tb - ta;
          };
          list.sort(convCompare);
          return list;
        };

        const list = rebuild();
        const token = getAdvocateToken();
        // try resolving names for the changed/added key
        (async () => {
          const missing = list.filter(l => !l.clientName);
          if (missing.length && token) {
            await Promise.all(missing.map(async (m) => {
              try {
                const c = await api(`/api/clients/${m.clientId}`, { token });
                if (c && c.name) m.clientName = c.name;
              } catch (err) { /* ignore */ }
            }));
          }
          setConversations(list.map(l => ({ ...l, clientName: l.clientName || `Client ${l.clientId}` })));
          // if active conv updated key, refresh messages
          if (e.key === (activeConv && activeConv.key)) {
            const raw = localStorage.getItem(activeConv.key);
            setConvMessages(raw ? JSON.parse(raw) : []);
          }
        })();
      } catch (err) { /* ignore */ }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [advocateId, activeConv]);

  const updateRequestStatus = (reqId, status, extra = {}) => {
    const all = loadAllRequests();
    const list = (all[advocateId] || []).map(r => r.id === reqId ? { ...r, status, ...extra } : r);
    all[advocateId] = list;
    saveAllRequests(all);
    setRequests(list);
  };

  const saveCaseStage = (reqId, caseStage) => {
    updateRequestStatus(reqId, "accepted", { caseStage, isSaved: true });
  };

  const handleSaveEarningEdit = (reqId) => {
    const allOverrides = loadEarningsOverrides();
    const currentAdvOverrides = allOverrides[advocateId] || {};
    
    const updatedRecord = {
      clientName: editForm.clientName,
      requestedAt: editForm.requestedAt,
      amount: editForm.amount,
      paymentStatus: editForm.paymentStatus,
    };

    currentAdvOverrides[reqId] = updatedRecord;
    allOverrides[advocateId] = currentAdvOverrides;
    saveEarningsOverrides(allOverrides);
    setEarningsOverrides({ ...currentAdvOverrides });
    setEditingEarningId(null);
  };

  // Avatar file -> data URL
  const handleAvatarFileChange = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setProfileForm(prev => ({ ...(prev||{}), avatarData: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!advocateId || !profileForm) return;
    setProfileSaving(true);
    setProfileMsg("");
    try {
      const payload = {
        name: profileForm.name,
        city: profileForm.city,
        phone: profileForm.phone,
        speciality: profileForm.speciality,
        practiceArea: profileForm.practiceArea,
        court: profileForm.court,
        barCouncil: profileForm.barCouncil,
        barId: profileForm.barId,
        experience: profileForm.experience,
        fee: profileForm.fee,
        availability: profileForm.availability,
        bio: profileForm.bio,
        languages: profileForm.languages ? profileForm.languages.split(",").map(s => s.trim()).filter(Boolean) : [],
      };
      if (profileForm.avatarData) payload.avatarData = profileForm.avatarData;

      await updateAdvocate(advocateId, payload);
      setProfileMsg("Profile updated successfully");
      setAdvocateVersion(v => v + 1);
      // reflect returned values by reloading local form from cache (use getAdvocateById)
      const updated = getAdvocateById(advocateId);
      if (updated) {
        setProfileForm(prev => ({ ...prev, languages: Array.isArray(updated.languages) ? updated.languages.join(", ") : (updated.languages||"") }));
      }
    } catch (err) {
      setProfileMsg(err.message || "Save failed");
    } finally {
      setProfileSaving(false);
      setTimeout(() => setProfileMsg(""), 3000);
    }
  };

  const handleLogout = () => {
    logoutAdvocate();
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    navigate("/login");
  };

  const filteredRequests = requests.filter(r => {
    let matchesFilter = true;
    if (filter === "pending") matchesFilter = r.status === "pending";
    else if (filter === "accepted") matchesFilter = r.status === "accepted" && !r.isSaved;
    else if (filter === "declined") matchesFilter = r.status === "declined";
    else if (filter === "accepted status") matchesFilter = r.status === "accepted" && r.isSaved;

    const matchesSearch = r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.clientCity && r.clientCity.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  const acceptedRequests = useMemo(() => {
    return requests.filter(r => r.status === "accepted" || r.status === "accepted status");
  }, [requests]);

  if (!ready) return null;

  if (!advocate) {
    return (
      <div className="ad-page">
        <div className="ad-card ad-notfound">
          <h2>Account not found</h2>
          <p>We couldn't find an advocate profile for this session.</p>
          <button className="ad-btn-primary" onClick={handleLogout}>Back to Login</button>
        </div>
      </div>
    );
  }

  // Dashboard-tile helpers. Available by default unless explicitly marked unavailable.
  const isAvailable = !advocate.availability || (/available/i.test(advocate.availability) && !/not/i.test(advocate.availability));
  const profileDone = PROFILE_FIELDS.filter(f => Boolean(advocate[f.key])).length;

  const filterOptions = [
    { key: "all", label: "All Requests", icon: "📋" },
    { key: "pending", label: "Pending", icon: "⏳" },
    { key: "accepted", label: "Accepted", icon: "✅" },
    { key: "declined", label: "Declined", icon: "❌" },
    { key: "accepted status", label: "Accepted Status", icon: "📂" },
  ];

  return (
    <div className="ad-page" onClick={() => setActiveMenuId(null)}>
      {/* ── Top Bar ── */}
      <div className="ad-topbar">
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button className="ad-hamburger-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open Menu">
            ☰
          </button>
          <Link to="/" className="ad-logo">
            <BrandLogo size={32} />
          </Link>
        </div>
        <div className="ad-topbar-actions">
          {activeNav !== "dashboard" ? (
            <button className="ad-site-btn" onClick={() => setActiveNav("dashboard")}>← Back</button>
          ) : (
            <Link to="/" className="ad-site-btn">Go to Site</Link>
          )}
          <button className="ad-logout-btn" onClick={handleLogout}>Logout ↩</button>
        </div>
      </div>

      {/* ── Mobile Drawer Overlay ── */}
      {mobileMenuOpen && (
        <div className="ad-drawer-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="ad-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="ad-drawer-header">
              <h3>Navigation Menu</h3>
              <button className="ad-drawer-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>
            <div className="ad-drawer-body">
              <nav className="ad-drawer-nav-list">
                {NAV_ITEMS.map(item => (
                  <button
                    key={item.key}
                    className={`ad-drawer-nav-item ${activeNav === item.key ? "active" : ""}`}
                    onClick={() => { setActiveNav(item.key); setMobileMenuOpen(false); }}
                  >
                    <span>{item.icon}</span> {item.label}
                    {item.key === "requests" && pendingCount > 0 && (
                      <span className="ad-badge-count">{pendingCount}</span>
                    )}
                  </button>
                ))}
              </nav>
              <hr className="ad-divider" />
              <button className="ad-drawer-logout" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
                Logout ↩
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dashboard Layout ── */}
      <div className="ad-dashboard-layout">
        
        {/* Left Sidebar Navigation (Desktop) */}
        <aside className="ad-sidebar-nav">
          <nav className="ad-sidebar-menu">
            {NAV_ITEMS.map((item, index) => (
              <div key={item.key} className="ad-sidebar-item">
                {(index === 0 || NAV_ITEMS[index - 1].group !== item.group) && (
                  <div className="ad-sidebar-group">{item.group}</div>
                )}
                <button
                  onClick={() => setActiveNav(item.key)}
                  className={`ad-sidebar-link ${activeNav === item.key ? "active" : ""}`}
                >
                  <span className="ad-link-icon">{item.icon}</span>
                  <span className="ad-link-label">{item.label}</span>
                  {item.key === "requests" && pendingCount > 0 && (
                    <span className="ad-badge-count">{pendingCount}</span>
                  )}
                </button>
              </div>
            ))}
          </nav>

          <div className="ad-sidebar-user-brief">
            <div className="ad-sidebar-avatar">
              {advocate.name.replace("Adv. ", "").split(" ").map(n => n[0]).join("")}
            </div>
            <div className="ad-sidebar-user-text">
              <div className="ad-sidebar-name">{advocate.name}</div>
              <div className="ad-sidebar-role">
                <i className={`ad-sidebar-dot ${isAvailable ? "on" : ""}`} />
                {advocate.availability && !/not/i.test(advocate.availability) ? advocate.availability : "Available"}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="ad-container">
          
          {/* VIEW: DASHBOARD */}
          {activeNav === "dashboard" && (
            <div className="ad-fade-in">
              <div className="ad-bento">
                {/* Identity tile */}
                <div className="ad-tile ad-tile-id">
                  <div className="ad-tile-id-top">
                    <div className="ad-avatar ad-tile-avatar" style={{ background: advocate.avatar ? "transparent" : "#14b8a6" }}>
                      {advocate.avatar ? (
                        <img src={advocate.avatar} alt={advocate.name} className="ad-avatar-img" />
                      ) : (
                        advocate.name.replace("Adv. ", "").split(" ").map(n => n[0]).join("")
                      )}
                    </div>
                    <div className="ad-rating-pill ad-tile-rating">⭐ {advocate.rating}</div>
                  </div>
                  <h1 className="ad-tile-name">{advocate.name}</h1>
                  <p className="ad-tile-sub">{advocate.speciality} · {advocate.city}</p>
                  {advocate.bio && advocate.bio.length > 3 && <p className="ad-tile-bio">{advocate.bio}</p>}
                  <div className="ad-tile-id-bottom">
                    <span className={`ad-avail-pill ${isAvailable ? "on" : ""}`}>
                      <i /> {advocate.availability && !/not/i.test(advocate.availability) ? advocate.availability : "Available"}
                    </span>
                    {!isAvailable && <span className="ad-tile-hint">Currently unavailable for bookings</span>}
                  </div>
                </div>

                <div className="ad-tile"><div className="ad-tile-label">Cases handled</div><div className="ad-tile-value">{advocate.cases}</div></div>
                <div className="ad-tile"><div className="ad-tile-label">Experience</div><div className="ad-tile-value">{advocate.experience}</div></div>
                <div className="ad-tile"><div className="ad-tile-label">Fee</div><div className="ad-tile-value">{advocate.fee} <small>/ session</small></div></div>
                <div className="ad-tile ad-tile-click" onClick={() => setActiveNav("requests")} role="button" tabIndex={0}>
                  <div className="ad-tile-label">Pending requests</div>
                  <div className={`ad-tile-value ${pendingCount > 0 ? "warn" : ""}`}>{pendingCount}</div>
                </div>
                <div className="ad-tile ad-tile-click" onClick={() => setActiveNav("cases")} role="button" tabIndex={0}>
                  <div className="ad-tile-label">Accepted clients</div>
                  <div className="ad-tile-value">{acceptedRequests.length}</div>
                </div>
                <div className="ad-tile"><div className="ad-tile-label">Rating</div><div className="ad-tile-value">{Number(advocate.rating) > 0 ? advocate.rating : "—"} <small>{Number(advocate.rating) > 0 ? "" : "no reviews"}</small></div></div>

                {/* Upcoming sessions: latest accepted requests */}
                <div className="ad-tile ad-tile-wide ad-tile-tall">
                  <div className="ad-tile-head">
                    <span className="ad-tile-label">Upcoming sessions</span>
                    {acceptedRequests.length > 0 && (
                      <button className="ad-tile-link" onClick={() => setActiveNav("sessions")}>View all</button>
                    )}
                  </div>
                  {acceptedRequests.length === 0 ? (
                    <div className="ad-tile-empty">
                      No sessions yet. Accept a client request and it appears here with the client, date and note.
                    </div>
                  ) : (
                    <ul className="ad-tile-list">
                      {acceptedRequests.slice(0, 3).map(req => {
                        const override = earningsOverrides[req.id] || {};
                        return (
                          <li key={req.id}>
                            <div>
                              <b>{override.clientName || req.clientName}</b>
                              <span>{req.clientCity ? `${req.clientCity} · ` : ""}{formatDate(override.requestedAt || req.requestedAt)}</span>
                            </div>
                            <span className={`ad-stage-pill ${(req.caseStage || "Start Case").toLowerCase().replace(" ", "-")}`}>
                              {req.caseStage || "Start Case"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                {/* Profile completeness, derived from the fields the store defines */}
                <div className="ad-tile ad-tile-tall ad-tile-span2">
                  <div className="ad-tile-head">
                    <span className="ad-tile-label">Finish your profile</span>
                    <span className="ad-tile-meta">{profileDone}/{PROFILE_FIELDS.length}</span>
                  </div>
                  <ul className="ad-tile-checks">
                    {PROFILE_FIELDS.map(f => {
                      const ok = Boolean(advocate[f.key]);
                      return (
                        <li key={f.key}>
                          <span>{f.label}</span>
                          <b className={ok ? "ok" : "todo"}>{ok ? "Done" : "Add"}</b>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="ad-tile-progress"><div style={{ width: `${(profileDone / PROFILE_FIELDS.length) * 100}%` }} /></div>
                </div>

                {/* Latest pending requests */}
                <div className="ad-tile ad-tile-wide">
                  <div className="ad-tile-head">
                    <span className="ad-tile-label">Recent requests</span>
                    <button className="ad-tile-link" onClick={() => setActiveNav("requests")}>Open inbox</button>
                  </div>
                  {pendingCount === 0 ? (
                    <div className="ad-tile-empty">Nothing waiting. New client requests will show here first.</div>
                  ) : (
                    <ul className="ad-tile-list">
                      {requests.filter(r => r.status === "pending").slice(0, 3).map(req => (
                        <li key={req.id}>
                          <div>
                            <b>{req.clientName}</b>
                            <span>{req.clientCity ? `${req.clientCity} · ` : ""}{formatDate(req.requestedAt)}</span>
                          </div>
                          <StatusBadge status={req.status} />
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="ad-tile ad-tile-span2">
                  <div className="ad-tile-label">Quick actions</div>
                  <div className="ad-tile-actions">
                    <button className="ad-btn-secondary" onClick={() => setActiveNav("profile")}>Edit profile</button>
                    <button className="ad-btn-secondary" onClick={() => setActiveNav("earnings")}>Earnings</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: CLIENT REQUESTS */}
          {activeNav === "requests" && (
            <div className="ad-fade-in">
              <div className="ad-card ad-requests-card">
                <div className="ad-requests-header">
                  <h2>Client Connection Requests</h2>
                  <div className="ad-filter-pills">
                    {filterOptions.map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`ad-pill-btn ${filter === f.key ? "active" : ""}`}
                      >
                        {f.icon} {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <input
                    type="text"
                    placeholder="🔍 Search client by name or city..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="ad-search-input"
                  />
                </div>

                {filteredRequests.length === 0 ? (
                  <div className="ad-empty">
                    {requests.length === 0
                      ? "No consultation requests yet."
                      : "No matching client requests found for this filter."}
                  </div>
                ) : (
                  <div className="ad-requests-list">
                    {filteredRequests.map(req => (
                      <RequestCard
                        key={req.id}
                        req={req}
                        onAccept={(id) => updateRequestStatus(id, "accepted")}
                        onDecline={(id) => updateRequestStatus(id, "declined")}
                        onSaveStage={saveCaseStage}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: MY SESSIONS */}
          {activeNav === "sessions" && (
            <div className="ad-fade-in">
              <div className="ad-card">
                <h2>📅 My Sessions / Consultations</h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px", marginBottom: "20px" }}>
                  Scheduled attendance dates and consultation slots for clients whose requests you have accepted.
                </p>

                {acceptedRequests.length === 0 ? (
                  <div className="ad-empty">No active consultation sessions found. Accept client connection requests to populate sessions.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {acceptedRequests.map(req => {
                      const override = earningsOverrides[req.id] || {};
                      const displayName = override.clientName || req.clientName;
                      const displayDate = override.requestedAt || req.requestedAt;

                      return (
                        <div key={req.id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
                            <div>
                              <h3 style={{ fontSize: "16px", color: "#0f172a" }}>{displayName}</h3>
                              <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                                {req.clientPhone ? `📱 ${req.clientPhone} ` : ""} {req.clientEmail ? `| ✉️ ${req.clientEmail}` : ""}
                              </p>
                            </div>
                            <span style={{ background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: "600" }}>
                              Requested Date: {formatDate(displayDate)}
                            </span>
                          </div>
                          <p style={{ fontSize: "14px", color: "#334155", marginTop: "10px", background: "#ffffff", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0" }}>
                            <strong>Note:</strong> {req.message}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: CHAT */}
          {activeNav === "chat" && (
            <div className="ad-fade-in ad-chat-shell">
              <aside className="ad-chat-contacts">
                <div className="ad-chat-contacts-header">
                  <h2>Chats</h2>
                </div>
                <div className="ad-chat-list">
                  {conversations.length === 0 && <div className="ad-empty">No chats yet — clients will appear here when they message.</div>}
                  {conversations.map(conv => (
                    <button
                      key={conv.key}
                      className={`ad-chat-item ${activeConv && activeConv.key === conv.key ? "active" : ""}`}
                      onClick={() => {
                        setActiveConv(conv);
                        const raw = localStorage.getItem(conv.key);
                        setConvMessages(raw ? JSON.parse(raw) : []);
                      }}
                    >
                      <div className="ad-chat-item-avatar">
                        {(conv.clientName || "").split(" ").map(s => s[0]).slice(0, 2).join("")}
                      </div>
                      <div className="ad-chat-item-meta">
                        <div className="ad-chat-item-row">
                          <span className="ad-chat-name">{conv.clientName}</span>
                          <span className="ad-chat-time">
                            {conv.lastMsg ? new Date(conv.lastMsg.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                          </span>
                        </div>
                        <div className="ad-chat-snippet">
                          {conv.lastMsg ? conv.lastMsg.text.slice(0, 60) : "Start conversation"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </aside>

              <section className="ad-conversation-panel">
                {!activeConv ? (
                  <div className="ad-empty ad-empty-chat">Select a conversation to view messages.</div>
                ) : (
                  <>
                    <div className="ad-conversation-header">
                      <div className="ad-chat-item-avatar ad-chat-header-avatar">
                        {(activeConv.clientName || "").split(" ").map(s => s[0]).slice(0, 2).join("")}
                      </div>
                      <div className="ad-conversation-header-text">
                        <div className="ad-conversation-title">{activeConv.clientName}</div>
                        <div className="ad-conversation-subtitle">Client ID: {activeConv.clientId}</div>
                      </div>
                    </div>

                    <div className="ad-conversation-body">
                      {convMessages.length === 0 ? (
                        <div className="ad-empty ad-empty-chat">No messages yet. Reply to start.</div>
                      ) : (
                        convMessages.map((m, i) => (
                          <div key={i} className={`ad-message-row ${m.from === "advocate" ? "outgoing" : "incoming"}`}>
                            <div className={`ad-message-bubble ${m.from === "advocate" ? "outgoing" : "incoming"}`}>
                              {m.text}
                              <div className="ad-message-time">{new Date(m.t).toLocaleString()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="ad-message-composer">
                      <input
                        value={convInput}
                        onChange={(e) => setConvInput(e.target.value)}
                        placeholder={`Message ${activeConv.clientName}…`}
                        className="ad-chat-input"
                      />
                      <button
                        className="ad-chat-send-btn"
                        onClick={() => {
                          if (!convInput.trim()) return;
                          const k = activeConv.key;
                          const raw = localStorage.getItem(k);
                          const msgs = raw ? JSON.parse(raw) : [];
                          const next = [...msgs, { from: "advocate", text: convInput.trim(), t: new Date().toISOString() }];
                          localStorage.setItem(k, JSON.stringify(next));
                          setConvMessages(next);
                          setConvInput("");
                          setConversations(prev => prev.map(p => p.key === k ? { ...p, lastMsg: next[next.length - 1] } : p));
                        }}
                      >
                        Send
                      </button>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}

          {/* VIEW: MY CASES */}
          {activeNav === "cases" && (
            <div className="ad-fade-in">
              <div className="ad-card">
                <h2>⚖️ My Cases Tracker</h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px", marginBottom: "20px" }}>
                  All accepted client profiles and their respective progress stages.
                </p>

                {acceptedRequests.length === 0 ? (
                  <div className="ad-empty">No active cases found. Accept requests to start tracking cases.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {acceptedRequests.map(req => {
                      const override = earningsOverrides[req.id] || {};
                      const displayName = override.clientName || req.clientName;
                      const displayDate = override.requestedAt || req.requestedAt;

                      return (
                        <div key={req.id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "8px", background: "#f8fafc", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                          <div>
                            <h3 style={{ fontSize: "16px", color: "#0f172a" }}>{displayName}</h3>
                            <p style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                              Location: {req.clientCity || "Not Specified"} · Booking Date: {formatDate(displayDate)}
                            </p>
                          </div>
                          <div>
                            <span className={`ad-stage-pill ${(req.caseStage || "Start Case").toLowerCase().replace(" ", "-")}`}>
                              Status: {req.caseStage || "Start Case"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: EARNINGS */}
          {activeNav === "earnings" && (
            <div className="ad-fade-in">
              <div className="ad-card">
                <h2>💰 Earnings & Consultation Fees</h2>
                <p style={{ color: "#64748b", fontSize: "14px", marginTop: "4px", marginBottom: "20px" }}>
                  Ledger of accepted clients and consultation fees. Click the 3 dots on any row to edit client details, date, custom amount, or payment status.
                </p>

                {acceptedRequests.length === 0 ? (
                  <div className="ad-empty">No earnings data available yet.</div>
                ) : (
                  <div style={{ overflowX: "auto", overflowY: "visible" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                      <thead>
                        <tr style={{ background: "#f1f5f9", color: "#475569", borderBottom: "1px solid #cbd5e1" }}>
                          <th style={{ padding: "12px" }}>Client Name</th>
                          <th style={{ padding: "12px" }}>Date Accepted</th>
                          <th style={{ padding: "12px" }}>Consultation Fee</th>
                          <th style={{ padding: "12px" }}>Payment Status</th>
                          <th style={{ padding: "12px", textAlign: "center" }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {acceptedRequests.map(req => {
                          const override = earningsOverrides[req.id] || {};
                          const displayName = override.clientName !== undefined ? override.clientName : req.clientName;
                          const displayDate = override.requestedAt !== undefined ? override.requestedAt : req.requestedAt;
                          const displayAmount = override.amount !== undefined && override.amount !== "" ? override.amount : advocate.fee;
                          const displayStatus = override.paymentStatus !== undefined ? override.paymentStatus : "Paid / Completed";

                          const isEditingRow = editingEarningId === req.id;

                          return (
                            <tr key={req.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                              {isEditingRow ? (
                                <>
                                  <td style={{ padding: "10px" }}>
                                    <input
                                      type="text"
                                      value={editForm.clientName}
                                      onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                                      style={{ padding: "6px", width: "100%", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px" }}>
                                    <input
                                      type="date"
                                      value={editForm.requestedAt ? editForm.requestedAt.split("T")[0] : ""}
                                      onChange={(e) => setEditForm({ ...editForm, requestedAt: e.target.value })}
                                      style={{ padding: "6px", width: "100%", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px" }}>
                                    <input
                                      type="text"
                                      value={editForm.amount}
                                      placeholder="e.g. ₹2,500"
                                      onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                                      style={{ padding: "6px", width: "100%", borderRadius: "4px", border: "1px solid #cbd5e1", fontWeight: "600", color: "#2563eb" }}
                                    />
                                  </td>
                                  <td style={{ padding: "10px" }}>
                                    <select
                                      value={editForm.paymentStatus}
                                      onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                                      style={{ padding: "6px", width: "100%", borderRadius: "4px", border: "1px solid #cbd5e1" }}
                                    >
                                      <option value="Paid / Completed">Paid / Completed</option>
                                      <option value="Pending">Pending</option>
                                      <option value="Failed">Failed</option>
                                    </select>
                                  </td>
                                  <td style={{ padding: "10px", textAlign: "center" }}>
                                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                                      <button
                                        onClick={() => handleSaveEarningEdit(req.id)}
                                        style={{ background: "#2563eb", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontWeight: "600", fontSize: "12px" }}
                                      >
                                        Save
                                      </button>
                                      <button
                                        onClick={() => setEditingEarningId(null)}
                                        style={{ background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "6px 8px", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td style={{ padding: "12px", fontWeight: "600", color: "#0f172a" }}>{displayName}</td>
                                  <td style={{ padding: "12px", color: "#64748b" }}>{formatDate(displayDate)}</td>
                                  <td style={{ padding: "12px", fontWeight: "600", color: "#2563eb" }}>{displayAmount}</td>
                                  <td style={{ padding: "12px" }}>
                                    <span style={{ 
                                      background: displayStatus === "Paid / Completed" ? "#dcfce7" : displayStatus === "Pending" ? "#fef3c7" : "#fee2e2", 
                                      color: displayStatus === "Paid / Completed" ? "#166534" : displayStatus === "Pending" ? "#92400e" : "#991b1b", 
                                      padding: "4px 8px", 
                                      borderRadius: "4px", 
                                      fontSize: "12px", 
                                      fontWeight: "600" 
                                    }}>
                                      {displayStatus}
                                    </span>
                                  </td>
                                  <td style={{ padding: "12px", textAlign: "center", position: "relative" }}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveMenuId(activeMenuId === req.id ? null : req.id);
                                      }}
                                      style={{ background: "transparent", border: "none", cursor: "pointer", fontSize: "18px", fontWeight: "bold", color: "#64748b", padding: "4px 8px" }}
                                    >
                                      ⋮
                                    </button>

                                    {activeMenuId === req.id && (
                                      <div style={{
                                        position: "absolute",
                                        right: "20px",
                                        top: "40px",
                                        background: "#ffffff",
                                        border: "1px solid #cbd5e1",
                                        borderRadius: "6px",
                                        boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                                        zIndex: 10,
                                        width: "140px",
                                        textAlign: "left"
                                      }}>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingEarningId(req.id);
                                            setEditForm({
                                              clientName: displayName,
                                              requestedAt: displayDate,
                                              amount: displayAmount,
                                              paymentStatus: displayStatus,
                                            });
                                            setActiveMenuId(null);
                                          }}
                                          style={{
                                            background: "none",
                                            border: "none",
                                            padding: "8px 12px",
                                            width: "100%",
                                            textAlign: "left",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                            color: "#1e293b",
                                            fontWeight: "500"
                                          }}
                                        >
                                          ✎ Edit Record
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: PROFILE */}
          {activeNav === "profile" && (
            <div className="ad-fade-in">
              <div className="ad-card" style={{ padding: "24px" }}>
                <h2 style={{ marginTop: 0 }}>My Profile</h2>
                <p style={{ color: "#64748b", marginTop: "4px" }}>Update your public profile. Click Save to persist changes.</p>

                {!profileForm ? (
                  <div className="ad-empty" style={{ marginTop: 20 }}>Loading profile…</div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 16 }}>
                    <div style={{ gridColumn: "1 / 2", display: "flex", flexDirection: "column", gap: 8 }}>
                      <label className="ad-label">Full name</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} />

                      <label className="ad-label">City</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.city} onChange={e => setProfileForm({...profileForm, city: e.target.value})} />

                      <label className="ad-label">Phone</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} />

                      <label className="ad-label">Speciality</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.speciality} onChange={e => setProfileForm({...profileForm, speciality: e.target.value})} />

                      <label className="ad-label">Practice area</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.practiceArea} onChange={e => setProfileForm({...profileForm, practiceArea: e.target.value})} />

                      <label className="ad-label">Court</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.court} onChange={e => setProfileForm({...profileForm, court: e.target.value})} />

                      <label className="ad-label">Bar Council</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.barCouncil} onChange={e => setProfileForm({...profileForm, barCouncil: e.target.value})} />

                      <label className="ad-label">Bar ID</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.barId} onChange={e => setProfileForm({...profileForm, barId: e.target.value})} />
                    </div>

                    <div style={{ gridColumn: "2 / 3", display: "flex", flexDirection: "column", gap: 8 }}>
                      <label className="ad-label">Experience</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.experience} onChange={e => setProfileForm({...profileForm, experience: e.target.value})} />

                      <label className="ad-label">Fee</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.fee} onChange={e => setProfileForm({...profileForm, fee: e.target.value})} />

                      <label className="ad-label">Availability</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.availability} onChange={e => setProfileForm({...profileForm, availability: e.target.value})} />

                      <label className="ad-label">Languages (comma separated)</label>
                      <input className="ad-input" disabled={!isProfileEditing} value={profileForm.languages} onChange={e => setProfileForm({...profileForm, languages: e.target.value})} />

                      <label className="ad-label">Bio</label>
                      <textarea className="ad-input" rows={6} disabled={!isProfileEditing} value={profileForm.bio} onChange={e => setProfileForm({...profileForm, bio: e.target.value})} />

                      <label className="ad-label">Profile photo</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="file" accept="image/*" disabled={!isProfileEditing} onChange={(e) => handleAvatarFileChange(e.target.files && e.target.files[0])} />
                        {profileForm.avatarData ? (
                          <img src={profileForm.avatarData} alt="preview" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                        ) : (advocate && advocate.avatar) ? (
                          <img src={assetUrl ? assetUrl(advocate.avatar) : advocate.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          <div style={{ width: 64, height: 64, borderRadius: 8, background: "#e6eef8", display: "flex", alignItems: "center", justifyContent: "center" }}>{(advocate?.name || "").split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
                        <button
                          className="ad-btn-primary"
                          onClick={async () => {
                            if (!isProfileEditing) { setIsProfileEditing(true); return; }
                            await handleSaveProfile();
                            setIsProfileEditing(false);
                          }}
                          disabled={profileSaving}
                        >
                          {isProfileEditing ? (profileSaving ? "Saving…" : "Save") : "Edit Profile"}
                        </button>

                        {isProfileEditing ? (
                          <button className="ad-btn-secondary" onClick={() => {
                            // revert local edits
                            setProfileForm({
                              name: advocate.name || "",
                              city: advocate.city || "",
                              phone: advocate.phone || "",
                              speciality: advocate.speciality || "",
                              practiceArea: advocate.practiceArea || "",
                              court: advocate.court || "",
                              barCouncil: advocate.barCouncil || "",
                              barId: advocate.barId || "",
                              experience: advocate.experience || "",
                              fee: advocate.fee || "",
                              availability: advocate.availability || "",
                              bio: advocate.bio || "",
                              languages: Array.isArray(advocate.languages) ? advocate.languages.join(", ") : (advocate.languages || ""),
                              avatarData: null,
                            });
                            setIsProfileEditing(false);
                          }}>Cancel</button>
                        ) : (
                          <button className="ad-btn-secondary" onClick={() => setActiveNav("dashboard")}>Return to Dashboard</button>
                        )}
                      </div>
                      {profileMsg && <div style={{ marginTop: 8, color: profileMsg.includes("failed") ? "#991b1b" : "#166534" }}>{profileMsg}</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {activeNav === "settings" && (
            <div className="ad-fade-in">
              <div className="ad-card" style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>
                  {NAV_ITEMS.find(n => n.key === activeNav)?.icon}
                </div>
                <h2>{NAV_ITEMS.find(n => n.key === activeNav)?.label}</h2>
                <p style={{ color: "#64748b", marginTop: "8px" }}>
                  Configuration settings and profile updates for your advocate account.
                </p>
                <button className="ad-btn-primary" style={{ marginTop: "20px" }} onClick={() => setActiveNav("dashboard")}>
                  Return to Dashboard
                </button>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}