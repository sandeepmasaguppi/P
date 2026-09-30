// ============================================================
//  TalkToAdvocate.js — Advocates Hub "Talk to a Lawyer" Directory
//  Features:
//   • 6 Advocate Cards per page with complete pagination
//   • Live search by advocate name, city, practice area, or court
//   • Quick practice filter chips
//   • Full Dark & Light theme integration (reactive)
//   • Executive, high-conversion verified advocate card design
// ============================================================

import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link } from "react-router-dom";
import { getAdvocates } from "../data/Advocatesstore";
import { assetUrl } from "../data/api";
import { getTheme } from "../data/themeStore";
import "./TalkToAdvocate.css";

const PAGE_SIZE = 6;

const PRACTICE_FILTERS = [
  { id: "all", label: "All Practices" },
  { id: "criminal", label: "Criminal Law" },
  { id: "civil", label: "Civil Matters" },
  { id: "family", label: "Family & Divorce" },
  { id: "property", label: "Property & Real Estate" },
  { id: "corporate", label: "Corporate & Commercial" },
];

const getInitials = (name = "") =>
  name
    .replace(/^Adv\.\s*/i, "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "AD";

function AdvocateCard({ advocate }) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <article className="tta-card">
      <div className="tta-card-topbar">
        <span className="tta-verified-chip">
          <span className="tta-check-icon">✓</span> Verified Bar Member
        </span>
        {advocate.court && (
          <span className="tta-court-chip" title={advocate.court}>
            🏛️ {advocate.court.length > 24 ? advocate.court.slice(0, 22) + "…" : advocate.court}
          </span>
        )}
      </div>

      <div className="tta-card-header">
        <div className="tta-avatar-wrap">
          <div className="tta-avatar">
            {advocate.avatar && !imageFailed ? (
              <img
                src={assetUrl(advocate.avatar)}
                alt={advocate.name}
                onError={() => setImageFailed(true)}
              />
            ) : (
              getInitials(advocate.name)
            )}
          </div>
          <span className="tta-online-indicator" title="Online for consultation" />
        </div>

        <div className="tta-header-info">
          <h2 className="tta-adv-name">{advocate.name}</h2>
          <div className="tta-adv-speciality">
            {advocate.speciality || advocate.practiceArea || "Legal Counsel"}
          </div>
          <div className="tta-adv-submeta">
            <span>📍 {advocate.city || advocate.district || "Karnataka"}</span>
            {advocate.experience && <span>• {advocate.experience} Exp</span>}
          </div>
        </div>
      </div>

      {/* Statistics 4-tile grid */}
      <div className="tta-stats-grid">
        <div className="tta-stat-tile">
          <span className="tta-stat-label">Rating</span>
          <strong className="tta-stat-value">⭐ {advocate.rating || 4.9}</strong>
        </div>
        <div className="tta-stat-tile">
          <span className="tta-stat-label">Cases</span>
          <strong className="tta-stat-value">⚖️ {advocate.cases ? `${advocate.cases}+` : "100+"}</strong>
        </div>
        <div className="tta-stat-tile">
          <span className="tta-stat-label">Practice</span>
          <strong className="tta-stat-value">{advocate.experience || "5+ Yrs"}</strong>
        </div>
        <div className="tta-stat-tile">
          <span className="tta-stat-label">Consultation</span>
          <strong className="tta-stat-value tta-stat-highlight">
            ₹{advocate.fee || "500"}
          </strong>
        </div>
      </div>

      {/* Bio excerpt */}
      <p className="tta-bio">
        {advocate.bio
          ? advocate.bio
          : `${advocate.name} is an experienced legal advocate practicing in ${advocate.city || "Karnataka"} courts, specialized in ${advocate.speciality || "comprehensive legal matters"}.`}
      </p>

      {/* Contact snippet & actions */}
      <div className="tta-card-footer">
        <div className="tta-card-contacts">
          {advocate.phone && (
            <a href={`tel:${advocate.phone}`} className="tta-contact-link" title="Call directly">
              📞 {advocate.phone}
            </a>
          )}
          {advocate.email && (
            <a href={`mailto:${advocate.email}`} className="tta-contact-link" title="Send email">
              ✉️ {advocate.email}
            </a>
          )}
        </div>

        <div className="tta-actions">
          <Link to={`/profile/${advocate.id}`} className="tta-btn-primary">
            Consult Advocate →
          </Link>
          <Link to={`/profile/${advocate.id}`} className="tta-btn-secondary">
            View Profile
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function TalkToAdvocate() {
  const sectionRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPractice, setSelectedPractice] = useState("all");

  const [theme, setTheme] = useState(getTheme);
  const [advocates, setAdvocates] = useState(() =>
    getAdvocates().filter((advocate) => advocate.status === "approved")
  );

  // Sync theme
  useEffect(() => {
    const handleTheme = (e) => setTheme(e?.detail || getTheme());
    window.addEventListener("law4u_theme_change", handleTheme);
    return () => window.removeEventListener("law4u_theme_change", handleTheme);
  }, []);

  // Sync advocates from store
  useEffect(() => {
    const handleUpdate = () => {
      setAdvocates(getAdvocates().filter((advocate) => advocate.status === "approved"));
    };
    handleUpdate();
    window.addEventListener("law4u_advocates_updated", handleUpdate);
    return () => window.removeEventListener("law4u_advocates_updated", handleUpdate);
  }, []);

  // Filter advocates based on search and practice chip
  const filteredAdvocates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return advocates.filter((a) => {
      const matchesSearch =
        !q ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.city && a.city.toLowerCase().includes(q)) ||
        (a.district && a.district.toLowerCase().includes(q)) ||
        (a.taluk && a.taluk.toLowerCase().includes(q)) ||
        (a.speciality && a.speciality.toLowerCase().includes(q)) ||
        (a.practiceArea && a.practiceArea.toLowerCase().includes(q)) ||
        (a.court && a.court.toLowerCase().includes(q));

      const matchesPractice =
        selectedPractice === "all" ||
        (a.practiceArea && a.practiceArea.toLowerCase().includes(selectedPractice.toLowerCase())) ||
        (a.speciality && a.speciality.toLowerCase().includes(selectedPractice.toLowerCase()));

      return matchesSearch && matchesPractice;
    });
  }, [advocates, searchQuery, selectedPractice]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedPractice]);

  const totalPages = Math.ceil(filteredAdvocates.length / PAGE_SIZE) || 1;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentAdvocates = filteredAdvocates.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (page) => {
    const targetPage = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(targetPage);
    if (sectionRef.current) {
      sectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <main className={`tta-page ${theme === "dark" ? "tta-dark" : ""}`}>
      {/* Hero Header */}
      <header className="tta-hero">
        <div className="tta-hero-inner">
          <div className="tta-hero-badge">
            <span className="tta-sparkle">✨</span> VERIFIED LEGAL EXPERTS & CONSULTATION
          </div>
          <h1>
            Talk to a <span className="tta-title-highlight">Verified Advocate</span>
          </h1>
          <p className="tta-hero-subtitle">
            Connect directly with verified Advocates from Karnataka High Court and District Courts.
            Confidential consultation, transparent fees, and fast legal advisory.
          </p>

          <div className="tta-hero-trust-bar">
            <span className="tta-trust-item">⚖️ Bar Council Verified</span>
            <span className="tta-trust-dot">•</span>
            <span className="tta-trust-item">⚡ Direct Consultation</span>
            <span className="tta-trust-dot">•</span>
            <span className="tta-trust-item">🔒 100% Confidential</span>
            <span className="tta-trust-dot">•</span>
            <span className="tta-trust-item">⭐ 4.9 Average Rating</span>
          </div>
        </div>
      </header>

      {/* Main Content Section */}
      <section className="tta-content" ref={sectionRef}>
        {/* Search & Filter Toolbar */}
        <div className="tta-toolbar-card">
          <div className="tta-search-box">
            <span className="tta-search-icon">🔍</span>
            <input
              type="text"
              className="tta-search-input"
              placeholder="Search by advocate name, city, practice area (e.g. Criminal, Divorce, Belagavi)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="tta-clear-btn"
                onClick={() => setSearchQuery("")}
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="tta-filter-chips">
            {PRACTICE_FILTERS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={`tta-chip ${selectedPractice === chip.id ? "active" : ""}`}
                onClick={() => setSelectedPractice(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Heading & Counter */}
        <div className="tta-section-heading">
          <div>
            <h2 className="tta-section-title">Verified Advocates Directory</h2>
            <p className="tta-section-sub">
              Browse top legal counsel with verified Bar Council credentials.
            </p>
          </div>
          <span className="tta-count-badge">
            {filteredAdvocates.length > 0
              ? `Showing ${startIndex + 1}–${Math.min(startIndex + PAGE_SIZE, filteredAdvocates.length)} of ${filteredAdvocates.length} advocates`
              : "0 advocates matching"}
          </span>
        </div>

        {/* Grid of 6 Cards */}
        {currentAdvocates.length > 0 ? (
          <div className="tta-grid">
            {currentAdvocates.map((advocate) => (
              <AdvocateCard key={advocate.id} advocate={advocate} />
            ))}
          </div>
        ) : (
          <div className="tta-empty-state">
            <div className="tta-empty-icon">🔎</div>
            <h3>No advocates found</h3>
            <p>Try searching for a different advocate name, city, or select "All Practices".</p>
            <button
              type="button"
              className="tta-reset-btn"
              onClick={() => {
                setSearchQuery("");
                setSelectedPractice("all");
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Pagination Navigation */}
        {totalPages > 1 && (
          <div className="tta-pagination">
            <button
              type="button"
              className="tta-pagination-btn tta-pagination-nav"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              aria-label="Previous Page"
            >
              ← Previous
            </button>

            <div className="tta-page-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  className={`tta-pagination-btn ${pageNum === currentPage ? "active" : ""}`}
                  onClick={() => goToPage(pageNum)}
                  aria-current={pageNum === currentPage ? "page" : undefined}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="tta-pagination-btn tta-pagination-nav"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              aria-label="Next Page"
            >
              Next →
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
