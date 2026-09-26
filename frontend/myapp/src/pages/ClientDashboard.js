import React, { useState, useMemo, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAdvocates, getAdvocateRatingSummary, setAdvocateRating } from "../data/Advocatesstore";
import { assetUrl } from "../data/api";
import "./ClientDashboard.css";

const SESSION_KEY = "law4u_client_id";
const CLIENT_OBJ_KEY = "law4u_client";
const CLIENT_TOKEN_KEY = "law4u_client_token";

function ChatBubble({ from, text }) {
  return (
    <div style={{ display: "flex", justifyContent: from === "client" ? "flex-end" : "flex-start", margin: "6px 0" }}>
      <div style={{ background: from === "client" ? "#2563eb" : "#f1f5f9", color: from === "client" ? "#fff" : "#111827", padding: "8px 12px", borderRadius: 14, maxWidth: 460 }}>
        {text}
      </div>
    </div>
  );
}

export default function ClientDashboard() {
  const navigate = useNavigate();
  const clientId = Number(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 0);
  const advocates = useMemo(() => getAdvocates().filter(a => a.status === "approved"), []);
  const [search, setSearch] = useState("");
  const filteredAdvocates = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return advocates;
    return advocates.filter(a => {
      const name = (a.name || "").toLowerCase();
      const city = (a.city || "").toLowerCase();
      const speciality = ((a.speciality || a.practiceArea) || "").toLowerCase();
      return name.includes(q) || city.includes(q) || speciality.includes(q);
    });
  }, [advocates, search]);
  const [messagesVersion, setMessagesVersion] = useState(0);
  const [since, setSince] = useState(""); // ISO string from datetime-local

  // displayedAdvocates: sort filtered advocates so those with recent messages appear first
  const displayedAdvocates = useMemo(() => {
    try {
      const scores = {};
      if (clientId) {
        filteredAdvocates.forEach(a => {
          const key = `chat_${clientId}_${a.id}`;
          const raw = localStorage.getItem(key);
          if (!raw) { scores[a.id] = 0; return; }
          try {
            const msgs = JSON.parse(raw);
            const last = msgs.length ? msgs[msgs.length - 1] : null;
            scores[a.id] = last && last.t ? new Date(last.t).getTime() : 0;
          } catch { scores[a.id] = 0; }
        });
      }
      // apply "since" filter if provided
      const threshold = since ? (new Date(since)).getTime() : 0;
      return [...filteredAdvocates]
        .map(a => ({ a, t: scores[a.id] || 0 }))
        .filter(x => (threshold ? x.t >= threshold : true))
        .sort((x, y) => {
          if (x.t !== y.t) return y.t - x.t; // recent messages first
          return (x.a.name || "").localeCompare(y.a.name || "");
        })
        .map(x => x.a);
    } catch (e) { return filteredAdvocates; }
  }, [filteredAdvocates, clientId, messagesVersion]);
  const [selected, setSelected] = useState(advocates[0] || null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [ratingMessage, setRatingMessage] = useState("");

  const selectedRating = useMemo(() => {
    if (!selected) return { rating: 0, count: 0, votes: {} };
    return getAdvocateRatingSummary(selected.id);
  }, [selected, messagesVersion, advocates]);

  useEffect(() => {
    if (!selected) return;
    const key = `chat_${clientId}_${selected.id}`;
    const raw = localStorage.getItem(key);
    setMessages(raw ? JSON.parse(raw) : []);
  }, [selected, clientId]);

  // listen for storage changes (advocate replies from other tab) and refresh ordering/messages
  useEffect(() => {
    const handler = (e) => {
      if (!e.key) return;
      if (!e.key.startsWith(`chat_${clientId}_`)) return;
      try {
        // if the changed key is the currently selected advocate, refresh messages
        if (selected && e.key === `chat_${clientId}_${selected.id}`) {
          const raw = localStorage.getItem(e.key);
          setMessages(raw ? JSON.parse(raw) : []);
        }
      } catch (err) { /* ignore */ }
      // bump version so displayedAdvocates recomputes and reorders list
      setMessagesVersion(v => v + 1);
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [clientId, selected]);

  // read client object (saved at login)
  const clientObj = useMemo(() => {
    try {
      const raw = localStorage.getItem(CLIENT_OBJ_KEY) || sessionStorage.getItem(CLIENT_OBJ_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const sendMessage = () => {
    if (!message.trim() || !selected) return;
    const key = `chat_${clientId}_${selected.id}`;
    const next = [...messages, { from: "client", text: message.trim(), t: new Date().toISOString(), clientName: clientObj?.name || undefined }];
    localStorage.setItem(key, JSON.stringify(next));
    setMessages(next);
    setMessage("");
    // Placeholder: no backend push. Advocate replies can be handled by storing to same key.
  };

  const handleRatingSubmit = (score) => {
    if (!selected || !clientId) return;
    const summary = setAdvocateRating(selected.id, clientId, score);
    setSelected(prev => prev ? { ...prev, rating: summary.rating, ratingCount: summary.count } : prev);
    setRatingMessage(`Thank you! You rated ${selected.name} ${score}/5.`);
    setTimeout(() => setRatingMessage(""), 2500);
    setMessagesVersion(v => v + 1);
  };

  const handleLogout = () => {
    try {
      // clear client session
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CLIENT_OBJ_KEY);
      sessionStorage.removeItem(CLIENT_OBJ_KEY);
      localStorage.removeItem(CLIENT_TOKEN_KEY);
      sessionStorage.removeItem(CLIENT_TOKEN_KEY);
    } catch (e) { /* ignore */ }
    navigate('/client-login');
  };

  // Validate stored token with backend; if invalid (e.g. password reset), force logout
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem(CLIENT_TOKEN_KEY) || sessionStorage.getItem(CLIENT_TOKEN_KEY);
        if (!token) return; // no token to validate
        const res = await fetch(`/api/auth/me`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          // Only force logout when server explicitly reports session expiration
          if (res.status === 401 && (err.error === "Session expired" || /expired/i.test(String(err.error || err.message || "")))) {
            handleLogout();
          }
        } else {
          const data = await res.json().catch(() => null);
          // If backend returns a different client id, also logout
          if (!data || data.role !== 'client' || Number(data.client.id) !== Number(clientId)) handleLogout();
        }
      } catch (err) {
        // network issues: don't auto-logout
      }
    })();
  }, []);

  if (!clientId) {
    return (
      <div style={{ padding: 40 }}>
        <h2>Please sign in as a client</h2>
        <p>
          <Link to="/client-login">Go to Client Login</Link> to access your dashboard and chat with advocates.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="wa-top-band" />
      <div className="wa-app-shell" style={{ top: 0 }}>
      <aside className="wa-sidebar">
        <div className="wa-sidebar-top">
          <div className="wa-client-profile">
            <div className="wa-client-avatar">{(clientObj?.name||"C").split(" ").map(s=>s[0]).slice(0,2).join("")}</div>
            <div className="wa-client-info">
              <div className="wa-client-name">{clientObj?.name || "Client"}</div>
              <div className="wa-client-role">Client Dashboard</div>
            </div>
          </div>
          <div className="wa-top-actions">
            <button className="wa-action-btn" onClick={handleLogout} title="Logout">Logout</button>
          </div>
        </div>

        <div className="wa-search-section">
          <div className="wa-search-input-box">
            <span className="wa-search-glyph">🔍</span>
            <input
              placeholder="Search advocates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const first = displayedAdvocates[0];
                  if (first) setSelected(first);
                }
              }}
            />
          </div>

          <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>

          </div>
        </div>

        <div className="wa-advocates-list">
          {displayedAdvocates.length === 0 && <div className="wa-empty-list">No advocates match your search.</div>}
          {displayedAdvocates.map((a) => (
            <div key={a.id} onClick={() => { setSelected(a); setProfileOpen(true); }} className={`wa-advocate-row ${selected && selected.id === a.id ? "selected" : ""}`}>
              <div className="wa-avatar-box">
                {a.avatar ? (
                  <img src={assetUrl ? assetUrl(a.avatar) : a.avatar} alt={a.name} className="wa-avatar-img" />
                ) : (
                  <div className="wa-avatar-fallback">{(a.name || "").split(" ").map(s => s[0]).slice(0,2).join("")}</div>
                )}
              </div>
              <div className="wa-advocate-meta">
                <div className="wa-meta-header">
                  <div className="wa-advocate-title">{a.name}</div>
                  <div className="wa-meta-time">{a.city}</div>
                </div>
                <div className="wa-meta-sub">
                  <div className="wa-advocate-desc">{a.speciality || a.practiceArea}</div>
                  <div className="wa-advocate-fee-chip">{a.fee}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {selected && profileOpen && (
        <div className="wa-profile-overlay" onClick={() => setProfileOpen(false)}>
          <div className="wa-profile-card" onClick={(e) => e.stopPropagation()}>
            <button className="wa-profile-close" type="button" onClick={() => setProfileOpen(false)}>×</button>
            <div className="wa-profile-header">
              <div className="wa-profile-avatar-wrap">
                {selected.avatar ? (
                  <img src={assetUrl ? assetUrl(selected.avatar) : selected.avatar} alt={selected.name} className="wa-profile-avatar" />
                ) : (
                  <div className="wa-profile-avatar-fallback">{(selected.name || "").split(" ").map(s => s[0]).slice(0,2).join("")}</div>
                )}
              </div>
              <div className="wa-profile-header-text">
                <h2>{selected.name}</h2>
                <p>{selected.speciality || selected.practiceArea || "Legal Consultant"}</p>
                <span>{selected.city || "Location not specified"}</span>
              </div>
            </div>

            <div className="wa-profile-stats">
              <div className="wa-profile-stat">
                <strong>{selected.experience || "5+"}</strong>
                <span>Experience</span>
              </div>
              <div className="wa-profile-stat">
                <strong>{selectedRating.rating ? Number(selectedRating.rating).toFixed(1) : (Number(selected.rating) || 0).toFixed(1)}</strong>
                <span>Rating</span>
              </div>
              <div className="wa-profile-stat">
                <strong>{selected.fee || "Consultation"}</strong>
                <span>Fee</span>
              </div>
            </div>

            <div className="wa-profile-body">
              <div className="wa-profile-section">
                <h3>Rate this advocate</h3>
                <div className="wa-rating-box">
                  <div className="wa-stars" aria-label="Rate advocate from 1 to 5 stars">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`wa-star-btn ${star <= (selectedRating.votes?.[String(clientId)] || 0) ? "filled" : ""}`}
                        onClick={() => handleRatingSubmit(star)}
                        aria-label={`Rate ${star} out of 5`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <div className="wa-rating-summary">
                    {Number(selectedRating.rating || Number(selected.rating) || 0).toFixed(1)} / 5
                    <span> · {selectedRating.count || 0} review{(selectedRating.count || 0) === 1 ? "" : "s"}</span>
                  </div>
                  {ratingMessage && <div className="wa-rating-message">{ratingMessage}</div>}
                </div>
              </div>
              <div className="wa-profile-section">
                <h3>About</h3>
                <p>{selected.bio || "Experienced legal advocate focused on client support, strategic case guidance, and timely legal advice."}</p>
              </div>

              <div className="wa-profile-section">
                <h3>Practice Areas</h3>
                <div className="wa-profile-tags">
                  {[selected.practiceArea, selected.speciality].filter(Boolean).slice(0, 4).map((item, index) => (
                    <span key={`${item}-${index}`} className="wa-profile-tag">{item}</span>
                  ))}
                </div>
              </div>

              <div className="wa-profile-contact-grid">
                <div className="wa-profile-contact-item">
                  <label>Email</label>
                  <strong>{selected.email || "not provided"}</strong>
                </div>
                <div className="wa-profile-contact-item">
                  <label>Phone</label>
                  <strong>{selected.phone || "not provided"}</strong>
                </div>
              </div>
            </div>

            <div className="wa-profile-actions">
              <button className="wa-profile-btn secondary" type="button" onClick={() => setProfileOpen(false)}>Close</button>
              <button className="wa-profile-btn primary" type="button" onClick={() => setProfileOpen(false)}>Start Chat</button>
            </div>
          </div>
        </div>
      )}

      <main className="wa-chat-panel">
        <div className="wa-chat-header">
          {selected ? (
            <div className="wa-header-contact-info" onClick={() => setProfileOpen(true)}>
              <div className="wa-header-avatar">
                {selected && selected.avatar ? (
                  <img src={assetUrl ? assetUrl(selected.avatar) : selected.avatar} alt={selected.name} style={{ width:48, height:48, borderRadius:12, objectFit: 'cover' }} />
                ) : (
                  (selected.name||"").split(" ").map(s=>s[0]).slice(0,2).join("")
                )}
              </div>
              <div className="wa-header-text">
                <div className="wa-header-title">{selected.name} <span className="wa-badge-check">✓</span></div>
                <div className="wa-header-subtitle">{selected.speciality || selected.practiceArea}</div>
              </div>
            </div>
          ) : (
            <div>Select an advocate to start chatting</div>
          )}
        </div>

        <div className="wa-conversation-canvas">
          {messages.length === 0 ? (
            <div className="wa-empty-list">No messages yet. Say hi!</div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`wa-message-wrapper ${m.from === "client" ? "outgoing" : "incoming"}`}>
                <div className="wa-bubble-container">
                  <div className="wa-bubble-text">{m.text}</div>
                  <div className="wa-bubble-meta"><div className="wa-bubble-time">{new Date(m.t).toLocaleString()}</div></div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="wa-input-footer">
          <div className="wa-composer-form">
            <input
              className="wa-chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={selected ? `Message ${selected.name}…` : "Select an advocate"}
            />
          </div>
          <button className={`wa-send-action-btn ${message.trim() ? 'can-send' : ''}`} onClick={sendMessage} disabled={!selected}>Send</button>
        </div>
      </main>
      </div>
    </>
  );
}
