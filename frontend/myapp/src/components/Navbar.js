import React, { useState, useRef, useEffect } from "react";
import "./Navbar.css";
import { Link, useNavigate, useLocation } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { getTheme, toggleTheme } from "../data/themeStore";

const LAWYER_CATEGORIES_EN = [
  { icon: "👨‍👩‍👧", label: "Person / Family", desc: "Divorce, custody, marriage, adoption", path: "/find-lawyer?cat=family" },
  { icon: "🔒", label: "Criminal / Property", desc: "FIR, bail, property disputes, theft", path: "/find-lawyer?cat=criminal" },
  { icon: "⚖️", label: "Civil / Debt Matter", desc: "Civil suits, debt recovery, contracts", path: "/find-lawyer?cat=civil" },
  { icon: "🏢", label: "Corporate Law", desc: "Company, GST, tax, compliance", path: "/find-lawyer?cat=corporate" },
];

const LAWYER_CATEGORIES_KN = [
  { icon: "👨‍👩‍👧", label: "ವ್ಯಕ್ತಿ / ಕುಟುಂಬ", desc: "ವಿಚ್ಛೇದನ, ಪಾಲನೆ, ವಿವಾಹ, ದತ್ತು", path: "/find-lawyer?cat=family" },
  { icon: "🔒", label: "ಕ್ರಿಮಿನಲ್ / ಆಸ್ತಿ", desc: "ಎಫ್‌ಐಆರ್, ಜಾಮೀನು, ಆಸ್ತಿ ವಿವಾದಗಳು", path: "/find-lawyer?cat=criminal" },
  { icon: "⚖️", label: "ಸಿವಿಲ್ / ಸಾಲ ಪ್ರಕರಣ", desc: "ಸಿವಿಲ್ ದಾವೆಗಳು, ಸಾಲ ವಸೂಲಾತಿ, ಒಪ್ಪಂದಗಳು", path: "/find-lawyer?cat=civil" },
  { icon: "🏢", label: "ಕಾರ್ಪೊರೇಟ್ ಕಾನೂನು", desc: "ಕಂಪನಿ, ಜಿಎಸ್‌ಟಿ, ತೆರಿಗೆ, ನಿಯಮಾವಳಿ", path: "/find-lawyer?cat=corporate" },
];

const LEGAL_ADVICE_EN = [
  { icon: "❓", label: "Ask a Question", path: "/legal-advice/ask-question" },
  { icon: "📋", label: "Legal Documents", path: "/legal-advice/documents" },
  { icon: "🏛️", label: "Bare Acts", path: "/legal-advice/bare-acts" },
  { icon: "📰", label: "Legal News", path: "/legal-advice/news" },
];

const LEGAL_ADVICE_KN = [
  { icon: "❓", label: "ಪ್ರಶ್ನೆ ಕೇಳಿ", path: "/legal-advice/ask-question" },
  { icon: "📋", label: "ಕಾನೂನು ದಾಖಲೆಗಳು", path: "/legal-advice/documents" },
  { icon: "🏛️", label: "ಕಾನೂನು ಕಾಯಿದೆಗಳು", path: "/legal-advice/bare-acts" },
  { icon: "📰", label: "ಕಾನೂನು ಸುದ್ದಿಗಳು", path: "/legal-advice/news" },
];

const ABOUT_EN = [
  { icon: "ℹ️", label: "About Us", path: "/aboutus" },
  { icon: "📞", label: "Contact", path: "/Contact" },
  { icon: "🤝", label: "Partners", path: "/Partners" },
];

const ABOUT_KN = [
  { icon: "ℹ️", label: "ನಮ್ಮ ಬಗ್ಗೆ", path: "/aboutus" },
  { icon: "📞", label: "ಸಂಪರ್ಕಿಸಿ", path: "/Contact" },
  { icon: "🤝", label: "ಪಾಲುದಾರರು", path: "/Partners" },
];

