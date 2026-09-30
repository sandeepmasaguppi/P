// Home.js — Law4u Main Page (7 sections) with English & Kannada Toggle
import React, { useState, useEffect } from "react";
import "./Home.css";
import { useNavigate } from "react-router-dom";
import AdvocatesList from "./AdvocatesList";
import { getAdvocates } from "../data/Advocatesstore";
import laptopImage from "../images/Laptop.png";

const PRACTICE_TYPES_EN = [
  { icon: "👨‍👩‍👧", label: "Person / Family", category: "family", desc: "Divorce, custody, marriage, adoption, maintenance" },
  { icon: "🔒", label: "Criminal / Property", category: "criminal", desc: "FIR, bail, property disputes, POCSO, cybercrime" },
  { icon: "⚖️", label: "Civil / Debt Matter", category: "civil", desc: "Civil suits, debt recovery, money recovery, NI Act" },
  { icon: "🏢", label: "Corporate Law", category: "corporate", desc: "Company registration, GST, tax, compliance, IPR" },
];

const PRACTICE_TYPES_KN = [
  { icon: "👨‍👩‍👧", label: "ವ್ಯಕ್ತಿ / ಕುಟುಂಬ ಕಾನೂನು", category: "family", desc: "ವಿಚ್ಛೇದನ, ಮಕ್ಕಳ ಪಾಲನೆ, ವಿವಾಹ, ದತ್ತು, ಜೀವನಾಂಶ" },
  { icon: "🔒", label: "ಕ್ರಿಮಿನಲ್ / ಆಸ್ತಿ ವಿವಾದ", category: "criminal", desc: "ಎಫ್‌ಐಆರ್, ಜಾಮೀನು, ಆಸ್ತಿ ಕಲಹಗಳು, ಪೋಕ್ಸೊ, ಸೈಬರ್ ಕ್ರೈಮ್" },
  { icon: "⚖️", label: "ಸಿವಿಲ್ / ಸಾಲ ವಸೂಲಾತಿ", category: "civil", desc: "ಸಿವಿಲ್ ದಾವೆಗಳು, ಸಾಲ ವಸೂಲಾತಿ, ಹಣಕಾಸು ವಿವಾದ, ಚೆಕ್ ಬೌನ್ಸ್" },
  { icon: "🏢", label: "ಕಾರ್ಪೊರೇಟ್ ಕಾನೂನು", category: "corporate", desc: "ಕಂಪನಿ ನೋಂದಣಿ, ಜಿಎಸ್‌ಟಿ, ತೆರಿಗೆ, ನಿಯಮಾವಳಿಗಳು, ಐಪಿಆರ್" },
];

const FAQS_EN = [
  { q: "What is Advocates Hub?", a: "Advocates Hub is India's best legal platform connecting citizens with trusted advocates and providing legal information, bare acts, and AI-powered legal guidance." },
  { q: "How do I find a lawyer on Advocates Hub?", a: "Use the 'Find A Lawyer' section to search by city, practice area, or legal issue. Browse profiles, check ratings, and connect directly." },
  { q: "Is consulting a lawyer on Advocates Hub free?", a: "Initial consultation charges vary by advocate. Many offer free first consultations. You can check individual advocate profiles for their guidance." },
  { q: "Can I get legal advice online?", a: "Yes! Advocates Hub provides an AI-powered Legal Advisor and also lets you post legal questions that experienced advocates can answer." },
  { q: "What types of lawyers are available?", a: "Criminal, family, property, civil, corporate, tax, consumer, cyber, immigration, labour, and many more practice areas are covered." },
];

