// ============================================================
//  Chatbot.js  —  AdvocateHub AI Chatbot with Voice & Clarity Guide
//  Place: frontend/myapp/src/pages/Chatbot.js
//  Features:
//    • Voice to text messaging in both Kannada (kn-IN) and English (en-IN)
//    • Live connection with backend/data/advocates.json (instant search)
//    • Live legal question answering via backend/data/clarityguide.json
//    • Language switch (English / ಕನ್ನಡ)
//    • Multi-parameter search & platform navigation
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Chatbot.css";

const PRIMARY_CHAT_API = "http://localhost:5001/chat";
const FALLBACK_CHAT_API = "/api/chat";

const QUICK_ACTIONS_EN = [
  { label: "🔍 Find Advocates",     msg: "Show all advocates"    },
  { label: "⚖️ Criminal Lawyers",   msg: "Show criminal lawyers" },
  { label: "👨‍👩‍👧 Family Lawyers", msg: "Show family lawyers"   },
  { label: "🏠 Property Lawyers",   msg: "Show property lawyers" },
  { label: "🚗 Road Accident Law",  msg: "road accident death"   },
  { label: "📜 Cheque Bounce",      msg: "cheque bounce notice"  },
  { label: "📋 What is bail?",      msg: "What is bail?"         },
  { label: "⚖️ Bare Acts",          msg: "Go to Bare Acts"       },
];

const QUICK_ACTIONS_KN = [
  { label: "🔍 ಎಲ್ಲಾ ವಕೀಲರು",        msg: "ಎಲ್ಲಾ ವಕೀಲರು"           },
  { label: "⚖️ ಕ್ರಿಮಿನಲ್ ವಕೀಲರು",    msg: "ಕ್ರಿಮಿನಲ್ ವಕೀಲರು"       },
  { label: "👨‍👩‍👧 ಕೌಟುಂಬಿಕ ವಕೀಲರು",  msg: "ಕೌಟುಂಬಿಕ ವಕೀಲರು"       },
  { label: "🏠 ಆಸ್ತಿ ವಕೀಲರು",        msg: "ಆಸ್ತಿ ವಕೀಲರು"           },
  { label: "🚗 ರಸ್ತೆ ಅಪಘಾತ ಪರಿಹಾರ",  msg: "ರಸ್ತೆ ಅಪಘಾತದಲ್ಲಿ ಸಾವು"  },
  { label: "📜 ಚೆಕ್ ಬೌನ್ಸ್ ನಿಯಮ",    msg: "ಚೆಕ್ ಬೌನ್ಸ್"            },
  { label: "📋 ಬೇಲ್ / ಜಾಮೀನು",       msg: "ಬೇಲ್ ಪಡೆಯುವುದು ಹೇಗೆ?" },
  { label: "⚖️ Bare Acts",           msg: "Go to Bare Acts"        },
];

// ── Advocate result card inside chat ──────────────────────────
function ChatAdvocateCard({ adv, onOpen }) {
  const loc = adv.place || adv.city || adv.district || "";
  return (
    <div className="cb-adv-card" onClick={() => onOpen(adv)}>
      <div className="cb-adv-avatar">
        {adv.avatar ? (
          <img src={adv.avatar} alt={adv.name} style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          (adv.name || "?").replace(/^Adv\.\s*/i, "").split(" ").map(n => n[0]).join("").slice(0, 2)
        )}
      </div>
      <div className="cb-adv-info">
        <div className="cb-adv-name">{adv.name}</div>
        <div className="cb-adv-spec">{adv.speciality} {loc ? `· ${loc}` : ""}</div>
        <div className="cb-adv-meta">
          ⭐ {adv.rating || 5.0} · {adv.experience || "5+ Years"} {adv.court ? `· 🏛️ ${adv.court}` : ""}
        </div>
      </div>
      <button className="cb-adv-view" onClick={e => { e.stopPropagation(); onOpen(adv); }}>
        View →
      </button>
    </div>
  );
}

