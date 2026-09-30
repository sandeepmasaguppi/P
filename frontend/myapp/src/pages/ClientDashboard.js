import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getAdvocates, getAdvocateRatingSummary, submitAdvocateRating } from "../data/Advocatesstore";
import { assetUrl, api } from "../data/api";
import "./ClientDashboard.css";
const SESSION_KEY = "law4u_client_id";
const CLIENT_OBJ_KEY = "law4u_client";
const CLIENT_TOKEN_KEY = "law4u_client_token";
const THEME_KEY = "law4u_client_theme";
const LANG_KEY = "law4u_language";

const AVATAR_PRESETS = [
  "/uploads/chetan.png",
  "/uploads/karna.png",
  "/uploads/anand.png",
  "/uploads/kiran.png",
  "/uploads/deep-p.png",
];

const PAY_I18N = {
  en: {
    modalTitle: "ONE-TIME ADVOCATE CONSULTATION ACTIVATION",
    modalBadge: "🔒 CONSULTATION FEE · ₹10 ONLY",
    casePreviewTitle: "PREPARED CASE INQUIRY (UPPERCASE PREVIEW):",
    advocateTarget: "STARTING CONSULTATION WITH:",
    amountLabel: "ONE-TIME ADVOCATE FEE:",
    reasonTitle: "📌 WHY A ₹10 FEE IS REQUESTED (MAINTENANCE & STORAGE):",
    reasonDesc: "This nominal ₹10 fee is collected once per advocate to activate direct consultation chat, app maintenance, cloud server deployment (App Deploy), and secure chat/document storage. Once activated for this advocate, you can chat continuously without paying again.",
    scannerInstruction: "Scan this PhonePe QR code or transfer ₹10 to PhonePe Number 9108717353 (UPI ID: 9108717353-3@ybl):",
    verifyBtn: "✓ I Have Paid ₹10 via PhonePe — Start Chat with Advocate →",
    verifyingBtn: "⏳ Verifying PhonePe UPI Transaction with Bank...",
    successBtn: "✅ Payment Confirmed! Sending Message to Advocate...",
    cancelBtn: "Cancel & Return to Chat",
    lifetimeNotice: "Permanent Consultation Access Granted for this Advocate",
  },
  kn: {
    modalTitle: "ವಕೀಲರ ಸಮಾಲೋಚನೆ ಸಕ್ರಿಯಗೊಳಿಸುವಿಕೆ (ಒಂದು ಬಾರಿ ₹10)",
    modalBadge: "🔒 ಸಮಾಲೋಚನಾ ಶುಲ್ಕ · ಕೇವಲ ₹10",
    casePreviewTitle: "ಸಿದ್ಧಪಡಿಸಿದ ಕೇಸ್ ವಿಚಾರಣಾ ಸಂದೇಶ (MESSAGE PREVIEW):",
    advocateTarget: "ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸುವ ವಕೀಲರು:",
    amountLabel: "ಒಂದು ಬಾರಿಯ ವಕೀಲರ ಸಮಾಲೋಚನಾ ಶುಲ್ಕ:",
    reasonTitle: "📌 ₹10 ಶುಲ್ಕವನ್ನು ಏಕೆ ಕೇಳಲಾಗುತ್ತಿದೆ? (ನಿರ್ವಹಣೆ ಮತ್ತು ಸಂಗ್ರಹಣೆ):",
    reasonDesc: "ಈ ₹10 ಶುಲ್ಕವನ್ನು ಈ ವಕೀಲರೊಂದಿಗೆ ನೇರ ಚಾಟ್ ಪ್ರಾರಂಭಿಸಲು, ಅಪ್ಲಿಕೇಶನ್ ನಿರ್ವಹಣೆ (App Maintenance), ಕ್ಲೌಡ್ ನಿಯೋಜನೆ (App Deploy) ಮತ್ತು ಡೇಟಾ ಸುರಕ್ಷಿತ ಸಂಗ್ರಹಣೆಗಾಗಿ (Secure Storage) ಮಾತ್ರ ಸಂಗ್ರಹಿಸಲಾಗುತ್ತಿದೆ. ಒಬ್ಬ ವಕೀಲರಿಗೆ ಇದು ಕೇವಲ ಒಂದು ಬಾರಿ ಮಾತ್ರ ಅನ್ವಯವಾಗುತ್ತದೆ. ಒಮ್ಮೆ ಪಾವತಿಸಿದ ನಂತರ ಈ ವಕೀಲರೊಂದಿಗೆ ಪುನಃ ಎಂದಿಗೂ ಶುಲ್ಕವಿಲ್ಲದೆ ನಿರಂತರವಾಗಿ ಚಾಟ್ ಮಾಡಬಹುದು.",
    scannerInstruction: "ಈ ಫೋನ್ ಪೇ (PhonePe) QR ಕೋಡ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ ಅಥವಾ PhonePe ಸಂಖ್ಯೆ 9108717353 (UPI ID: 9108717353-3@ybl) ಗೆ ₹10 ಕಳುಹಿಸಿ:",
    verifyBtn: "✓ PhonePe ಮೂಲಕ ₹10 ಪಾವತಿಸಲಾಗಿದೆ — ವಕೀಲರಿಗೆ ಸಂದೇಶ ಕಳುಹಿಸಿ →",
    verifyingBtn: "⏳ ಫೋನ್ ಪೇ ಪಾವತಿಯನ್ನು ಬ್ಯಾಂಕ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗುತ್ತಿದೆ...",
    successBtn: "✅ ಪಾವತಿ ಯಶಸ್ವಿಯಾಗಿದೆ! ಸಂದೇಶ ಕಳುಹಿಸಲಾಗುತ್ತಿದೆ...",
    cancelBtn: "ರದ್ದುಮಾಡಿ & ಚಾಟ್‌ಗೆ ಹಿಂತಿರುಗಿ",
    lifetimeNotice: "ಈ ವಕೀಲರೊಂದಿಗೆ ಶಾಶ್ವತ ಸಮಾಲೋಚನೆ ಚಾಟ್ ಪ್ರವೇಶ ನೀಡಲಾಗಿದೆ",
  },
};