const FAQS_KN = [
  { q: "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಎಂದರೇನು?", a: "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಭಾರತದ ಪ್ರಮುಖ ಕಾನೂನು ವೇದಿಕೆಯಾಗಿದ್ದು, ನಾಗರಿಕರನ್ನು ವಿಶ್ವಾಸಾರ್ಹ ವಕೀಲರೊಂದಿಗೆ ಸಂಪರ್ಕಿಸುತ್ತದೆ ಮತ್ತು ಕಾನೂನು ಮಾಹಿತಿ, ಕಾಯಿದೆಗಳು ಹಾಗೂ ಎಐ ಕಾನೂನು ಮಾರ್ಗದರ್ಶನವನ್ನು ಒದಗಿಸುತ್ತದೆ." },
  { q: "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್‌ನಲ್ಲಿ ವಕೀಲರನ್ನು ಹುಡುಕುವುದು ಹೇಗೆ?", a: "'ವಕೀಲರನ್ನು ಹುಡುಕಿ' ವಿಭಾಗದ ಮೂಲಕ ನಗರ ಅಥವಾ ವಕಾಲತ್ತು ಕ್ಷೇತ್ರದ ಆಧಾರದ ಮೇಲೆ ಹುಡುಕಿ. ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ." },
  { q: "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್‌ನಲ್ಲಿ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸುವುದು ಹೇಗೆ?", a: "ನೀವು ವಕೀಲರ ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಿ ಚಾಟ್, ಕರೆ ಅಥವಾ ಭೇಟಿಯ ಸಮಯವನ್ನು ಸುಲಭವಾಗಿ ಬುಕ್ ಮಾಡಬಹುದು." },
  { q: "ನಾನು ಆನ್‌ಲೈನ್‌ನಲ್ಲಿ ಕಾನೂನು ಸಲಹೆ ಪಡೆಯಬಹುದೇ?", a: "ಹೌದು! ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಎಐ ಆಧಾರಿತ ಕಾನೂನು ಸಹಾಯಕವನ್ನು ಒದಗಿಸುತ್ತದೆ ಮತ್ತು ಅನುಭವಿ ವಕೀಲರಿಂದ ಉತ್ತರ ಪಡೆಯಲು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಲು ಅನುಮತಿಸುತ್ತದೆ." },
  { q: "ಯಾವ ರೀತಿಯ ವಕೀಲರು ಲಭ್ಯವಿದ್ದಾರೆ?", a: "ಕ್ರಿಮಿನಲ್, ಕೌಟುಂಬಿಕ, ಆಸ್ತಿ, ಸಿವಿಲ್, ಕಾರ್ಪೊರೇಟ್, ತೆರಿಗೆ, ಗ್ರಾಹಕ ವೇದಿಕೆ, ಸೈಬರ್ ಕ್ರೈಮ್ ಮತ್ತು ಕಾರ್ಮಿಕ ಕಾನೂನು ತಜ್ಞರು ಲಭ್ಯವಿದ್ದಾರೆ." },
];

const HOW_IT_WORKS_EN = [
  { step: "01", icon: "🔍", title: "Search", desc: "Select your city and legal issue to find matching advocates in your area." },
  { step: "02", icon: "👤", title: "Choose", desc: "View advocate profiles, experience, and ratings. Pick the best fit." },
  { step: "03", icon: "💬", title: "Connect", desc: "Chat, call, or schedule a consultation directly with your chosen advocate." },
  { step: "04", icon: "✅", title: "Resolve", desc: "Get expert legal guidance and resolve your matter with confidence." },
];

const HOW_IT_WORKS_KN = [
  { step: "01", icon: "🔍", title: "ಹುಡುಕಿ", desc: "ನಿಮ್ಮ ನಗರ ಮತ್ತು ಕಾನೂನು ಸಮಸ್ಯೆಯನ್ನು ಆಯ್ಕೆ ಮಾಡಿ ನಿಮ್ಮ ಪ್ರದೇಶದ ವಕೀಲರನ್ನು ಹುಡುಕಿ." },
  { step: "02", icon: "👤", title: "ಆಯ್ಕೆಮಾಡಿ", desc: "ವಕೀಲರ ಪ್ರೊಫೈಲ್, ಅನುಭವ ಮತ್ತು ರೇಟಿಂಗ್‌ಗಳನ್ನು ನೋಡಿ ಸೂಕ್ತ ವಕೀಲರನ್ನು ಆಯ್ಕೆಮಾಡಿ." },
  { step: "03", icon: "💬", title: "ಸಂಪರ್ಕಿಸಿ", desc: "ನೇರವಾಗಿ ಸಂದೇಶ ಕಳುಹಿಸಿ, ಕರೆ ಮಾಡಿ ಅಥವಾ ಸಮಾಲೋಚನೆ ಸಮಯ ನಿಗದಿಪಡಿಸಿ." },
  { step: "04", icon: "✅", title: "ಪರಿಹರಿಸಿ", desc: "ತಜ್ಞ ಕಾನೂನು ಮಾರ್ಗದರ್ಶನ ಪಡೆದು ನಿಮ್ಮ ಪ್ರಕರಣವನ್ನು ವಿಶ್ವಾಸದಿಂದ ಪರಿಹರಿಸಿ." },
];