function Dropdown({ items, onClose }) {
  return (
    <div className="lw-dropdown" onClick={(e) => e.stopPropagation()}>
      {items.map((item) => (
        <Link key={item.label} to={item.path} className="lw-dropdown-item" onClick={onClose}>
          <span className="lw-dd-icon">{item.icon}</span>
          <div>
            <div className="lw-dd-label">{item.label}</div>
            {item.desc && <div className="lw-dd-desc">{item.desc}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
}

function LawyerMegaMenu({ onClose, isKn }) {
  const navigate = useNavigate();
  const categories = isKn ? LAWYER_CATEGORIES_KN : LAWYER_CATEGORIES_EN;

  return (
    <div className="lw-mega-menu" onClick={(e) => e.stopPropagation()}>
      <div className="lw-mega-title">
        {isKn ? "ವಿಭಾಗವಾರು ವಕೀಲರನ್ನು ಹುಡುಕಿ" : "Find A Lawyer By Category"}
      </div>
      <div className="lw-mega-grid">
        {categories.map((cat) => (
          <Link key={cat.label} to={cat.path} className="lw-mega-card" onClick={onClose}>
            <span className="lw-mega-icon">{cat.icon}</span>
            <div className="lw-mega-card-label">{cat.label}</div>
            <div className="lw-mega-card-desc">{cat.desc}</div>
          </Link>
        ))}
      </div>
      <div className="lw-mega-footer">
        <Link to="/find-lawyer" className="lw-mega-all" onClick={onClose}>
          {isKn ? "ಎಲ್ಲಾ ವಕೀಲರನ್ನು ನೋಡಿ →" : "View All Lawyers →"}
        </Link>
        <button
          className="lw-mega-talk"
          onClick={() => {
            onClose();
            navigate("/talk-to-advocate");
          }}
        >
          {isKn ? "ಈಗಲೇ ವಕೀಲರೊಂದಿಗೆ ಮಾತನಾಡಿ" : "Talk to a Lawyer Now"}
        </button>
      </div>
    </div>
  );
}

export default function Navbar() {
  const [openMenu, setOpenMenu] = useState(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef(null);
  const profileRef = useRef(null);
  const location = useLocation();

  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("law4u_home_lang") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    const handleLang = (e) => {
      if (e?.detail) setLang(e.detail);
      else {
        try {
          setLang(localStorage.getItem("law4u_home_lang") || "en");
        } catch {}
      }
    };
    window.addEventListener("law4u_lang_change", handleLang);
    window.addEventListener("storage", handleLang);
    return () => {
      window.removeEventListener("law4u_lang_change", handleLang);
      window.removeEventListener("storage", handleLang);
    };
  }, []);

  const handleLangChange = (newLang) => {
    setLang(newLang);
    try {
      localStorage.setItem("law4u_home_lang", newLang);
      window.dispatchEvent(new CustomEvent("law4u_lang_change", { detail: newLang }));
    } catch {}
  };

  useEffect(() => {
    function handleClick(e) {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenMenu(null);
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [theme, setNavTheme] = useState(getTheme);

  useEffect(() => {
    const handleTheme = (e) => {
      setNavTheme(e?.detail || getTheme());
    };
    window.addEventListener("law4u_theme_change", handleTheme);
    return () => window.removeEventListener("law4u_theme_change", handleTheme);
  }, []);

  const toggle = (menu) => {
    setIsProfileOpen(false);
    setOpenMenu((prev) => (prev === menu ? null : menu));
  };

  const toggleProfile = (e) => {
    if (e) e.stopPropagation();
    setOpenMenu(null);
    setIsProfileOpen((prev) => !prev);
  };

  // Close all menus and mobile drawer when any link is clicked
  const handleLinkClick = () => {
    setOpenMenu(null);
    setIsProfileOpen(false);
    setIsMobileMenuOpen(false);
  };

  // If a client is logged in and on client pages, hide the global navbar
  const clientId = Number(localStorage.getItem("law4u_client_id") || sessionStorage.getItem("law4u_client_id") || 0);
  if (clientId && (location.pathname === "/client-dashboard" || location.pathname.startsWith("/client"))) {
    return null;
  }

  const isKn = lang === "kn";
  const legalAdviceItems = isKn ? LEGAL_ADVICE_KN : LEGAL_ADVICE_EN;
  const aboutItems = isKn ? ABOUT_KN : ABOUT_EN;

  return (
    <nav className="lw-navbar" ref={navRef}>
      {/* ── Main 100% Full-Width Navbar (Black upper strip removed) ── */}
      <div className="lw-nav-inner">
        {/* Logo */}
        <Link to="/" className="lw-logo" onClick={handleLinkClick}>
          <BrandLogo size={34} dark={theme === "dark"} />
          <span className="lw-logo-tagline">
            {isKn ? "ಅತ್ಯುತ್ತಮ ಕಾನೂನು ವೇದಿಕೆ" : "Best Legal Platform"}
          </span>
        </Link>

        {/* Nav links (100% fluid) */}
        <div className={`lw-nav-links ${isMobileMenuOpen ? "active" : ""}`}>
          {/* Mobile Settings Section: One row per setting */}
          <div className="lw-mobile-profile-details">
            {/* Row 1: Language */}
            <div className="lw-mobile-row">
              <span className="lw-mobile-label">🌐 {isKn ? "ಭಾಷೆ:" : "Language:"}</span>
              <div className="lw-mobile-lang-pills">
                <button
                  type="button"
                  className={`lw-mobile-lang-pill ${lang === "en" ? "active" : ""}`}
                  onClick={() => handleLangChange("en")}
                >
                  English
                </button>
                <button
                  type="button"
                  className={`lw-mobile-lang-pill ${lang === "kn" ? "active" : ""}`}
                  onClick={() => handleLangChange("kn")}
                >
                  ಕನ್ನಡ
                </button>
              </div>
            </div>

            {/* Row 2: Theme */}
            <div className="lw-mobile-row">
              <span className="lw-mobile-label">{theme === "dark" ? "🌙" : "☀️"} {isKn ? "ಥೀಮ್:" : "Theme:"}</span>
              <button
                type="button"
                className={`lw-mobile-theme-btn ${theme === "dark" ? "is-dark" : "is-light"}`}
                onClick={() => toggleTheme()}
                title={theme === "dark" ? (isKn ? "ಬೆಳಕಿನ ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ" : "Switch to Light Theme") : (isKn ? "ಕಪ್ಪು ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ" : "Switch to Dark Theme")}
              >
                <span>{theme === "dark" ? (isKn ? "☀️ ಬೆಳಕು (Light)" : "☀️ Light Mode") : (isKn ? "🌙 ಕಪ್ಪು (Dark)" : "🌙 Dark Mode")}</span>
              </button>
            </div>
          </div>

          <Link to="/" className="lw-nav-link" onClick={handleLinkClick}>
            {isKn ? "ಮುಖಪುಟ" : "Home"}
          </Link>

          {/* Find A Lawyer */}
          <div className="lw-nav-item">
            <button
              className={`lw-nav-link lw-has-drop ${openMenu === "lawyer" ? "active" : ""}`}
              onClick={() => toggle("lawyer")}
            >
              {isKn ? "ವಕೀಲರನ್ನು ಹುಡುಕಿ" : "Find A Lawyer"} <span className="lw-arrow"></span>
            </button>
            {openMenu === "lawyer" && <LawyerMegaMenu onClose={handleLinkClick} isKn={isKn} />}
          </div>

          {/* Legal Advice */}
          <div className="lw-nav-item">
            <button
              className={`lw-nav-link lw-has-drop ${openMenu === "advice" ? "active" : ""}`}
              onClick={() => toggle("advice")}
            >
              {isKn ? "ಕಾನೂನು ಸಲಹೆ" : "Legal Advice"} <span className="lw-arrow"></span>
            </button>
            {openMenu === "advice" && <Dropdown items={legalAdviceItems} onClose={handleLinkClick} />}
          </div>

          {/* About */}
          <div className="lw-nav-item">
            <button
              className={`lw-nav-link lw-has-drop ${openMenu === "about" ? "active" : ""}`}
              onClick={() => toggle("about")}
            >
              {isKn ? "ನಮ್ಮ ಬಗ್ಗೆ" : "About"} <span className="lw-arrow"></span>
            </button>
            {openMenu === "about" && <Dropdown items={aboutItems} onClose={handleLinkClick} />}
          </div>

          {/* Lawyer Signup & Admin links */}
          <Link to="/signup" className="lw-nav-link" onClick={handleLinkClick}>
            {isKn ? "ವಕೀಲರ ನೋಂದಣಿ" : "Lawyer Signup"}
          </Link>
          <Link to="/admin" className="lw-nav-link" onClick={handleLinkClick}>
            {isKn ? "ಅಡ್ಮಿನ್" : "Admin"}
          </Link>

          {/* Mobile direct auth links inside drawer */}
          <div className="lw-mobile-auth-links">
            <Link to="/login" className="lw-nav-link lw-mobile-only" onClick={handleLinkClick}>
              👨‍⚖️ {isKn ? "ವಕೀಲರ ಲಾಗಿನ್" : "Advocate Login"}
            </Link>
            <Link to="/client-login" className="lw-nav-link lw-mobile-only" onClick={handleLinkClick}>
              👥 {isKn ? "ಗ್ರಾಹಕರ ಲಾಗಿನ್" : "Client Login"}
            </Link>
          </div>
        </div>

        {/* ── Right Actions: Profile / Three-Dot Settings Menu + Mobile Toggle ── */}
        <div className="lw-nav-right-actions">
          {/* Profile & Three-Dot Menu Trigger */}
          <div className="lw-nav-profile-wrapper" ref={profileRef}>
            <button
              type="button"
              className={`lw-nav-profile-btn ${isProfileOpen ? "active" : ""}`}
              onClick={toggleProfile}
              title={isKn ? "ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್ಸ್" : "Advocates Hub – Profile & Settings"}
              aria-label="Advocates Hub Profile and Settings"
              aria-expanded={isProfileOpen}
            >
              <span className="lw-profile-avatar-circle">👤</span>
              <span className="lw-profile-dots-icon">⋮</span>
            </button>

            {/* Profile Dropdown Opened on Click */}
            {isProfileOpen && (
              <div className="lw-profile-dropdown" onClick={(e) => e.stopPropagation()}>
                {/* Row 1: Language Switcher */}
                <div className="lw-profile-row">
                  <div className="lw-profile-row-label">
                    <span className="lw-row-icon">🌐</span>
                    <span>{isKn ? "ಭಾಷೆ" : "Language"}</span>
                  </div>
                  <div className="lw-profile-lang-pills">
                    <button
                      type="button"
                      className={`lw-profile-lang-pill ${lang === "en" ? "active" : ""}`}
                      onClick={() => handleLangChange("en")}
                    >
                      English
                    </button>
                    <button
                      type="button"
                      className={`lw-profile-lang-pill ${lang === "kn" ? "active" : ""}`}
                      onClick={() => handleLangChange("kn")}
                    >
                      ಕನ್ನಡ
                    </button>
                  </div>
                </div>

                <div className="lw-profile-dropdown-divider" />

                {/* Row 2: Theme Switcher */}
                <div className="lw-profile-row">
                  <div className="lw-profile-row-label">
                    <span className="lw-row-icon">{theme === "dark" ? "🌙" : "☀️"}</span>
                    <span>{isKn ? "ಥೀಮ್" : "Theme"}</span>
                  </div>
                  <button
                    type="button"
                    className={`lw-profile-theme-toggle ${theme === "dark" ? "is-dark" : "is-light"}`}
                    onClick={() => toggleTheme()}
                    title={theme === "dark" ? (isKn ? "ಬೆಳಕಿನ ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ" : "Switch to Light Theme") : (isKn ? "ಕಪ್ಪು ಥೀಮ್‌ಗೆ ಬದಲಿಸಿ" : "Switch to Dark Theme")}
                  >
                    <span className="lw-ptt-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
                    <span className="lw-ptt-text">
                      {theme === "dark" ? (isKn ? "ಬೆಳಕು (Light)" : "Light") : (isKn ? "ಕಪ್ಪು (Dark)" : "Dark")}
                    </span>
                  </button>
                </div>

                <div className="lw-profile-dropdown-divider" />

                {/* Row 3: Advocate Login */}
                <div className="lw-profile-link-row">
                  <Link to="/login" className="lw-profile-dropdown-link" onClick={handleLinkClick}>
                    <div className="lw-pdl-left">
                      <span className="lw-pml-icon">👨‍⚖️</span>
                      <span>{isKn ? "ವಕೀಲರ ಲಾಗಿನ್" : "Advocate Login"}</span>
                    </div>
                    <span className="lw-pdl-arrow">→</span>
                  </Link>
                </div>

                <div className="lw-profile-dropdown-divider" />

                {/* Row 4: Client Login */}
                <div className="lw-profile-link-row">
                  <Link to="/client-login" className="lw-profile-dropdown-link" onClick={handleLinkClick}>
                    <div className="lw-pdl-left">
                      <span className="lw-pml-icon">👥</span>
                      <span>{isKn ? "ಗ್ರಾಹಕರ ಲಾಗಿನ್" : "Client Login"}</span>
                    </div>
                    <span className="lw-pdl-arrow">→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Hamburger Menu Toggle Button for Mobile/Tabs */}
          <button 
            className="lw-menu-toggle" 
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>
    </nav>
  );
}
