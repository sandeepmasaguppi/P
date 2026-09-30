// ============================================================
//  clientmainpage.js — Client Main Portal & Legal Clarity Hub
//  Supports: English & Kannada (ಕನ್ನಡ), Word-Target Filtering,
//  and One-Click Advocate Setup.
// ============================================================

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import defaultClarityData from "../data/clarityguide.json";
import { assetUrl } from "../data/api";
import "./clientmainpage.css";

const SESSION_KEY = "law4u_client_id";
const CLIENT_OBJ_KEY = "law4u_client";
const CLIENT_TOKEN_KEY = "law4u_client_token";
const LANG_KEY = "law4u_language";
const THEME_KEY = "law4u_client_theme";
const ITEMS_PER_PAGE = 20;

const AVATAR_PRESETS = [
  "/uploads/chetan.png",
  "/uploads/karna.png",
  "/uploads/anand.png",
  "/uploads/kiran.png",
  "/uploads/deep-p.png",
];

// Localized strings
const I18N = {
  en: {
    portalTitle: "Client Portal",
    clientArea: "👤 Client Area",
    logout: "Logout",
    langButton: "ಕನ್ನಡ",
    theme: "Theme Mode",
    lightTheme: "☀️ Light",
    darkTheme: "🌙 Dark",
    language: "Language",
    chooseAvatar: "Change Avatar Photo",
    uploadPhoto: "Upload Custom Photo",
    chatNav: "💬 Chat with Advocates",
    clarityNav: "⚖️ Legal Clarity Guide",
    clientRole: "Client Account",
    profileSettings: "Profile & Settings",
    hubBadge: "🌟 Client Services Hub",
    welcome: "Welcome",
    hubSubtitle: "Select an option below to proceed. You can connect directly with legal experts or explore our case clarity guide to understand which advocate fits your legal matter.",
    card1Tag: "Direct Communication",
    card1Title: "Chat with Advocates",
    card1Desc: "Browse approved legal practitioners, ask real-time questions, discuss your case details, and get professional advice directly through our secure chat.",
    card1Btn: "Open Advocate Chat →",
    card2Tag: "Case Clarity Purpose",
    card2Title: "Advocate & Case Clarity",
    card2Desc: "Confused about laws, accused parties, or who to hire? Review our legal clarity guide with practical examples to pinpoint the exact law and advocate specialization you need.",
    card2Btn: "View Clarity Guide →",
    backBtn: "← Back to Main Menu",
    chatCta: "💬 Ready to Consult? Chat with Advocates →",
    guideTitle: "⚖️ Legal Clarity Guide for Clients",
    guideSubtitle: "Use this guide to understand your legal situation, identify the governing acts/laws, see who bears liability, confirm who has standing to file, and find the right type of advocate.",
    guideBadge: "📚 Database of 770+ Legal Situations & Specializations",
    allCategories: "All",
    searchPlaceholder: "🔍 Search situation, act/law, accused, who can file, or advocate...",
    clearBtn: "Clear",
    foundResults: (count) => `Found ${count} situation${count === 1 ? "" : "s"}`,
    thSituation: "Situation",
    thActLaw: "Act / Law",
    thAccused: "Who is accused?",
    thWhoCanFile: "Who can file/apply?",
    thAdvocate: "Advocate",
    chatWithAdvocate: "Chat with Advocate →",
    setUpCase: "⚡ Set Up This Case →",
    noResults: (q) => `No legal situations matching "${q}". Try different keywords.`,
    pageOf: (current, total) => `Page ${current} of ${total}`,
    showingOf: (from, to, total) => `Showing ${from} to ${to} of ${total} situations`,
    first: "« First",
    prev: "‹ Prev",
    next: "Next ›",
    last: "Last »",
    tipTitle: "💡 Legal Guidance Tip:",
    tipText: "Many legal matters involve both civil compensation and criminal liability. For example, in road accidents, criminal charges for negligence run in court while the Motor Accident Claims Tribunal (MACT) handles insurance compensation.",
    bannerTitle: "Found the situation matching your case?",
    bannerDesc: "Chat directly with approved advocates specializing in your specific legal domain.",
    bannerBtn: "Proceed to Advocate Chat →",
  },
  kn: {
    portalTitle: "ಕ್ಲೈಂಟ್ ಪೋರ್ಟಲ್",
    clientArea: "👤 ಕ್ಲೈಂಟ್ ವಿಭಾಗ",
    logout: "ಲಾಗ್‌ಔಟ್",
    langButton: "English",
    theme: "ಥೀಮ್ ಮೋಡ್ (Theme)",
    lightTheme: "☀️ ಲೈಟ್ (Light)",
    darkTheme: "🌙 ಡಾರ್ಕ್ (Dark)",
    language: "ಭಾಷೆ (Language)",
    chooseAvatar: "ಅವತಾರ್ ಬದಲಾಯಿಸಿ",
    uploadPhoto: "ಕಸ್ಟಮ್ ಫೋಟೋ ಅಪ್‌ಲೋಡ್",
    chatNav: "💬 ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ",
    clarityNav: "⚖️ ಕಾನೂನು ಸ್ಪಷ್ಟತೆ ಮಾರ್ಗದರ್ಶಿ",
    clientRole: "ಕ್ಲೈಂಟ್ ಖಾತೆ",
    profileSettings: "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್",
    hubBadge: "🌟 ಕ್ಲೈಂಟ್ ಸೇವಾ ಕೇಂದ್ರ",
    welcome: "ಸ್ವಾಗತ",
    hubSubtitle: "ಮುಂದುವರಿಯಲು ಕೆಳಗಿನ ಆಯ್ಕೆಯನ್ನು ಆರಿಸಿ. ನೀವು ನೇರವಾಗಿ ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಬಹುದು ಅಥವಾ ನಿಮ್ಮ ಕೇಸ್‌ಗೆ ಸೂಕ್ತವಾದ ವಕೀಲರನ್ನು ಆಯ್ಕೆ ಮಾಡಲು ನಮ್ಮ ಸ್ಪಷ್ಟತೆ ಮಾರ್ಗದರ್ಶಿಯನ್ನು ಪರಿಶೀಲಿಸಬಹುದು.",
    card1Tag: "ನೇರ ಸಂಭಾಷಣೆ",
    card1Title: "ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ",
    card1Desc: "ಅನುಮೋದಿತ ವಕೀಲರನ್ನು ಹುಡುಕಿ, ನಿಮ್ಮ ಕಾನೂನು ಸಮಸ್ಯೆಗಳನ್ನು ಚರ್ಚಿಸಿ, ಸಂದೇಹಗಳನ್ನು ಕೇಳಿ ಮತ್ತು ಸುರಕ್ಷಿತ ಚಾಟ್ ಮೂಲಕ ತಕ್ಷಣವೇ ಸಲಹೆ ಪಡೆಯಿರಿ.",
    card1Btn: "ವಕೀಲರ ಚಾಟ್ ತೆರೆಯಿರಿ →",
    card2Tag: "ಕೇಸ್ ಸ್ಪಷ್ಟತೆ ಉದ್ದೇಶ",
    card2Title: "ವಕೀಲರು ಮತ್ತು ಕೇಸ್ ಸ್ಪಷ್ಟತೆ",
    card2Desc: "ಯಾವ ಕಾಯ್ದೆ ಅನ್ವಯವಾಗುತ್ತದೆ? ಆರೋಪಿ ಯಾರು? ಯಾವ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಬೇಕು? ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಗೆ ಸೂಕ್ತವಾದ ನಿಖರ ಕಾಯ್ದೆ ಮತ್ತು ವಕೀಲರನ್ನು ತಿಳಿಯಿರಿ.",
    card2Btn: "ಸ್ಪಷ್ಟತೆ ಮಾರ್ಗದರ್ಶಿ ವೀಕ್ಷಿಸಿ →",
    backBtn: "← ಮುಖ್ಯ ಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ",
    chatCta: "💬 ಸಮಾಲೋಚನೆಗೆ ಸಿದ್ಧವೇ? ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ →",
    guideTitle: "⚖️ ಗ್ರಾಹಕರಿಗಾಗಿ ಕಾನೂನು ಸ್ಪಷ್ಟತೆ ಮಾರ್ಗದರ್ಶಿ",
    guideSubtitle: "ನಿಮ್ಮ ಕಾನೂನು ಪರಿಸ್ಥಿತಿಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಿ, ಅನ್ವಯವಾಗುವ ಕಾಯ್ದೆಗಳನ್ನು ತಿಳಿಯಿರಿ, ಹೊಣೆಗಾರಿಕೆ ಯಾರದ್ದು ಮತ್ತು ಯಾವ ವಕೀಲರು ಅಗತ್ಯವೆಂದು ಖಚಿತಪಡಿಸಿಕೊಳ್ಳಿ.",
    guideBadge: "📚 770+ ಕಾನೂನು ಸನ್ನಿವೇಶಗಳು ಮತ್ತು ಪರಿಹಾರಗಳು",
    allCategories: "ಎಲ್ಲಾ",
    searchPlaceholder: "🔍 ಪರಿಸ್ಥಿತಿ, ಕಾಯ್ದೆ, ಆರೋಪಿ, ಅರ್ಜಿ ಸಲ್ಲಿಸುವವರು, ವಕೀಲರನ್ನು ಹುಡುಕಿ...",
    clearBtn: "ತೆರವುಗೊಳಿಸಿ",
    foundResults: (count) => `${count} ಸನ್ನಿವೇಶಗಳು ಕಂಡುಬಂದಿವೆ`,
    thSituation: "ಪರಿಸ್ಥಿತಿ (Situation)",
    thActLaw: "ಕಾಯ್ದೆ / ಕಾನೂನು (Act / Law)",
    thAccused: "ಆರೋಪಿ ಯಾರು? (Accused)",
    thWhoCanFile: "ಯಾರು ಅರ್ಜಿ ಸಲ್ಲಿಸಬಹುದು? (Who can file)",
    thAdvocate: "ವಕೀಲರು (Advocate)",
    chatWithAdvocate: "ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ →",
    setUpCase: "⚡ ಈ ಕೇಸ್ ಸೆಟ್ ಮಾಡಿ →",
    noResults: (q) => `"${q}" ಗೆ ಸಂಬಂಧಿಸಿದ ಯಾವುದೇ ಸನ್ನಿವೇಶಗಳು ಕಂಡುಬಂದಿಲ್ಲ. ಬೇರೆ ಪದಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ.`,
    pageOf: (current, total) => `ಪುಟ ${current} / ${total}`,
    showingOf: (from, to, total) => `${total} ಸನ್ನಿವೇಶಗಳಲ್ಲಿ ${from} ರಿಂದ ${to} ತೋರಿಸಲಾಗುತ್ತಿದೆ`,
    first: "« ಮೊದಲನೆಯದು",
    prev: "‹ ಹಿಂದಿನದು",
    next: "ಮುಂದಿನದು ›",
    last: "ಕೊನೆಯದು »",
    tipTitle: "💡 ಕಾನೂನು ಸಲಹೆ:",
    tipText: "ಅನೇಕ ಕಾನೂನು ವಿಷಯಗಳು ಸಿವಿಲ್ ಪರಿಹಾರ ಮತ್ತು ಕ್ರಿಮಿನಲ್ ಹೊಣೆಗಾರಿಕೆ ಎರಡನ್ನೂ ಒಳಗೊಂಡಿರುತ್ತವೆ. ಉದಾಹರಣೆಗೆ ರಸ್ತೆ ಅಪಘಾತಗಳಲ್ಲಿ ಕ್ರಿಮಿನಲ್ ಪ್ರಕರಣ ನಡೆಯುವ ಜೊತೆಗೆ MACT ನ್ಯಾಯಮಂಡಳಿಯಲ್ಲಿ ಪರಿಹಾರ ಕ್ಲೈಮ್ ಮಾಡಲಾಗುತ್ತದೆ.",
    bannerTitle: "ನಿಮ್ಮ ಸಮಸ್ಯೆಗೆ ಸೂಕ್ತವಾದ ಸನ್ನಿವೇಶ ಸಿಕ್ಕಿತೇ?",
    bannerDesc: "ನಿಮ್ಮ ನಿರ್ದಿಷ್ಟ ಕಾನೂನು ಕ್ಷೇತ್ರದಲ್ಲಿ ಪರಿಣಿತಿ ಹೊಂದಿರುವ ಅನುಮೋದಿತ ವಕೀಲರೊಂದಿಗೆ ನೇರವಾಗಿ ಚಾಟ್ ಮಾಡಿ.",
    bannerBtn: "ವಕೀಲರ ಚಾಟ್‌ಗೆ ಮುಂದುವರಿಯಿರಿ →",
  },
};