const STATS_EN = [
  { value: "50,000+", label: "Registered Advocates" },
  { value: "5 Lakh+", label: "Happy Clients" },
  { value: "700+", label: "Cities Covered" },
  { value: "4.9★", label: "Average Rating" },
];

const STATS_KN = [
  { value: "50,000+", label: "ನೋಂದಾಯಿತ ವಕೀಲರು" },
  { value: "5 ಲಕ್ಷ+", label: "ತೃಪ್ತ ಗ್ರಾಹಕರು" },
  { value: "700+", label: "ಒಳಗೊಂಡಿರುವ ನಗರಗಳು" },
  { value: "4.9★", label: "ಸರಾಸರಿ ರೇಟಿಂಗ್" },
];

const FOOTER_LINKS = {
  "Privacy Policy": "/privacy",
  "Terms of Use": "/terms",
  "Contact Us": "/Contact",
  "About Us": "/aboutus",
  "Lawyer Signup": "/signup",
  "ಗೌಪ್ಯತೆ ನೀತಿ": "/privacy",
  "ಬಳಕೆಯ ನಿಯಮಗಳು": "/terms",
  "ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ": "/Contact",
  "ನಮ್ಮ ಬಗ್ಗೆ": "/aboutus",
  "ವಕೀಲರ ನೋಂದಣಿ": "/signup",
};

const FOOTER_ITEMS_EN = ["Privacy Policy", "Terms of Use", "Contact Us", "About Us", "Lawyer Signup"];
const FOOTER_ITEMS_KN = ["ಗೌಪ್ಯತೆ ನೀತಿ", "ಬಳಕೆಯ ನಿಯಮಗಳು", "ನಮ್ಮನ್ನು ಸಂಪರ್ಕಿಸಿ", "ನಮ್ಮ ಬಗ್ಗೆ", "ವಕೀಲರ ನೋಂದಣಿ"];

// Read through advocatesStore (not raw advocates.json) so ids stay
// consistent with Login.js / AdvocateDashboard.js / Profile.js.
// Only "approved" advocates are shown publicly.
const ADVOCATES = getAdvocates().filter((a) => a.status === "approved");

const normalize = (value = "") => value.toString().trim().toLowerCase();

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const getAvatarColor = (name = "") => {
  const palette = ["#2563eb", "#16a34a", "#7c3aed", "#dc2626", "#ea580c", "#0891b2", "#0f766e", "#9333ea"];
  const sum = name.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return palette[sum % palette.length];
};