export default function ClientDashboard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get("search") || searchParams.get("speciality") || "";
  const initialPrefill = searchParams.get("prefill") || "";
  const clientId = Number(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 0);

  // read client object (saved at login)
  const clientObj = useMemo(() => {
    try {
      const raw = localStorage.getItem(CLIENT_OBJ_KEY) || sessionStorage.getItem(CLIENT_OBJ_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }, []);

  const advocates = useMemo(() => getAdvocates().filter(a => a.status === "approved"), []);
  const [search, setSearch] = useState(initialSearch);
  const filteredAdvocates = useMemo(() => {
    const raw = (search || "").trim().toLowerCase();
    if (!raw) return advocates;

    // Tokenize search query by +, /, &, comma, or whitespace
    const stopWords = new Set(["lawyer", "advocate", "claims", "and", "or", "the", "for", "with", "law", "+", "/", "&", "|", ","]);
    const rawTokens = raw
      .split(/[+,&|\s/]+/)
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 2 && !stopWords.has(t));

    // Expand search keywords with domain aliases
    const targetTerms = new Set(rawTokens);
    if (rawTokens.some(t => t.includes("accident") || t.includes("motor") || t.includes("injury"))) {
      targetTerms.add("civil");
      targetTerms.add("accident");
      targetTerms.add("mact");
    }
    if (rawTokens.some(t => t.includes("tax") || t.includes("gst") || t.includes("income"))) {
      targetTerms.add("tax");
      targetTerms.add("gst");
      targetTerms.add("corporate");
    }
    if (rawTokens.some(t => t.includes("cheque") || t.includes("banking") || t.includes("debt"))) {
      targetTerms.add("civil");
      targetTerms.add("corporate");
    }
    if (rawTokens.some(t => t.includes("divorce") || t.includes("custody") || t.includes("matrimonial"))) {
      targetTerms.add("family");
    }
    if (rawTokens.some(t => t.includes("rera") || t.includes("land") || t.includes("tenant"))) {
      targetTerms.add("property");
    }

    const termsArray = Array.from(targetTerms);

    // Fallback if no specific tokens
    if (termsArray.length === 0) {
      return advocates.filter(a => {
        const full = `${a.name} ${a.city} ${a.speciality || a.practiceArea} ${a.bio}`.toLowerCase();
        return full.includes(raw);
      });
    }

    return advocates.filter(a => {
      const full = `${a.name} ${a.city} ${a.practiceArea} ${a.speciality} ${a.bio}`.toLowerCase();
      return termsArray.some(term => full.includes(term));
    });
  }, [advocates, search]);
  const [messagesVersion, setMessagesVersion] = useState(0);
  const [since] = useState(""); // ISO string from datetime-local

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
  }, [filteredAdvocates, clientId, messagesVersion, since]);

  // Read any previously active chat advocate
  const activeChatId = Number(
    sessionStorage.getItem(`law4u_active_chat_${clientId}`) ||
    localStorage.getItem(`law4u_active_chat_${clientId}`) ||
    0
  );
  const activeAdvocate = activeChatId ? advocates.find(a => Number(a.id) === activeChatId) : null;

  // Check if initialPrefill was already sent to this advocate (e.g. user refreshed after sending)
  const isPrefillAlreadySent = useMemo(() => {
    if (!initialPrefill || !activeAdvocate || !clientId) return false;
    try {
      const existing = JSON.parse(localStorage.getItem(`chat_${clientId}_${activeAdvocate.id}`) || "[]");
      return existing.some(m => m.from === "client" && m.text.trim() === initialPrefill.trim());
    } catch {
      return false;
    }
  }, [initialPrefill, activeAdvocate, clientId]);

  // If prefill was already sent, clean URL so refresh keeps the user in conversation view
  useEffect(() => {
    if (isPrefillAlreadySent && (searchParams.get("prefill") || searchParams.get("search"))) {
      navigate('/client-dashboard', { replace: true });
    }
  }, [isPrefillAlreadySent, searchParams, navigate]);

  // Only show "Choose an Advocate" if this is a fresh unsent case query
  const hasFreshFilterQuery = Boolean(initialSearch || initialPrefill || searchParams.get("caseId")) && !isPrefillAlreadySent;

  const [selected, setSelected] = useState(() => {
    if (isPrefillAlreadySent && activeAdvocate) return activeAdvocate;
    if (hasFreshFilterQuery) return null;
    return activeAdvocate || advocates[0] || null;
  });

  const [mobileChatActive, setMobileChatActive] = useState(() => {
    return Boolean(!hasFreshFilterQuery && (activeAdvocate || advocates[0]));
  });

  const [profileOpen, setProfileOpen] = useState(false);
  const [message, setMessage] = useState(() => (isPrefillAlreadySent ? "" : initialPrefill));
  const [messages, setMessages] = useState([]);
  const [ratingMessage, setRatingMessage] = useState("");
  const [ratingDraft, setRatingDraft] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  const selectedRating = useMemo(() => {
    if (!selected || messagesVersion < 0) return { rating: 0, count: 0, votes: {} };
    return getAdvocateRatingSummary(selected.id);
  }, [selected, messagesVersion]);

  // Sync draft rating with client's existing vote for the selected advocate
  useEffect(() => {
    if (selected) {
      const myVote = Number(selectedRating.votes?.[String(clientId)] || 0);
      setRatingDraft(myVote);
    } else {
      setRatingDraft(0);
    }
  }, [selected, selectedRating, clientId]);

  // Theme state: 'light' (White Theme) or 'dark' (Black Theme)
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");
  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  // Language state: 'en' or 'kn'
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");
  const handleLanguageChange = (newLang) => {
    setLang(newLang);
    localStorage.setItem(LANG_KEY, newLang);
  };
  const pt = PAY_I18N[lang] || PAY_I18N.en;

  // One-time ₹10 consultation fee verification per advocate for this client
  const [, setPaidVersion] = useState(0);
  const isAdvocatePaid = (advId) => {
    if (!advId) return false;
    const cid = clientId || "guest";
    return localStorage.getItem(`law4u_client_paid_${cid}_adv_${advId}`) === "true";
  };

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Avatar state for client
  const [clientAvatar, setClientAvatar] = useState(() => {
    if (clientId) {
      const saved = localStorage.getItem(`law4u_client_avatar_${clientId}`);
      if (saved) return saved;
    }
    if (clientObj?.avatar) return clientObj.avatar;
    if (clientObj?.name && clientObj.name.toLowerCase().includes("chetan")) {
      return "/uploads/chetan.png";
    }
    return "/uploads/chetan.png";
  });

  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const clientMenuRef = useRef(null);

  // Close profile drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (clientMenuRef.current && clientMenuRef.current.contains(e.target)) return;
      const trigger = document.querySelector(".wa-client-profile");
      if (trigger && trigger.contains(e.target)) return;
      setClientMenuOpen(false);
    };
    if (clientMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [clientMenuOpen]);

  const handleSelectClientAvatar = (url) => {
    setClientAvatar(url);
    if (clientId) {
      localStorage.setItem(`law4u_client_avatar_${clientId}`, url);
    }
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      handleSelectClientAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Sync search and prefill if searchParams change
  useEffect(() => {
    const q = searchParams.get("search") || searchParams.get("speciality");
    if (q) {
      setSearch(q);
      // Only reset selection if this is a fresh inquiry
      if (!isPrefillAlreadySent) {
        setSelected(null);
      }
    }
    const pf = searchParams.get("prefill");
    if (pf && !isPrefillAlreadySent) {
      setMessage(pf);
    }
  }, [searchParams, isPrefillAlreadySent]);


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

  const sendMessage = () => {
    if (!message.trim() || !selected) return;
    const textToSend = message.trim();

    // Check if client has already paid the one-time ₹10 fee for this specific advocate
    if (!isAdvocatePaid(selected.id)) {
      setPendingMessage(textToSend);
      setShowPaymentModal(true);
      return;
    }

    executeSendMessage(textToSend);
  };

  const executeSendMessage = (textToSend) => {
    const key = `chat_${clientId}_${selected.id}`;
    const next = [...messages, { from: "client", text: textToSend, t: new Date().toISOString(), clientName: clientObj?.name || undefined }];
    localStorage.setItem(key, JSON.stringify(next));
    setMessages(next);
    setMessage("");

    // Remember this advocate as active chat
    if (clientId && selected) {
      sessionStorage.setItem(`law4u_active_chat_${clientId}`, String(selected.id));
      localStorage.setItem(`law4u_active_chat_${clientId}`, String(selected.id));
    }

    // Clean URL so browser refresh stays in active chat without re-triggering case setup
    navigate('/client-dashboard', { replace: true });
  };

  const handleConfirmPayment = () => {
    setIsProcessingPayment(true);
    setTimeout(() => {
      const cid = clientId || "guest";
      const msg = pendingMessage || message.trim();
      if (selected?.id) {
        localStorage.setItem(`law4u_client_paid_${cid}_adv_${selected.id}`, "true");
        setPaidVersion(v => v + 1);

        // Record consultation payment for admin dashboard
        const payRecord = {
          id: `PAY_${cid}_${selected.id}_${Date.now()}`,
          clientId: cid,
          clientName: clientObj?.name || (clientId ? `Client #${clientId}` : "Client"),
          clientEmail: clientObj?.email || "",
          clientPhone: clientObj?.phone || "",
          clientCity: clientObj?.city || "",
          advocateId: selected.id,
          advocateName: selected.name,
          advocateSpec: selected.speciality || selected.practiceArea || "",
          advocateCity: selected.city || "",
          amount: 10,
          currency: "INR",
          method: "PhonePe UPI",
          upiId: "9108717353-3@ybl",
          status: "Paid",
          paidAt: new Date().toISOString(),
          message: msg,
        };

        try {
          const raw = localStorage.getItem("law4u_consultation_payments");
          const list = raw ? JSON.parse(raw) : [];
          list.unshift(payRecord);
          localStorage.setItem("law4u_consultation_payments", JSON.stringify(list));
        } catch {}

        api("/api/consultations", { method: "POST", body: payRecord }).catch(() => {});
      }
      setIsProcessingPayment(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        if (msg && selected) {
          executeSendMessage(msg);
          setPendingMessage("");
        }
      }, 800);
    }, 1200);
  };

  const handleRatingSubmitClick = async () => {
    if (!selected || !clientId || !ratingDraft) return;
    setIsSubmittingRating(true);
    try {
      const summary = await submitAdvocateRating(selected.id, clientId, ratingDraft, clientObj?.name || "Client");
      setSelected(prev => prev ? { ...prev, rating: summary.rating, ratingCount: summary.count } : prev);
      setRatingMessage(
        lang === "kn"
          ? `✅ ಧನ್ಯವಾದಗಳು! ನಿಮ್ಮ ${ratingDraft}-ಸ್ಟಾರ್ ರೇಟಿಂಗ್ ಅನ್ನು advocates.json ನಲ್ಲಿ ಯಶಸ್ವಿಯಾಗಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ. ಹೊಸ ಸರಾಸರಿ: ⭐ ${Number(summary.rating).toFixed(1)} / 5 (${summary.count} ರೇಟಿಂಗ್‌ಗಳು).`
          : `✅ Thank you! Your ${ratingDraft}-star rating was saved to advocates.json. New average: ⭐ ${Number(summary.rating).toFixed(1)} / 5 (${summary.count} rating${summary.count === 1 ? "" : "s"}).`
      );
      setTimeout(() => setRatingMessage(""), 5000);
      setMessagesVersion(v => v + 1);
    } catch (e) {
      console.error(e);
      setRatingMessage(lang === "kn" ? "ರೇಟಿಂಗ್ ಉಳಿಸುವಲ್ಲಿ ದೋಷ ಉಂಟಾಗಿದೆ." : "Error saving rating.");
      setTimeout(() => setRatingMessage(""), 3000);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const handleLogout = useCallback(() => {
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
  }, [navigate]);

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
  }, [clientId, handleLogout]);

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
      <div className={`wa-top-band ${theme === "dark" ? "wa-dark" : ""}`} />
      <div
        className={`wa-app-shell ${theme === "dark" ? "wa-dark" : ""} ${
          mobileChatActive && selected ? "mobile-show-chat" : "mobile-show-list"
        }`}
        style={{ top: 0 }}
      >
      <aside className="wa-sidebar">
        {/* WhatsApp Web Full-Page Profile Drawer */}
        {clientMenuOpen && (
          <div className="wa-profile-fullpage-drawer" ref={clientMenuRef}>
            <div className="wa-pfd-header">
              <button
                type="button"
                className="wa-pfd-back-btn"
                onClick={() => setClientMenuOpen(false)}
                title={lang === "kn" ? "ಹಿಂದಕ್ಕೆ" : "Back to chats"}
                aria-label="Back to chats"
              >
                ←
              </button>
              <div className="wa-pfd-title">{lang === "kn" ? "ಪ್ರೊಫೈಲ್" : "Profile"}</div>
            </div>

            <div className="wa-pfd-body">
              {/* Profile Avatar Hero */}
              <div className="wa-pfd-avatar-hero">
                <label className="wa-pfd-avatar-circle" title={lang === "kn" ? "ಫೋಟೋ ಬದಲಾಯಿಸಿ" : "Change Profile Photo"}>
                  {clientAvatar ? (
                    <img
                      src={assetUrl(clientAvatar)}
                      alt={clientObj?.name || "Client"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerText = (clientObj?.name || "C").charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    (clientObj?.name || "C").charAt(0).toUpperCase()
                  )}
                  <div className="wa-pfd-avatar-overlay">
                    <span style={{ fontSize: "28px" }}>📷</span>
                    <span>{lang === "kn" ? "ಫೋಟೋ ಬದಲಾಯಿಸಿ" : "Change Profile Photo"}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleAvatarUpload}
                  />
                </label>

                {/* Preset Avatars Selector */}
                <div className="wa-pfd-presets-bar">
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`wa-pfd-preset-circle ${clientAvatar === preset ? "selected" : ""}`}
                      onClick={() => handleSelectClientAvatar(preset)}
                      title={`Avatar ${idx + 1}`}
                    >
                      <img src={assetUrl(preset)} alt={`Preset ${idx + 1}`} />
                    </button>
                  ))}
                  <label className="wa-pfd-upload-btn" title={lang === "kn" ? "ಕಸ್ಟಮ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್" : "Upload custom photo"}>
                    📷
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleAvatarUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Card 1: Your Name */}
              <div className="wa-pfd-card">
                <div className="wa-pfd-label">{lang === "kn" ? "ನಿಮ್ಮ ಹೆಸರು" : "Your name"}</div>
                <div className="wa-pfd-value">{clientObj?.name || "Client"}</div>
                <div className="wa-pfd-caption">
                  {lang === "kn"
                    ? "ಇದು ನಿಮ್ಮ ಬಳಕೆದಾರ ಹೆಸರು ಅಥವಾ ಪಿನ್ ಅಲ್ಲ. ಈ ಹೆಸರು ನಿಮ್ಮ ವಕೀಲರಿಗೆ ಗೋಚರಿಸುತ್ತದೆ."
                    : "This is not your username or PIN. This name will be visible to your advocates."}
                </div>
              </div>

              {/* Card 2: About & Account */}
              <div className="wa-pfd-card">
                <div className="wa-pfd-label">{lang === "kn" ? "ವಿವರಣೆ (About)" : "About"}</div>
                <div className="wa-pfd-value">
                  {lang === "kn" ? "⚖️ ಸಮಾಲೋಚನೆಗಾಗಿ ಸಿದ್ಧರಾಗಿರುವ ಕ್ಲೈಂಟ್ ಖಾತೆ" : "⚖️ Ready for Legal Consultations & Advice"}
                </div>
                <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "13px", color: "var(--wa-text-secondary)" }}>
                    ✉️ {clientObj?.email || "client@law4u.in"}
                  </span>
                  <span className="wa-cd-badge">
                    {lang === "kn" ? "ಕ್ಲೈಂಟ್ ಖಾತೆ" : "Client Account"}
                  </span>
                </div>
              </div>

              {/* Card 3: Theme Mode */}
              <div className="wa-pfd-card">
                <div className="wa-pfd-label">{lang === "kn" ? "ಥೀಮ್ ಮೋಡ್ (Theme)" : "Theme Mode"}</div>
                <div className="wa-pfd-segmented">
                  <button
                    type="button"
                    className={`wa-pfd-seg-btn ${theme === "light" ? "active" : ""}`}
                    onClick={() => handleThemeChange("light")}
                  >
                    ☀️ {lang === "kn" ? "ಲೈಟ್ (White)" : "White (Light)"}
                  </button>
                  <button
                    type="button"
                    className={`wa-pfd-seg-btn ${theme === "dark" ? "active" : ""}`}
                    onClick={() => handleThemeChange("dark")}
                  >
                    🌙 {lang === "kn" ? "ಡಾರ್ಕ್ (Black)" : "Black (Dark)"}
                  </button>
                </div>
              </div>

              {/* Card 4: Language */}
              <div className="wa-pfd-card">
                <div className="wa-pfd-label">{lang === "kn" ? "ಭಾಷೆ (Language)" : "Language"}</div>
                <div className="wa-pfd-segmented">
                  <button
                    type="button"
                    className={`wa-pfd-seg-btn ${lang === "en" ? "active" : ""}`}
                    onClick={() => handleLanguageChange("en")}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    className={`wa-pfd-seg-btn ${lang === "kn" ? "active" : ""}`}
                    onClick={() => handleLanguageChange("kn")}
                  >
                    ಕನ್ನಡ (Kannada)
                  </button>
                </div>
              </div>

              {/* Card 5: Navigation & Account Actions */}
              <div className="wa-pfd-card">
                <div className="wa-pfd-label">{lang === "kn" ? "ತ್ವರಿತ ಕ್ರಿಯೆಗಳು" : "Navigation & Actions"}</div>
                <div className="wa-pfd-actions">
                  <button
                    type="button"
                    className="wa-pfd-btn"
                    onClick={() => setClientMenuOpen(false)}
                  >
                    💬 {lang === "kn" ? "ವಕೀಲರ ಚಾಟ್‌ಗೆ ಹಿಂತಿರುಗಿ" : "Back to Advocates Chat"}
                  </button>
                  <button
                    type="button"
                    className="wa-pfd-btn"
                    onClick={() => {
                      setClientMenuOpen(false);
                      navigate("/client-main");
                    }}
                  >
                    🏢 {lang === "kn" ? "ಕ್ಲೈಂಟ್ ಸೇವಾ ಕೇಂದ್ರ & ಸ್ಪಷ್ಟತೆ" : "Client Main Portal & Clarity Hub"}
                  </button>
                  <button
                    type="button"
                    className="wa-pfd-btn"
                    onClick={() => {
                      setClientMenuOpen(false);
                      navigate("/");
                    }}
                  >
                    🏠 {lang === "kn" ? "ಮುಖಪುಟ (Home)" : "Platform Home"}
                  </button>
                  <button
                    type="button"
                    className="wa-pfd-btn wa-pfd-btn-logout"
                    onClick={() => {
                      setClientMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    🚪 {lang === "kn" ? "ಲಾಗ್‌ಔಟ್ ಮಾಡಿ (Logout)" : "Logout Account"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="wa-sidebar-top">
          {/* Profile & Theme Avatar Trigger */}
          <div className="wa-client-profile-wrap">
            <div
              className={`wa-client-profile ${clientMenuOpen ? "active" : ""}`}
              onClick={() => setClientMenuOpen((prev) => !prev)}
              title="Click to view Profile, Themes & Settings"
              role="button"
              tabIndex={0}
            >
              <div className="wa-client-profile-left">
                <div className="wa-client-avatar">
                  {clientAvatar ? (
                    <img
                      src={assetUrl(clientAvatar)}
                      alt={clientObj?.name || "Client"}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        if (e.currentTarget.parentElement) {
                          e.currentTarget.parentElement.innerText = (clientObj?.name || "C").charAt(0).toUpperCase();
                        }
                      }}
                    />
                  ) : (
                    (clientObj?.name || "C").charAt(0).toUpperCase()
                  )}
                </div>
                <div className="wa-client-info">
                  <div className="wa-client-name-row">
                    <div className="wa-client-name">{clientObj?.name || "Client"}</div>
                  </div>
                  <div className="wa-client-role">Client Dashboard</div>
                </div>
              </div>
              <div className="wa-profile-menu-trigger" title="Open Profile Menu">
                <span className="wa-profile-menu-dots">⋮</span>
              </div>
            </div>
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

          {search && (
            <div className="wa-search-filter-badge">
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "85%" }}>
                🎯 Filter: <strong>{search}</strong> ({displayedAdvocates.length})
              </span>
              <button
                type="button"
                onClick={() => setSearch("")}
                className="wa-search-filter-clear"
                title="Clear filter"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div className="wa-advocates-list">
          {displayedAdvocates.length === 0 && <div className="wa-empty-list">No advocates match your search.</div>}
          {displayedAdvocates.map((a) => (
            <div
              key={a.id}
              onClick={() => {
                setSelected(a);
                setMobileChatActive(true);
                if (clientId && a) {
                  sessionStorage.setItem(`law4u_active_chat_${clientId}`, String(a.id));
                  localStorage.setItem(`law4u_active_chat_${clientId}`, String(a.id));
                }
              }}
              className={`wa-advocate-row ${selected && selected.id === a.id ? "selected" : ""}`}
            >
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
                  <div className={`wa-advocate-fee-chip ${isAdvocatePaid(a.id) ? "paid" : "unpaid"}`}>
                    {isAdvocatePaid(a.id) ? "✓ Active" : "₹10 Chat"}
                  </div>
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
                <strong>⭐ {selectedRating.rating ? Number(selectedRating.rating).toFixed(1) : (Number(selected.rating) || 5.0).toFixed(1)}</strong>
                <span>{lang === "kn" ? "ಸರಾಸರಿ ರೇಟಿಂಗ್" : "Avg Rating"} ({selectedRating.count || selected.ratingCount || 0})</span>
              </div>
              <div className="wa-profile-stat">
                <strong>{selected.cases ? `${selected.cases}+` : "100+"}</strong>
                <span>Cases</span>
              </div>
            </div>

            <div className="wa-profile-body">
              <div className="wa-profile-section">
                <div className="wa-rating-header-row">
                  <h3>{lang === "kn" ? "ಈ ವಕೀಲರಿಗೆ ರೇಟಿಂಗ್ ನೀಡಿ" : "Rate this Advocate"}</h3>
                  <span className="wa-movie-style-chip">
                    🎬 {lang === "kn" ? "ಚಲನಚಿತ್ರ ಶೈಲಿಯ ರೇಟಿಂಗ್" : "Movie-Style Average"}
                  </span>
                </div>

                <div className="wa-rating-box">
                  {/* Movie style Average Summary Banner */}
                  <div className="wa-rating-summary-card">
                    <div className="wa-rating-score-display">
                      <span className="wa-score-star">⭐</span>
                      <span className="wa-score-val">{Number(selectedRating.rating || selected.rating || 5.0).toFixed(1)}</span>
                      <span className="wa-score-max">/ 5.0</span>
                    </div>
                    <div className="wa-rating-votes-info">
                      <strong>{selectedRating.count || selected.ratingCount || 0}</strong> {((selectedRating.count || selected.ratingCount || 0) === 1) ? (lang === "kn" ? "ಗ್ರಾಹಕರ ರೇಟಿಂಗ್" : "client rating") : (lang === "kn" ? "ಗ್ರಾಹಕರ ರೇಟಿಂಗ್‌ಗಳು" : "client ratings")}
                      <div className="wa-rating-calc-note">
                        {lang === "kn"
                          ? "ಎಲ್ಲಾ ಗ್ರಾಹಕರ ರೇಟಿಂಗ್‌ಗಳ ಸರಾಸರಿ ಲೆಕ್ಕಾಚಾರ (Movie Rating ಶೈಲಿ)"
                          : "Combined average calculated across all client ratings (Movie Rating Model)"}
                      </div>
                    </div>
                  </div>

                  {/* Star Picker */}
                  <div className="wa-star-picker-container">
                    <div className="wa-star-selection-label">
                      {ratingDraft > 0 ? (
                        <span>
                          {lang === "kn" ? "ನಿಮ್ಮ ಆಯ್ಕೆ:" : "Your selection:"} <strong>{ratingDraft} ★</strong>
                          {selectedRating.votes?.[String(clientId)] ? (
                            <span style={{ color: "#64748b", fontSize: "0.82rem", marginLeft: 6 }}>
                              ({lang === "kn" ? "ದಾಖಲೆಯಲ್ಲಿರುವ ರೇಟಿಂಗ್:" : "Current in records:"} {selectedRating.votes[String(clientId)]} ★)
                            </span>
                          ) : null}
                        </span>
                      ) : selectedRating.votes?.[String(clientId)] ? (
                        <span>
                          {lang === "kn" ? "ನಿಮ್ಮ ಪ್ರಸ್ತುತ ರೇಟಿಂಗ್:" : "Your current rating:"} <strong>{selectedRating.votes[String(clientId)]} ★</strong>
                        </span>
                      ) : (
                        <span>{lang === "kn" ? "ನಕ್ಷತ್ರಗಳನ್ನು ಆರಿಸಿ (1 ರಿಂದ 5):" : "Select stars (1 to 5):"}</span>
                      )}
                    </div>

                    <div className="wa-stars" aria-label="Rate advocate from 1 to 5 stars">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isHovered = hoverRating > 0 && star <= hoverRating;
                        const isSelected = !hoverRating && star <= (ratingDraft || Number(selectedRating.votes?.[String(clientId)] || 0));
                        return (
                          <button
                            key={star}
                            type="button"
                            className={`wa-star-btn ${isHovered || isSelected ? "filled" : ""}`}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setRatingDraft(star)}
                            aria-label={`Select ${star} stars`}
                          >
                            ★
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="wa-rating-submit-row">
                    <button
                      type="button"
                      className="wa-rating-submit-btn"
                      onClick={handleRatingSubmitClick}
                      disabled={!ratingDraft || isSubmittingRating}
                    >
                      {isSubmittingRating
                        ? (lang === "kn" ? "⏳ ಸಲ್ಲಿಸಲಾಗುತ್ತಿದೆ..." : "⏳ Submitting Rating...")
                        : (lang === "kn" ? "⭐ ರೇಟಿಂಗ್ ಸಲ್ಲಿಸಿ (Submit Rating)" : "⭐ Submit Rating")}
                    </button>
                    {ratingDraft > 0 && ratingDraft !== Number(selectedRating.votes?.[String(clientId)] || 0) && (
                      <button
                        type="button"
                        className="wa-rating-cancel-btn"
                        onClick={() => setRatingDraft(Number(selectedRating.votes?.[String(clientId)] || 0))}
                      >
                        {lang === "kn" ? "ಮರುಹೊಂದಿಸಿ" : "Reset"}
                      </button>
                    )}
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
          <button
            type="button"
            className="wa-mobile-back-btn"
            onClick={() => setMobileChatActive(false)}
            title={lang === "kn" ? "ವಕೀಲರ ಪಟ್ಟಿಗೆ ಹಿಂತಿರುಗಿ" : "Back to advocates list"}
            aria-label="Back to advocates list"
          >
            ‹
          </button>
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
                <div className="wa-header-subtitle">
                  {selected.speciality || selected.practiceArea} · {isAdvocatePaid(selected.id) ? (
                    <span style={{ color: "#00a884", fontWeight: 700 }}>✓ {lang === "kn" ? "ಸಕ್ರಿಯ ಸಮಾಲೋಚನೆ" : "Consultation Active"}</span>
                  ) : (
                    <span style={{ color: "#7c3aed", fontWeight: 700 }}>🔒 {lang === "kn" ? "₹10 ಒಂದು ಬಾರಿ ಶುಲ್ಕ" : "₹10 Activation"}</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: "var(--wa-text-secondary)", fontWeight: 600, fontSize: "0.95rem" }}>
              👈 {lang === "kn" ? "ಚಾಟ್ ಮಾಡಲು ಎಡಭಾಗದ ಪಟ್ಟಿಯಿಂದ ವಕೀಲರನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Choose an advocate from the filtered list on the left to start chatting"}
            </div>
          )}
        </div>

        <div className="wa-conversation-canvas">
          {!selected ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", padding: 32, textAlign: "center" }}>
              <div className="wa-empty-consult-icon">
                ⚖️
              </div>
              <h3 className="wa-empty-consult-title">
                {lang === "kn" ? "ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಲು ವಕೀಲರನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Choose an Advocate to Start Consultation"}
              </h3>
              <p className="wa-empty-consult-desc">
                {search ? (
                  <>Showing advocates filtered for <strong>"{search}"</strong> ({displayedAdvocates.length} matching). Click on any advocate from the list on the left to review their profile and start chatting.</>
                ) : (
                  <>Please choose an advocate from the left sidebar to start your consultation.</>
                )}
              </p>
              <button
                type="button"
                className="wa-mobile-choose-adv-btn"
                onClick={() => setMobileChatActive(false)}
              >
                👥 {lang === "kn" ? "ವಕೀಲರ ಪಟ್ಟಿಯನ್ನು ತೆರೆಯಿರಿ" : "View Advocates List"}
              </button>
              {message && (
                <div className="wa-inquiry-box">
                  <span className="wa-inquiry-tag">
                    Prepared Case Inquiry:
                  </span>
                  <p className="wa-inquiry-msg">
                    "{message}"
                  </p>
                  <span className="wa-inquiry-hint">
                    👈 Click any advocate on the left to select them and send this message.
                  </span>
                </div>
              )}
            </div>
          ) : messages.length === 0 ? (
            !isAdvocatePaid(selected.id) ? (
              <div className="wa-adv-first-consult-box">
                <div className="wa-first-consult-icon">⚖️</div>
                <div className="wa-first-consult-title">
                  {lang === "kn"
                    ? `${selected.name} ಅವರೊಂದಿಗೆ ಸಮಾಲೋಚನೆ ಪ್ರಾರಂಭಿಸಿ`
                    : `Start Consultation with ${selected.name}`}
                </div>
                <div className="wa-first-consult-desc">
                  {lang === "kn"
                    ? `ಈ ವಕೀಲರೊಂದಿಗೆ ನೇರ ಚಾಟ್ ಪ್ರಾರಂಭಿಸಲು ಕೇವಲ ₹10 ಒಂದು ಬಾರಿಯ ಸಮಾಲೋಚನಾ ಶುಲ್ಕ ಅನ್ವಯಿಸುತ್ತದೆ. ಸಂದೇಶ ಕಳುಹಿಸಿದಾಗ PhonePe ಸ್ಕ್ಯಾನರ್ ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ.`
                    : `Type your message below and click Send. A nominal one-time ₹10 fee activates direct chat with ${selected.name}. Once paid, you can chat continuously.`}
                </div>
                <div className="wa-first-consult-pill">
                  📱 PhonePe: <strong>9108717353</strong> (UPI: <strong>9108717353-3@ybl</strong>) · ₹10 {lang === "kn" ? "ಒಂದು ಬಾರಿ ಮಾತ್ರ" : "One-Time Fee"}
                </div>
              </div>
            ) : (
              <div className="wa-empty-list">No messages yet. Say hi!</div>
            )
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
              placeholder={
                selected
                  ? isAdvocatePaid(selected.id)
                    ? `Message ${selected.name}…`
                    : lang === "kn"
                      ? `${selected.name} ಅವರಿಗೆ ಸಂದೇಶ ಬರೆಯಿರಿ (₹10 ಸಮಾಲೋಚನಾ ಶುಲ್ಕ)…`
                      : `Message ${selected.name} (₹10 one-time fee to activate)…`
                  : "Select an advocate"
              }
            />
          </div>
          <button className={`wa-send-action-btn ${message.trim() ? 'can-send' : ''}`} onClick={sendMessage} disabled={!selected}>Send</button>
        </div>
      </main>
      </div>

      {/* ========================================================
          ONE-TIME ₹10 PLATFORM FEE PAYMENT MODAL (HIGH Z-INDEX)
          ======================================================== */}
      {showPaymentModal && (
        <div className="wa-pay-overlay" onClick={() => !isProcessingPayment && setShowPaymentModal(false)}>
          <div className={`wa-pay-card ${theme === "dark" ? "dark" : ""}`} onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="wa-pay-header">
              <div className="wa-pay-header-left">
                <div className="wa-pay-badge">{pt.modalBadge}</div>
                <h2 className="wa-pay-title">{pt.modalTitle}</h2>
              </div>
              <div className="wa-pay-header-actions">
                <button
                  type="button"
                  className="wa-pay-lang-toggle"
                  onClick={() => handleLanguageChange(lang === "en" ? "kn" : "en")}
                  title={lang === "en" ? "ಕನ್ನಡಕ್ಕೆ ಬದಲಾಯಿಸಿ" : "Switch to English"}
                >
                  🌐 {lang === "en" ? "ಕನ್ನಡ" : "English"}
                </button>
                {!isProcessingPayment && (
                  <button
                    type="button"
                    className="wa-pay-close-btn"
                    onClick={() => setShowPaymentModal(false)}
                    title="Close"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Uppercase Case Inquiry Preview */}
            <div className="wa-pay-case-box">
              <span className="wa-pay-case-label">{pt.casePreviewTitle}</span>
              <div className="wa-pay-case-text">
                "{(pendingMessage || message || "").toUpperCase()}"
              </div>
              <div className="wa-pay-case-target">
                {pt.advocateTarget} <strong>{(selected?.name || "ADVOCATE").toUpperCase()}</strong> · {((selected?.speciality || selected?.practiceArea) || "LEGAL CONSULTATION").toUpperCase()}
              </div>
            </div>

            {/* Reason for Fee Callout Box */}
            <div className="wa-pay-reason-box">
              <div className="wa-pay-reason-title">{pt.reasonTitle}</div>
              <div className="wa-pay-reason-desc">{pt.reasonDesc}</div>
            </div>

            {/* Scanner & Fee Amount Grid */}
            <div className="wa-pay-body-grid">
              <div className="wa-scanner-card">
                <div className="wa-scanner-badge">🟣 PhonePe / UPI SCAN & PAY ₹10</div>
                <div className="wa-qr-frame">
                  <div className="wa-scanner-laser" />
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`upi://pay?pa=9108717353-3@ybl&pn=Chetan&am=10&cu=INR&tn=Law4U%20Consultation%20${encodeURIComponent(selected?.name || "Advocate")}`)}`}
                    alt="PhonePe UPI QR Scanner"
                    className="wa-qr-img"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const fb = document.getElementById("wa-qr-fallback-svg");
                      if (fb) fb.style.display = "block";
                    }}
                  />
                  <svg id="wa-qr-fallback-svg" style={{ display: "none", width: 160, height: 160 }} viewBox="0 0 100 100">
                    <rect width="100" height="100" fill="#ffffff" />
                    <rect x="10" y="10" width="24" height="24" fill="#000" />
                    <rect x="14" y="14" width="16" height="16" fill="#fff" />
                    <rect x="18" y="18" width="8" height="8" fill="#000" />
                    <rect x="66" y="10" width="24" height="24" fill="#000" />
                    <rect x="70" y="14" width="16" height="16" fill="#fff" />
                    <rect x="74" y="18" width="8" height="8" fill="#000" />
                    <rect x="10" y="66" width="24" height="24" fill="#000" />
                    <rect x="14" y="70" width="16" height="16" fill="#fff" />
                    <rect x="18" y="74" width="8" height="8" fill="#000" />
                    <rect x="42" y="14" width="6" height="6" fill="#000" />
                    <rect x="52" y="24" width="6" height="6" fill="#000" />
                    <rect x="42" y="42" width="16" height="16" fill="#5f259f" />
                    <rect x="66" y="46" width="6" height="6" fill="#000" />
                    <rect x="78" y="56" width="6" height="6" fill="#000" />
                    <rect x="42" y="66" width="6" height="6" fill="#000" />
                    <rect x="54" y="74" width="6" height="6" fill="#000" />
                    <rect x="66" y="80" width="14" height="10" fill="#000" />
                  </svg>
                </div>
                <div className="wa-scanner-phonepe-box">
                  <div className="wa-scanner-number">
                    📱 PhonePe: <strong>9108717353</strong>
                  </div>
                  <div className="wa-scanner-upi-id">
                    UPI ID: <strong>9108717353-3@ybl</strong>
                  </div>
                </div>
                <div className="wa-scanner-apps">PhonePe · GPay · Paytm · Any UPI App</div>
              </div>

              <div className="wa-pay-amount-info">
                <div className="wa-pay-fee-row">
                  <span style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--wa-text-secondary)" }}>{pt.amountLabel}</span>
                  <span className="wa-pay-amount-val">₹10.00</span>
                </div>
                <p className="wa-pay-instruction">{pt.scannerInstruction}</p>
                <ul className="wa-pay-features-list">
                  <li>{pt.lifetimeNotice}</li>
                  <li>{lang === "kn" ? "ನೇರವಾಗಿ ಅನುಮೋದಿತ ವಕೀಲರಿಗೆ ಸಂದೇಶ ರವಾನೆ" : "Instant message delivery directly to specialist advocate"}</li>
                  <li>{lang === "kn" ? "ಸುರಕ್ಷಿತ ಕ್ಲೌಡ್ ಡೇಟಾಬೇಸ್ ಸಂಗ್ರಹಣೆ" : "End-to-end encrypted consultation storage"}</li>
                </ul>
              </div>
            </div>

            {/* Confirm / Pay Button */}
            <div className="wa-pay-actions">
              <button
                type="button"
                className={`wa-pay-confirm-btn ${paymentSuccess ? "success" : ""}`}
                onClick={handleConfirmPayment}
                disabled={isProcessingPayment || paymentSuccess}
              >
                {isProcessingPayment ? pt.verifyingBtn : paymentSuccess ? pt.successBtn : pt.verifyBtn}
              </button>
              {!isProcessingPayment && (
                <button
                  type="button"
                  className="wa-pay-cancel-btn"
                  onClick={() => setShowPaymentModal(false)}
                >
                  {pt.cancelBtn}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