// Target keyword mapping to locate matching advocate in ClientDashboard
function getAdvocateSearchKeyword(item) {
  const combined = `${item.advocate || ""} ${item.category || ""} ${item.actLaw || ""}`.toLowerCase();
  if (combined.includes("tax") || combined.includes("income tax") || combined.includes("gst")) return "Tax";
  if (combined.includes("criminal") || combined.includes("bns") || combined.includes("murder") || combined.includes("assault")) return "Criminal";
  if (combined.includes("family") || combined.includes("divorce") || combined.includes("matrimonial") || combined.includes("custody")) return "Family";
  if (combined.includes("property") || combined.includes("land") || combined.includes("rera") || combined.includes("partition")) return "Property";
  if (combined.includes("corporate") || combined.includes("commercial") || combined.includes("company")) return "Corporate";
  if (combined.includes("cyber") || combined.includes("it act") || combined.includes("phishing")) return "Cyber";
  if (combined.includes("motor") || combined.includes("accident") || combined.includes("mact") || combined.includes("civil")) return "Civil";
  if (combined.includes("consumer")) return "Consumer";
  if (combined.includes("labor") || combined.includes("employment")) return "Labor";
  return "Law";
}

// Text Highlighter for Word Targets
function Highlight({ text, words }) {
  if (!text || !words || words.length === 0) return <span>{text || ""}</span>;
  const str = String(text);
  const regex = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  const parts = str.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="cmp-highlight">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}