export default function Home() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try {
      return localStorage.getItem("law4u_home_lang") || "en";
    } catch {
      return "en";
    }
  });

  const [city] = useState("");
  const [practice] = useState("");
  const [openFaq, setOpenFaq] = useState(null);
  const [selectedAdvocate, setSelectedAdvocate] = useState(null);
  const [showAllAdvocates, setShowAllAdvocates] = useState(false);
  const [searchResults, setSearchResults] = useState(ADVOCATES.slice(0, 6));

  const isKn = lang === "kn";
  const practiceTypes = isKn ? PRACTICE_TYPES_KN : PRACTICE_TYPES_EN;
  const faqs = isKn ? FAQS_KN : FAQS_EN;
  const howItWorks = isKn ? HOW_IT_WORKS_KN : HOW_IT_WORKS_EN;
  const stats = isKn ? STATS_KN : STATS_EN;
  const footerItems = isKn ? FOOTER_ITEMS_KN : FOOTER_ITEMS_EN;

  useEffect(() => {
    const onLangChange = (e) => {
      if (e?.detail) setLang(e.detail);
      else {
        try {
          setLang(localStorage.getItem("law4u_home_lang") || "en");
        } catch {}
      }
    };
    window.addEventListener("law4u_lang_change", onLangChange);
    window.addEventListener("storage", onLangChange);
    return () => {
      window.removeEventListener("law4u_lang_change", onLangChange);
      window.removeEventListener("storage", onLangChange);
    };
  }, []);

  const filterAdvocates = (selectedCity = "", selectedPractice = "") => {
    return ADVOCATES.filter((person) => {
      const cityMatch = !selectedCity || normalize(person.city) === normalize(selectedCity);
      const practiceMatch = !selectedPractice || normalize(person.practiceArea) === normalize(selectedPractice);
      return cityMatch && practiceMatch;
    });
  };

  const handleSeeMoreAdvocates = () => {
    const nextShowAll = !showAllAdvocates;
    setShowAllAdvocates(nextShowAll);
    setSelectedAdvocate(null);

    const results = filterAdvocates(city, practice);
    setSearchResults(nextShowAll ? results : results.slice(0, 6));
  };

  return (
    <div className="home-page">


      {/* ── SECTION 1: Hero ── */}
      <section className="lw-hero">
        <div className="lw-hero-inner">
          <div className="lw-hero-text">
            <div className="lw-hero-badge">
              {isKn ? "೧೦೦% ಭಾರತದ ಅತ್ಯುತ್ತಮ ಕಾನೂನು ವೇದಿಕೆ" : "100% Best Indian Law Platform"}
            </div>
            <h1 className="lw-hero-title">
              {isKn
                ? "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ – ವಿಶ್ವಾಸಾರ್ಹ ವಕೀಲರನ್ನು ಕಂಡುಕೊಳ್ಳಿ"
                : "Advocates Hub – Find Trusted Advocates"}
            </h1>
            <h2 className="lw-hero-sub">
              {isKn ? (
                <>ತಜ್ಞ ಕಾನೂನು ಸಲಹೆ ಪಡೆಯಿರಿ ಮತ್ತು<br />ಭಾರತೀಯ ಕಾನೂನನ್ನು ಸುಲಭವಾಗಿ ತಿಳಿಯಿರಿ</>
              ) : (
                <>Get Expert Legal Advice & Learn<br />Indian Law Easily</>
              )}
            </h2>
            <p className="lw-hero-desc">
              {isKn
                ? "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ನಿಮಗೆ ನುರಿತ ವಕೀಲರನ್ನು ಹುಡುಕಲು, ಭಾರತೀಯ ಕಾನೂನುಗಳನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಮತ್ತು ನಿಮ್ಮ ಹಕ್ಕುಗಳನ್ನು ತಿಳಿಯಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ. ಒಂದೇ ಅಪ್ಲಿಕೇಶನ್‌ನಲ್ಲಿ ನ್ಯಾಯ, ಕಾನೂನು ನವೀಕರಣಗಳು ಮತ್ತು ತಜ್ಞ ಮಾರ್ಗದರ್ಶನ."
                : "Advocates Hub helps you find advocates, understand Indian laws, and learn your legal rights. Explore justice, legal updates, and expert guidance in one app."}
            </p>
            <div className="lw-hero-btns">
              <button className="lw-btn-primary" onClick={() => navigate("/talk-to-advocate")}>
                {isKn ? "ವಕೀಲರೊಂದಿಗೆ ಮಾತನಾಡಿ" : "Talk with Advocate"}
              </button>
              <button className="lw-btn-outline" onClick={() => navigate("/download")}>
                {isKn ? "ಅಪ್ಲಿಕೇಶನ್ ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ" : "Download the App"}
              </button>
            </div>
          </div>
          <div className="lw-hero-laptop">
            <div className="lw-laptop-screen-frame">
              <div className="lw-laptop-camera" />
              <div className="lw-laptop-screen">
                <img
                  src={laptopImage}
                  alt="Advocates Hub legal platform"
                  className="lw-laptop-screen-image"
                />
              </div>
            </div>
            <div className="lw-laptop-base"><span /></div>
          </div>
        </div>
      </section>

      {/* ── SECTION 2: Advocates List ── */}
      <AdvocatesList
        lang={lang}
        searchResults={searchResults}
        showAllAdvocates={showAllAdvocates}
        handleSeeMoreAdvocates={handleSeeMoreAdvocates}
        getAvatarColor={getAvatarColor}
        getInitials={getInitials}
      />

      {/* ── SECTION 3: Practice Types ── */}
      <section className="lw-section lw-practice-section">
        <div className="lw-section-inner">
          <div className="lw-section-head">
            <h2 className="lw-section-title">
              {isKn ? "ವಿಭಾಗವಾರು ವಕೀಲರನ್ನು ಹುಡುಕಿ" : "Find A Lawyer By Category"}
            </h2>
            <p className="lw-section-sub">
              {isKn
                ? "ಸೂಕ್ತ ವಕೀಲರನ್ನು ಹುಡುಕಲು ನಿಮ್ಮ ಕಾನೂನು ಪ್ರಕರಣದ ಪ್ರಕಾರವನ್ನು ಆಯ್ಕೆಮಾಡಿ"
                : "Choose your legal matter type to find the right advocate"}
            </p>
          </div>
          <div className="lw-practice-grid">
            {practiceTypes.map((pt) => (
              <button
                key={pt.label}
                className="lw-practice-card"
                onClick={() => navigate(`/find-lawyer?cat=${pt.category}`)}
              >
                <span className="lw-practice-icon">{pt.icon}</span>
                <div className="lw-practice-label">{pt.label}</div>
                <div className="lw-practice-desc">{pt.desc}</div>
                <div className="lw-practice-cta">
                  {isKn ? "ವಕೀಲರನ್ನು ಹುಡುಕಿ →" : "Find Lawyers →"}
                </div>
              </button>
            ))}
          </div>
          <div className="lw-talk-row">
            <button className="lw-btn-primary lw-btn-lg" onClick={() => navigate("/find-lawyer")}>
              {isKn ? "💬 ವಕೀಲರೊಂದಿಗೆ ಸಮಾಲೋಚನೆ ನಡೆಸಿ" : "💬 Talk to Lawyer Next"}
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Stats ── */}
      <section className="lw-stats-section">
        <div className="lw-section-inner">
          <div className="lw-stats-grid">
            {stats.map((s) => (
              <div key={s.label} className="lw-stat-card">
                <div className="lw-stat-value">{s.value}</div>
                <div className="lw-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: How It Works ── */}
      <section className="lw-section lw-how-section">
        <div className="lw-section-inner">
          <div className="lw-section-head" style={{ textAlign: "center" }}>
            <h2 className="lw-section-title">
              {isKn ? "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಹೇಗೆ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತದೆ" : "How Advocates Hub Works"}
            </h2>
            <p className="lw-section-sub">
              {isKn ? "೪ ಸರಳ ಹಂತಗಳಲ್ಲಿ ಕಾನೂನು ನೆರವು ಪಡೆಯಿರಿ" : "Get legal help in 4 simple steps"}
            </p>
          </div>
          <div className="lw-how-grid">
            {howItWorks.map((step, i) => (
              <div key={step.step} className="lw-how-card">
                <div className="lw-how-step">{step.step}</div>
                <div className="lw-how-icon">{step.icon}</div>
                <div className="lw-how-title">{step.title}</div>
                <div className="lw-how-desc">{step.desc}</div>
                {i < howItWorks.length - 1 && <div className="lw-how-arrow">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI CHATBOT SECTION ── */}
      <section className="lw-section lw-chatbot-section">
        <div className="lw-section-inner" style={{ textAlign: "center" }}>
          <div className="lw-chatbot-banner">
            <div className="lw-chatbot-banner-icon">🤖⚖️</div>
            <h2 className="lw-chatbot-banner-title">
              {isKn ? "ಎಐ ಕಾನೂನು ಸಹಾಯಕ (AI Legal Assistant)" : "AI Legal Assistant"}
            </h2>
            <p className="lw-chatbot-banner-desc">
              {isKn
                ? "ವಕೀಲರನ್ನು ಹುಡುಕಲು, ಯಾವುದೇ ಪುಟಕ್ಕೆ ತೆರಳಲು, ಕಾನೂನು ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಲು ಅಥವಾ ವಕೀಲರ ಪ್ರೊಫೈಲ್ ವೀಕ್ಷಿಸಲು ನಮ್ಮ ಎಐ ಸಹಾಯಕರನ್ನು ಕೇಳಿ — ಎಲ್ಲವೂ ಒಂದೇ ಚಾಟ್‌ನಲ್ಲಿ."
                : "Ask our AI assistant to find advocates, navigate to any page, answer legal questions, or open advocate profiles — all from one chat window."}
            </p>
            <div className="lw-chatbot-demo-queries">
              {(isKn
                ? [
                    "ಬೆಂಗಳೂರಿನಲ್ಲಿ ಕ್ರಿಮಿನಲ್ ವಕೀಲರನ್ನು ಹುಡುಕಿ",
                    "ವಕೀಲ ಪ್ರಿಯಾ ಶರ್ಮಾ ಅವರ ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ",
                    "ನಿರೀಕ್ಷಣಾ ಜಾಮೀನು ಎಂದರೇನು?",
                    "ಎಲ್ಲಾ ಕೌಟುಂಬಿಕ ವಕೀಲರನ್ನು ತೋರಿಸಿ",
                    "Bare Acts ಪುಟಕ್ಕೆ ಹೋಗಿ",
                  ]
                : [
                    "Find criminal lawyers in Delhi",
                    "Open profile of Adv. Priya Sharma",
                    "What is anticipatory bail?",
                    "Show me all family lawyers",
                    "Go to Bare Acts",
                  ]
              ).map((q) => (
                <span key={q} className="lw-chatbot-demo-q">"{q}"</span>
              ))}
            </div>
            <div className="lw-chatbot-banner-cta">
              {isKn ? (
                <>👉 ಚಾಟ್ ಆರಂಭಿಸಲು ಕೆಳಗಿನ ಬಲ ಮೂಲೆಯಲ್ಲಿರುವ <strong>⚖️ ಬಟನ್</strong> ಕ್ಲಿಕ್ ಮಾಡಿ!</>
              ) : (
                <>👉 Click the <strong>⚖️ button</strong> at the bottom-right corner to start chatting!</>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FAQs ── */}
      <section className="lw-section">
        <div className="lw-section-inner lw-narrow">
          <div className="lw-section-head" style={{ textAlign: "center" }}>
            <h2 className="lw-section-title">
              {isKn ? "ಪದೇ ಪದೇ ಕೇಳಲಾಗುವ ಪ್ರಶ್ನೆಗಳು" : "Frequently Asked Questions"}
            </h2>
            <p className="lw-section-sub">
              {isKn
                ? "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಕುರಿತು ನಿಮಗೆ ತಿಳಿಯಬೇಕಾದ ಎಲ್ಲವೂ"
                : "Everything you need to know about Advocates Hub"}
            </p>
          </div>
          <div className="lw-faq-list">
            {faqs.map((faq, i) => (
              <div key={i} className={`lw-faq-item ${openFaq === i ? "open" : ""}`}>
                <button
                  className="lw-faq-q"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {faq.q}
                  <span className="lw-faq-icon">{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="lw-faq-a">{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedAdvocate && (
        <div className="lw-detail-overlay" onClick={() => setSelectedAdvocate(null)}>
          <div className="lw-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button className="lw-detail-close" type="button" onClick={() => setSelectedAdvocate(null)}>×</button>
            <div className="lw-detail-header">
              <div
                className="lw-detail-avatar"
                style={{ background: selectedAdvocate.avatar ? "transparent" : getAvatarColor(selectedAdvocate.name) }}
              >
                {selectedAdvocate.avatar ? (
                  <img src={selectedAdvocate.avatar} alt={selectedAdvocate.name} className="lw-detail-avatar-img" />
                ) : (
                  getInitials(selectedAdvocate.name)
                )}
              </div>
              <div>
                <div className="lw-detail-name">{selectedAdvocate.name}</div>
                <div className="lw-detail-speciality">{selectedAdvocate.speciality}</div>
                <div className="lw-detail-meta">{selectedAdvocate.city} · {selectedAdvocate.experience}</div>
              </div>
            </div>

            <div className="lw-detail-grid">
              <div className="lw-detail-box">
                <span>{isKn ? "ರೇಟಿಂಗ್" : "Rating"}</span>
                <strong>⭐ {selectedAdvocate.rating}</strong>
              </div>
              <div className="lw-detail-box">
                <span>{isKn ? "ಪ್ರಕರಣಗಳು" : "Cases"}</span>
                <strong>{selectedAdvocate.cases}</strong>
              </div>
              <div className="lw-detail-box">
                <span>{isKn ? "ಅನುಭವ" : "Experience"}</span>
                <strong>{selectedAdvocate.experience || (isKn ? "೫+ ವರ್ಷಗಳು" : "5+ Years")}</strong>
              </div>
              <div className="lw-detail-box">
                <span>{isKn ? "ಸ್ಥಳ" : "Location"}</span>
                <strong>{selectedAdvocate.district || selectedAdvocate.city || "Karnataka"}</strong>
              </div>
            </div>

            <div className="lw-detail-section">
              <h4>{isKn ? "ಪರಿಚಯ" : "About"}</h4>
              <p>{selectedAdvocate.bio}</p>
            </div>

            <div className="lw-detail-section">
              <h4>{isKn ? "ಭಾಷೆಗಳು" : "Languages"}</h4>
              <div className="lw-detail-tags">
                {(selectedAdvocate.languages || []).map((language) => (
                  <span key={language} className="lw-detail-tag">{language}</span>
                ))}
              </div>
            </div>

            <div className="lw-detail-contact">
              <div>
                <span>{isKn ? "ದೂರವಾಣಿ" : "Phone"}</span>
                <strong>{selectedAdvocate.phone}</strong>
              </div>
              <div>
                <span>{isKn ? "ಇಮೇಲ್" : "Email"}</span>
                <strong>{selectedAdvocate.email}</strong>
              </div>
            </div>

            <div className="lw-detail-actions">
              <button type="button" className="lw-btn-primary" onClick={() => navigate(`/profile/${selectedAdvocate.id}`)}>
                {isKn ? "ಸಮಾಲೋಚನೆ ಬುಕ್ ಮಾಡಿ" : "Book Consultation"}
              </button>
              <button type="button" className="lw-btn-outline-dark" onClick={() => setSelectedAdvocate(null)}>
                {isKn ? "ಮುಚ್ಚಿ" : "Close"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer strip */}
      <footer className="lw-footer">
        <div className="lw-section-inner">
          <div className="lw-footer-logo">
            <span style={{ color: "#2563eb", fontWeight: 800 }}>Advocates</span>
            <span style={{ color: "#dc2626", fontWeight: 800 }}> Hub</span>
          </div>
          <p className="lw-footer-tagline">
            {isKn ? "ಭಾರತದ ಅತ್ಯಂತ ವಿಶ್ವಾಸಾರ್ಹ ಕಾನೂನು ವೇದಿಕೆ" : "India's Most Trusted Legal Platform"}
          </p>
          <div className="lw-footer-links">
            {footerItems.map((l) => (
              <button
                key={l}
                type="button"
                className="lw-footer-link"
                onClick={() => navigate(FOOTER_LINKS[l] || "/")}
              >
                {l}
              </button>
            ))}
          </div>
          <p className="lw-footer-copy">
            {isKn
              ? "© 2026 ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್. ಸರ್ವ ಹಕ್ಕುಗಳನ್ನು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ."
              : "© 2026 Advocates Hub. All rights reserved."}
          </p>
        </div>
      </footer>
    </div>
  );
}