// ── Single message bubble ─────────────────────────────────────
function MessageBubble({ msg, onAdvocateOpen, onNavigate }) {
  const isBot = msg.role === "bot";

  const renderText = (text) => {
    if (!text) return null;
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : <span key={i}>{part}</span>
    );
  };

  return (
    <div className={`cb-msg-row ${isBot ? "bot" : "user"}`}>
      {isBot && <div className="cb-bot-icon">⚖️</div>}
      <div className={`cb-bubble ${isBot ? "bot-bubble" : "user-bubble"}`}>
        {/* Text */}
        {msg.text && (
          <div className="cb-bubble-text">
            {msg.text.split("\n").map((line, i) => (
              <div key={i}>{renderText(line)}</div>
            ))}
          </div>
        )}

        {/* Advocate cards */}
        {msg.advocates && msg.advocates.length > 0 && (
          <div className="cb-adv-list">
            {msg.advocates.map(adv => (
              <ChatAdvocateCard
                key={adv.id || adv.name}
                adv={adv}
                onOpen={onAdvocateOpen}
              />
            ))}
          </div>
        )}

        {/* Navigate button */}
        {msg.navigate && msg.type === "navigate" && (
          <button
            className="cb-nav-btn"
            onClick={() => onNavigate(msg.navigate)}
          >
            Go Now →
          </button>
        )}

        {/* View all advocates button */}
        {msg.advocates && msg.advocates.length > 0 && msg.navigate && msg.type !== "navigate" && (
          <button
            className="cb-see-all-btn"
            onClick={() => onNavigate(msg.navigate)}
          >
            See All →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="cb-msg-row bot">
      <div className="cb-bot-icon">⚖️</div>
      <div className="cb-bubble bot-bubble cb-typing">
        <span /><span /><span />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//   MAIN CHATBOT COMPONENT
// ══════════════════════════════════════════════════════════════
export default function Chatbot() {
  const navigate = useNavigate();
  const location = useLocation();

  const isDashboardChat = location.pathname === '/client-dashboard' || location.pathname === '/advocate-dashboard';

  const [isOpen,        setIsOpen]        = useState(false);
  const [messages,      setMessages]      = useState([]);
  const [input,         setInput]         = useState("");
  const [loading,       setLoading]       = useState(false);
  const [hasOpened,     setHasOpened]     = useState(false);
  const [unread,        setUnread]        = useState(0);
  const [lang,          setLang]          = useState("en"); // "en" | "kn"
  const [isListening,   setIsListening]   = useState(false);
  const [speechError,   setSpeechError]   = useState("");

  const bottomRef       = useRef(null);
  const inputRef        = useRef(null);
  const recognitionRef  = useRef(null);

  // ── Build welcome message based on language ───────────────
  const getWelcomeMsg = useCallback((currentLang) => {
    if (currentLang === "kn") {
      return {
        id:   Date.now(),
        role: "bot",
        text: "👋 ನಮಸ್ಕಾರ! ನಾನು **AdvocateHub AI ಸಹಾಯಕ**.\n\nನಾನು ನಿಮಗೆ ಈ ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• 🔍 **ವಕೀಲರ ಹುಡುಕಾಟ:** ಹೆಸರು (ಉದಾ: Shankar, Priya), ಊರು ಅಥವಾ ಕೋರ್ಟ್\n• ⚖️ **ಕಾನೂನು ಮಾರ್ಗದರ್ಶಿ (Clarity Guide):** ಅಪಘಾತ, ವಿಚ್ಛೇದನ, ಆಸ್ತಿ, ಚೆಕ್ ಬೌನ್ಸ್ ಇತ್ಯಾದಿ\n• 🧭 **ಪುಟಗಳ ಭೇಟಿ:** Bare Acts, Legal Documents ಇತ್ಯಾದಿ\n• 🎙️ **ಧ್ವನಿ ಸಂದೇಶ:** ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ!\n\nನಿಮ್ಮ ಪ್ರಶ್ನೆ ಏನು?",
        type: "text",
      };
    }
    return {
      id:   Date.now(),
      role: "bot",
      text: "👋 Hi! I'm the **AdvocateHub Assistant**.\n\nI can help you:\n• 🔍 **Find advocates live:** Search by name (e.g. Shankar, Priya), city, or court\n• ⚖️ **Legal Clarity Guide:** Ask about road accidents, bail, divorce, property disputes, etc.\n• 🧭 **Navigate** to Bare Acts, Documents, or Profiles\n• 🎙️ **Voice-to-Text:** Speak in Kannada or English using the mic!\n\nWhat can I help you with?",
      type: "text",
    };
  }, []);

  // ── Welcome message on first open ────────────────────────
  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
      setUnread(0);
      setMessages([getWelcomeMsg(lang)]);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
    if (isOpen) setUnread(0);
  }, [isOpen, hasOpened, lang, getWelcomeMsg]);

  // ── Update welcome message if user toggles language with only welcome present
  const handleLangToggle = (newLang) => {
    if (newLang === lang) return;
    setLang(newLang);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (messages.length <= 1) {
      setMessages([getWelcomeMsg(newLang)]);
    }
  };

  // ── Scroll to bottom ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Speech Recognition (Voice to Text in Kannada & English) ─
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechError(
        lang === "kn"
          ? "ನಿಮ್ಮ ಬ್ರೌಸರ್ ಧ್ವನಿ ಗುರುತಿಸುವಿಕೆಯನ್ನು ಬೆಂಬಲಿಸುವುದಿಲ್ಲ. ದಯವಿಟ್ಟು Chrome ಬಳಸಿ."
          : "Voice recognition is not supported in this browser. Please use Chrome/Edge."
      );
      setTimeout(() => setSpeechError(""), 4000);
      return;
    }

    try {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = true;
      // Set language to Kannada (kn-IN) or English (en-IN)
      rec.lang = lang === "kn" ? "kn-IN" : "en-IN";

      rec.onstart = () => {
        setIsListening(true);
        setSpeechError("");
      };

      rec.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setInput(transcript);
        }
      };

      rec.onerror = (event) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          setSpeechError(
            lang === "kn"
              ? "ಮೈಕ್ರೋಫೋನ್ ಅನುಮತಿ ನಿರಾಕರಿಸಲಾಗಿದೆ."
              : "Microphone permission denied. Allow mic access in browser."
          );
        } else if (event.error !== "no-speech") {
          setSpeechError(
            lang === "kn" ? "ಧ್ವನಿ ಗುರುತಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ." : `Voice error: ${event.error}`
          );
        }
        setTimeout(() => setSpeechError(""), 3500);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.start();
      recognitionRef.current = rec;
    } catch (err) {
      console.error("Speech recognition error:", err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // ── Send message (Live server with automatic fallback) ─────
  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;

    if (isListening) stopListening();

    const userMsg = { id: Date.now(), role: "user", text: msg, type: "text" };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let data = null;

      // 1. Try Primary Python Flask API (port 5001)
      try {
        const res = await fetch(PRIMARY_CHAT_API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ message: msg, lang }),
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch {
        // Primary port 5001 unreachable, silently fallback to port 5000 backend
      }

      // 2. Fallback to Node server.js API (/api/chat on port 5000)
      if (!data) {
        const resFallback = await fetch(FALLBACK_CHAT_API, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ message: msg, lang }),
        });
        if (resFallback.ok) {
          data = await resFallback.json();
        }
      }

      if (!data) {
        throw new Error("Chatbot service offline");
      }

      const botMsg = {
        id:        Date.now() + 1,
        role:      "bot",
        text:      data.text      || "",
        type:      data.type      || "text",
        advocates: data.advocates || null,
        navigate:  data.navigate  || null,
        profileId: data.profileId || null,
      };
      setMessages(prev => [...prev, botMsg]);

      // Auto-navigate if requested
      if (data.type === "navigate" && data.navigate) {
        setTimeout(() => {
          navigate(data.navigate);
          setIsOpen(false);
        }, 1200);
      }

      // Auto-open profile if single profile match
      if (data.type === "profile" && data.navigate) {
        setTimeout(() => {
          navigate(data.navigate);
          setIsOpen(false);
        }, 1200);
      }

    } catch {
      setMessages(prev => [
        ...prev,
        {
          id:   Date.now() + 1,
          role: "bot",
          text: lang === "kn"
            ? "⚠️ ಸರ್ವರ್ ಸಂಪರ್ಕದಲ್ಲಿ ತೊಂದರೆ ಉಂಟಾಗಿದೆ. ದಯವಿಟ್ಟು ಕ್ಷಣಾರ್ಧದ ನಂತರ ಪ್ರಯತ್ನಿಸಿ."
            : "⚠️ Unable to reach chatbot service. Please ensure the server is active and try again.",
          type: "text",
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // ── Navigate from bot response ────────────────────────────
  const handleNavigate = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  // ── Open advocate profile ─────────────────────────────────
  const handleAdvocateOpen = (adv) => {
    if (adv.profileUrl || adv.id) {
      navigate(adv.profileUrl || `/profile/${adv.id}`);
      setIsOpen(false);
    }
  };

  // ── Quick action click ────────────────────────────────────
  const handleQuickAction = (msg) => {
    sendMessage(msg);
  };

  // ── Key handler ───────────────────────────────────────────
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Clear chat ────────────────────────────────────────────
  const clearChat = () => {
    setMessages([getWelcomeMsg(lang)]);
  };

  const quickActions = lang === "kn" ? QUICK_ACTIONS_KN : QUICK_ACTIONS_EN;

  if (isDashboardChat) return null;

  return (
    <>
      {/* ── Floating Action Button ── */}
      <button
        className={`cb-fab ${isOpen ? "cb-fab-open" : ""}`}
        onClick={() => setIsOpen(p => !p)}
        title="Chat with AdvocateHub Assistant"
        aria-label="Open chatbot"
      >
        {isOpen ? "✕" : "⚖️"}
        {!isOpen && unread > 0 && (
          <span className="cb-fab-badge">{unread}</span>
        )}
        {!isOpen && (
          <span className="cb-fab-label">{lang === "kn" ? "ಏನಾದರೂ ಕೇಳಿ (Ask me)" : "Ask me anything"}</span>
        )}
      </button>

      {/* ── Chat Window ── */}
      {isOpen && (
        <div className="cb-window">

          {/* Header */}
          <div className="cb-header">
            <div className="cb-header-left">
              <div className="cb-header-icon">⚖️</div>
              <div>
                <div className="cb-header-title">
                  {lang === "kn" ? "AdvocateHub AI ಸಹಾಯಕ" : "AdvocateHub Assistant"}
                </div>
                <div className="cb-header-sub">
                  <span className="cb-online-dot" /> {lang === "kn" ? "ಲೈವ್ ಸರ್ವರ್ ಸಕ್ರಿಯ" : "Live Server Online"}
                </div>
              </div>
            </div>
            <div className="cb-header-actions" style={{ display: "flex", alignItems: "center" }}>
              {/* Language Switcher */}
              <div className="cb-lang-toggle-wrap" title="Switch Language / ಭಾಷೆ ಬದಲಿಸಿ">
                <button
                  type="button"
                  className={`cb-lang-btn ${lang === "en" ? "active" : ""}`}
                  onClick={() => handleLangToggle("en")}
                >
                  EN
                </button>
                <button
                  type="button"
                  className={`cb-lang-btn ${lang === "kn" ? "active" : ""}`}
                  onClick={() => handleLangToggle("kn")}
                >
                  ಕನ್ನಡ
                </button>
              </div>

              <button className="cb-header-btn" onClick={clearChat} title="Clear chat">🗑</button>
              <button className="cb-header-btn" onClick={() => setIsOpen(false)} title="Close">✕</button>
            </div>
          </div>

          {/* Quick actions (shown when 1 message or empty) */}
          {messages.length <= 1 && (
            <div className="cb-quick-actions">
              <div className="cb-quick-label">{lang === "kn" ? "ತ್ವರಿತ ಆಯ್ಕೆಗಳು" : "Quick Actions"}</div>
              <div className="cb-quick-grid">
                {quickActions.map(qa => (
                  <button
                    key={qa.label}
                    className="cb-quick-btn"
                    onClick={() => handleQuickAction(qa.msg)}
                  >
                    {qa.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="cb-messages">
            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onAdvocateOpen={handleAdvocateOpen}
                onNavigate={handleNavigate}
              />
            ))}
            {loading && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Listening Indicator Banner */}
          {isListening && (
            <div className="cb-listening-banner">
              <div className="cb-listening-text">
                <span className="cb-listening-dot" />
                <span>
                  {lang === "kn"
                    ? "🎙️ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಿ... (Listening in Kannada)"
                    : "🎙️ Listening in English... Speak clearly"}
                </span>
              </div>
              <button
                type="button"
                className="cb-listening-stop"
                onClick={stopListening}
              >
                {lang === "kn" ? "ನಿಲ್ಲಿಸಿ" : "Stop"}
              </button>
            </div>
          )}

          {/* Speech Error Banner */}
          {speechError && (
            <div className="cb-listening-banner" style={{ background: "#fff1f2", color: "#e11d48" }}>
              <span>⚠️ {speechError}</span>
            </div>
          )}

          {/* Input area */}
          <div className="cb-input-area">
            {/* Voice to text Mic button */}
            <button
              type="button"
              className={`cb-mic-btn ${isListening ? "listening" : ""}`}
              onClick={toggleListening}
              title={
                isListening
                  ? "Click to stop listening"
                  : lang === "kn"
                  ? "ಧ್ವನಿ ಮೂಲಕ ಸಂದೇಶ ನೀಡಿ (ಕನ್ನಡ)"
                  : "Voice to text (English)"
              }
              disabled={loading}
              aria-label="Microphone"
            >
              🎙️
            </button>

            <textarea
              ref={inputRef}
              className="cb-input"
              rows={1}
              placeholder={
                lang === "kn"
                  ? "ವಕೀಲರ ಹೆಸರು, ಊರು, ಅಥವಾ ಕಾನೂನು ಪ್ರಶ್ನೆ ಕೇಳಿ..."
                  : "Ask about advocates, laws, or situations..."
              }
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              disabled={loading}
            />

            <button
              className="cb-send-btn"
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              title="Send"
            >
              {loading ? "⏳" : "➤"}
            </button>
          </div>

          {/* Footer */}
          <div className="cb-footer">
            ⚖️ AdvocateHub AI · {lang === "kn" ? "ಕನ್ನಡ & English ಬೆಂಬಲಿತ" : "Live Clarity & Advocates"}
          </div>
        </div>
      )}
    </>
  );
}