export default function ClientMainPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Language state: 'en' or 'kn'
  const [lang, setLang] = useState(() => localStorage.getItem(LANG_KEY) || "en");
  const t = I18N[lang] || I18N.en;

  const toggleLanguage = () => {
    const next = lang === "en" ? "kn" : "en";
    setLang(next);
    localStorage.setItem(LANG_KEY, next);
  };

  // Theme state: 'light' or 'dark'
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "light");

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  // If query param ?view=clarity is set, show clarity view directly
  const initialView = searchParams.get("view") === "clarity" ? "clarity" : "hub";
  const [activeView, setActiveView] = useState(initialView);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [clarityData, setClarityData] = useState(defaultClarityData || []);

  // Retrieve client information
  const clientId = Number(localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || 0);
  const clientObj = useMemo(() => {
    try {
      const raw = localStorage.getItem(CLIENT_OBJ_KEY) || sessionStorage.getItem(CLIENT_OBJ_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(() => {
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

  const [avatarTabOpen, setAvatarTabOpen] = useState(false);
  const avatarMenuRef = useRef(null);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(event.target)) {
        setAvatarTabOpen(false);
      }
    };
    if (avatarTabOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [avatarTabOpen]);

  const handleSelectAvatar = (url) => {
    setAvatarUrl(url);
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
      handleSelectAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Fetch from backend /api/clarity-guide if available
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetch("/api/clarity-guide");
        if (res.ok) {
          const remoteData = await res.json();
          if (isMounted && Array.isArray(remoteData) && remoteData.length > 0) {
            setClarityData(remoteData);
          }
        }
      } catch (err) {
        // Fallback to imported JSON
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Unique categories list
  const categories = useMemo(() => {
    const set = new Set();
    clarityData.forEach((item) => {
      const c = lang === "kn" ? (item.categoryKn || item.category) : item.category;
      if (c) set.add(c);
    });
    return ["All", ...Array.from(set)];
  }, [clarityData, lang]);

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(CLIENT_OBJ_KEY);
      sessionStorage.removeItem(CLIENT_OBJ_KEY);
      localStorage.removeItem(CLIENT_TOKEN_KEY);
      sessionStorage.removeItem(CLIENT_TOKEN_KEY);
    } catch (e) {
      /* ignore */
    }
    navigate("/client-login");
  };

  const openClarity = () => {
    setActiveView("clarity");
    setSearchParams({ view: "clarity" });
    setCurrentPage(1);
  };

  const backToHub = () => {
    setActiveView("hub");
    setSearchParams({});
  };

  const navigateToChat = () => {
    navigate("/client-dashboard");
  };

  // Word-Target Tokenizer
  const wordTargets = useMemo(() => {
    return searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
  }, [searchTerm]);

  // Filter clarity data according to Word Targets across all fields
  const filteredData = useMemo(() => {
    let result = clarityData;

    // Filter by Category
    if (selectedCategory !== "All") {
      result = result.filter((item) => {
        const cat = lang === "kn" ? (item.categoryKn || item.category) : item.category;
        return cat === selectedCategory || item.category === selectedCategory;
      });
    }

    // Word Target Filtering (checks situation, actLaw, accused, whoCanFile, advocate in both EN & KN)
    if (wordTargets.length > 0) {
      result = result.filter((item) => {
        const fullSearchableText = [
          String(item.id || ""),
          item.situation || "",
          item.actLaw || "",
          item.actLawDetail || "",
          item.accused || "",
          item.whoCanFile || "",
          item.advocate || "",
          item.category || "",
          item.situationKn || "",
          item.actLawKn || "",
          item.accusedKn || "",
          item.whoCanFileKn || "",
          item.advocateKn || "",
          item.categoryKn || "",
        ]
          .join(" ")
          .toLowerCase();

        // Every word target must match
        return wordTargets.every((word) => fullSearchableText.includes(word));
      });
    }

    return result;
  }, [clarityData, selectedCategory, wordTargets, lang]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const handleCategorySelect = (cat) => {
    setSelectedCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // "Set up that one" — Navigate to Chat with advocate and prefill case details
  const handleSetUpCase = (item) => {
    // Pass the advocate requirement so ClientDashboard filters for matching specialists
    const searchTarget = item.advocate || getAdvocateSearchKeyword(item);
    const situationText = lang === "kn" && item.situationKn ? item.situationKn : item.situation;
    const actText = lang === "kn" && item.actLawKn ? item.actLawKn : item.actLaw;

    const draftMsg =
      lang === "kn"
        ? `ನಮಸ್ಕಾರ ವಕೀಲರೇ, ನನಗೆ ಈ ವಿಷಯದಲ್ಲಿ ಕಾನೂನು ಸಲಹೆ ಬೇಕಾಗಿದೆ: ${situationText} (${actText}).`
        : `Hello Advocate, I need legal consultation regarding my case: ${situationText} (Governed by ${actText}).`;

    navigate(
      `/client-dashboard?search=${encodeURIComponent(searchTarget)}&prefill=${encodeURIComponent(draftMsg)}&caseId=${item.id}`
    );
  };

  return (
    <div className={`cmp-page ${theme === "dark" ? "cmp-dark" : ""}`}>
      {/* Top Navbar */}
      <header className="cmp-navbar">
        <div className="cmp-brand" onClick={backToHub} title="Go to Client Hub">
          <BrandLogo size={32} />
          <div className="cmp-brand-title">
            Law4u <span>{t.portalTitle}</span>
          </div>
        </div>

        <div className="cmp-nav-actions">
          {/* Right-end Profile Avatar Button & Dropdown Menu Tab */}
          <div className="cmp-avatar-wrap" ref={avatarMenuRef}>
            <button
              type="button"
              className={`cmp-avatar-btn ${avatarTabOpen ? "open" : ""}`}
              onClick={() => setAvatarTabOpen((prev) => !prev)}
              aria-expanded={avatarTabOpen}
              title={t.profileSettings}
            >
              <div className="cmp-avatar-circle">
                {avatarUrl ? (
                  <img
                    src={assetUrl(avatarUrl)}
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
              <span className="cmp-avatar-name">{clientObj?.name || "Client"}</span>
              <span className="cmp-avatar-caret">▼</span>
            </button>

            {avatarTabOpen && (
              <div className="cmp-avatar-tab">
                {/* Header with Photo & Details */}
                <div className="cmp-tab-header">
                  <div className="cmp-tab-avatar-wrap">
                    <div className="cmp-tab-avatar">
                      {avatarUrl ? (
                        <img
                          src={assetUrl(avatarUrl)}
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
                  </div>
                  <div className="cmp-tab-info">
                    <div className="cmp-tab-name">{clientObj?.name || "Client"}</div>
                    <div className="cmp-tab-email">{clientObj?.email || "client@law4u.in"}</div>
                    <span className="cmp-tab-badge">{t.clientRole}</span>
                  </div>
                </div>

                {/* Theme Selector: Dark and White/Light Theme */}
                <div className="cmp-tab-section">
                  <div className="cmp-tab-label">{t.theme}</div>
                  <div className="cmp-segmented-control">
                    <button
                      type="button"
                      className={`cmp-seg-btn ${theme === "light" ? "active" : ""}`}
                      onClick={() => handleThemeChange("light")}
                    >
                      {t.lightTheme}
                    </button>
                    <button
                      type="button"
                      className={`cmp-seg-btn ${theme === "dark" ? "active" : ""}`}
                      onClick={() => handleThemeChange("dark")}
                    >
                      {t.darkTheme}
                    </button>
                  </div>
                </div>

                {/* Language Selector: English and Kannada */}
                <div className="cmp-tab-section">
                  <div className="cmp-tab-label">{t.language}</div>
                  <div className="cmp-segmented-control">
                    <button
                      type="button"
                      className={`cmp-seg-btn ${lang === "en" ? "active" : ""}`}
                      onClick={() => {
                        setLang("en");
                        localStorage.setItem(LANG_KEY, "en");
                      }}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={`cmp-seg-btn ${lang === "kn" ? "active" : ""}`}
                      onClick={() => {
                        setLang("kn");
                        localStorage.setItem(LANG_KEY, "kn");
                      }}
                    >
                      ಕನ್ನಡ
                    </button>
                  </div>
                </div>

                {/* Avatar Selection: Presets + Upload */}
                <div className="cmp-tab-section">
                  <div className="cmp-tab-label">{t.chooseAvatar}</div>
                  <div className="cmp-avatar-presets">
                    {AVATAR_PRESETS.map((preset, idx) => (
                      <button
                        type="button"
                        key={idx}
                        className={`cmp-preset-circle ${avatarUrl === preset ? "selected" : ""}`}
                        onClick={() => handleSelectAvatar(preset)}
                        title={`Select Avatar ${idx + 1}`}
                      >
                        <img src={assetUrl(preset)} alt={`Preset ${idx + 1}`} />
                      </button>
                    ))}
                    <label className="cmp-upload-label" title={t.uploadPhoto}>
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

                {/* Navigation Links */}
                <div className="cmp-tab-links">
                  <button
                    type="button"
                    className="cmp-tab-link-btn"
                    onClick={() => {
                      setAvatarTabOpen(false);
                      navigateToChat();
                    }}
                  >
                    {t.chatNav}
                  </button>
                  <button
                    type="button"
                    className="cmp-tab-link-btn"
                    onClick={() => {
                      setAvatarTabOpen(false);
                      openClarity();
                    }}
                  >
                    {t.clarityNav}
                  </button>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  className="cmp-tab-logout-btn"
                  onClick={() => {
                    setAvatarTabOpen(false);
                    handleLogout();
                  }}
                >
                  🚪 {t.logout}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="cmp-container">
        {activeView === "hub" ? (
          /* ========================================================
             VIEW 1: Main Page with 2 Primary Icons / Cards
             ======================================================== */
          <>
            <section className="cmp-hero">
              <div className="cmp-badge">{t.hubBadge}</div>
              <h1 className="cmp-title">
                {t.welcome}, {clientObj?.name || (lang === "kn" ? "ಗ್ರಾಹಕರೇ" : "Valued Client")}
              </h1>
              <p className="cmp-subtitle">{t.hubSubtitle}</p>
            </section>

            <div className="cmp-cards-grid">
              {/* Card 1: Chat with Advocates */}
              <div className="cmp-card chat-card" onClick={navigateToChat} role="button" tabIndex={0}>
                <div className="cmp-icon-wrapper">💬</div>
                <span className="cmp-card-tag">{t.card1Tag}</span>
                <h2 className="cmp-card-title">{t.card1Title}</h2>
                <p className="cmp-card-desc">{t.card1Desc}</p>
                <button
                  className="cmp-card-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToChat();
                  }}
                >
                  {t.card1Btn}
                </button>
              </div>

              {/* Card 2: Legal Clarity Guide */}
              <div className="cmp-card clarity-card" onClick={openClarity} role="button" tabIndex={0}>
                <div className="cmp-icon-wrapper">⚖️</div>
                <span className="cmp-card-tag">
                  {t.card2Tag} ({clarityData.length}+)
                </span>
                <h2 className="cmp-card-title">{t.card2Title}</h2>
                <p className="cmp-card-desc">{t.card2Desc}</p>
                <button
                  className="cmp-card-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openClarity();
                  }}
                >
                  {t.card2Btn}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* ========================================================
             VIEW 2: Inside 2nd Icon - Legal Clarity Guide
             ======================================================== */
          <section className="cmp-clarity-view">
            <div className="cmp-view-topbar">
              <button className="cmp-btn-back" onClick={backToHub}>
                {t.backBtn}
              </button>

              <button className="cmp-btn-chat-cta" onClick={navigateToChat}>
                {t.chatCta}
              </button>
            </div>

            <div className="cmp-clarity-header">
              <h2>{t.guideTitle}</h2>
              <p>{t.guideSubtitle}</p>
              <div className="cmp-case-badge">{t.guideBadge}</div>
            </div>

            {/* Category Filter Scroll */}
            <div className="cmp-filter-scroll">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`cmp-filter-pill ${selectedCategory === cat ? "active" : ""}`}
                  onClick={() => handleCategorySelect(cat)}
                >
                  {cat === "All" ? (lang === "kn" ? "ಎಲ್ಲಾ" : "All") : cat}
                </button>
              ))}
            </div>

            {/* Quick Word-Target Search */}
            <div style={{ marginTop: 16, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                style={{
                  width: "100%",
                  maxWidth: 560,
                  padding: "10px 14px",
                  borderRadius: 10,
                  border: "1px solid #cbd5e1",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
              {searchTerm && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setCurrentPage(1);
                  }}
                  style={{
                    padding: "9px 14px",
                    background: "#f1f5f9",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: "0.85rem",
                  }}
                >
                  {t.clearBtn}
                </button>
              )}
              <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "auto", whiteSpace: "nowrap" }}>
                {t.foundResults(filteredData.length)}
              </span>
            </div>

            {/* Clarity Table with Word-Target Highlighting */}
            <div className="cmp-table-wrapper">
              <table className="cmp-table">
                <thead>
                  <tr>
                    <th style={{ width: "23%" }}>{t.thSituation}</th>
                    <th style={{ width: "22%" }}>{t.thActLaw}</th>
                    <th style={{ width: "18%" }}>{t.thAccused}</th>
                    <th style={{ width: "19%" }}>{t.thWhoCanFile}</th>
                    <th style={{ width: "18%" }}>{t.thAdvocate}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.map((row) => {
                    const displaySituation = lang === "kn" && row.situationKn ? row.situationKn : row.situation;
                    const displayActLaw = lang === "kn" && row.actLawKn ? row.actLawKn : row.actLaw;
                    const displayAccused = lang === "kn" && row.accusedKn ? row.accusedKn : row.accused;
                    const displayWhoCanFile = lang === "kn" && row.whoCanFileKn ? row.whoCanFileKn : row.whoCanFile;
                    const displayAdvocate = lang === "kn" && row.advocateKn ? row.advocateKn : row.advocate;
                    const displayCategory = lang === "kn" && row.categoryKn ? row.categoryKn : row.category;

                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="cmp-situation-title">
                            <Highlight text={displaySituation} words={wordTargets} />
                          </div>
                          {displayCategory && (
                            <div style={{ marginTop: 4 }}>
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  background: "#f1f5f9",
                                  color: "#475569",
                                  padding: "2px 6px",
                                  borderRadius: 4,
                                }}
                              >
                                🏷️ <Highlight text={displayCategory} words={wordTargets} />
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="cmp-law-tag">
                            <Highlight text={displayActLaw} words={wordTargets} />
                          </span>
                          {row.actLawDetail && (
                            <div className="cmp-law-sub">
                              <Highlight text={row.actLawDetail} words={wordTargets} />
                            </div>
                          )}
                        </td>
                        <td>
                          <strong>
                            <Highlight text={displayAccused} words={wordTargets} />
                          </strong>
                        </td>
                        <td>
                          <Highlight text={displayWhoCanFile} words={wordTargets} />
                        </td>
                        <td>
                          <div className="cmp-advocate-chip">
                            🛡️ <Highlight text={displayAdvocate} words={wordTargets} />
                          </div>
                          <div>
                            <button
                              className="cmp-row-cta-btn"
                              onClick={() => handleSetUpCase(row)}
                              title={lang === "kn" ? "ಈ ಪ್ರಕರಣವನ್ನು ಸೆಟ್ ಮಾಡಿ ವಕೀಲರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ" : "Set up and chat with an advocate"}
                            >
                              {t.setUpCase}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ textAlign: "center", padding: 36, color: "#64748b" }}>
                        {t.noResults(searchTerm)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="cmp-pagination">
                <div className="cmp-page-info">
                  {t.showingOf(
                    (currentPage - 1) * ITEMS_PER_PAGE + 1,
                    Math.min(currentPage * ITEMS_PER_PAGE, filteredData.length),
                    filteredData.length
                  )}{" "}
                  ({t.pageOf(currentPage, totalPages)})
                </div>
                <div className="cmp-page-controls">
                  <button
                    className="cmp-page-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    {t.first}
                  </button>
                  <button
                    className="cmp-page-btn"
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    {t.prev}
                  </button>
                  <span style={{ fontSize: "0.85rem", padding: "0 8px", fontWeight: 600 }}>
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    className="cmp-page-btn"
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    {t.next}
                  </button>
                  <button
                    className="cmp-page-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    {t.last}
                  </button>
                </div>
              </div>
            )}

            {/* Practical Example Tip */}
            <div className="cmp-tip-box">
              <strong>{t.tipTitle}</strong> {t.tipText}
            </div>

            {/* Bottom Banner */}
            <div className="cmp-bottom-banner">
              <div className="cmp-banner-text">
                <h3>{t.bannerTitle}</h3>
                <p>{t.bannerDesc}</p>
              </div>
              <button className="cmp-banner-btn" onClick={navigateToChat}>
                {t.bannerBtn}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
