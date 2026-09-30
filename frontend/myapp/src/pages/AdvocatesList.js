import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getAdvocates } from "../data/Advocatesstore";
import "./AdvocatesList.css";

const CITIES = [
  // =========================
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
const PRACTICE_AREAS = ["Divorce","Criminal","Property","Cheque Bounce","Civil","GST","Tax","Corporate","Family","Labour","Consumer","Cyber","Immigration","Banking","Intellectual Property"];
const POPULAR = ["Divorce","Criminal","Property","Cheque Bounce","Civil","GST","Tax"];
const CATEGORY_PRACTICES = {
  family: ["Family", "Divorce"],
  criminal: ["Criminal", "Cyber"],
  property: ["Property"],
  civil: ["Civil", "Cheque Bounce", "Banking"],
  corporate: ["Corporate", "GST", "Tax", "Intellectual Property"],
};

// Only "approved" advocates are shown to the public — pending/rejected signups stay hidden from clients.

const normalize = (value = "") => (value ?? "").toString().trim().toLowerCase();

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

const matchesPractice = (person, practices) => {
  if (!practices.length) return true;
  const personPractice = normalize(person.practiceArea || person.speciality || "");
  return practices.some((practice) => {
    const norm = normalize(practice);
    return personPractice === norm || personPractice.includes(norm);
  });
};

function AdvocateAvatar({ advocate }) {
  const [imagePath, setImagePath] = useState(advocate.avatar || "");
  const [failed, setFailed] = useState(false);

  const handleImageError = () => {
    if (!imagePath || !advocate.avatar) {
      setFailed(true);
      return;
    }

    const basePath = advocate.avatar.replace(/\.(png|jpe?g|webp)$/i, "");
    const candidates = [`${basePath}.jpg`, `${basePath}.jpeg`, `${basePath}.png`, `${basePath}.webp`];
    const nextPath = candidates.find((candidate) => candidate !== imagePath);
    if (nextPath) setImagePath(nextPath);
    else setFailed(true);
  };

  return (
    <div
      className="lw-adv-avatar"
      style={{ background: !failed && imagePath ? "transparent" : getAvatarColor(advocate.name) }}
    >
      {!failed && imagePath ? (
        <img
          src={imagePath}
          alt={advocate.name}
          className="lw-adv-avatar-img"
          onError={handleImageError}
        />
      ) : getInitials(advocate.name)}
    </div>
  );
}

function CustomSearchDropdown({
  icon,
  placeholder,
  value,
  onChange,
  options,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value || "");
  const [showAll, setShowAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Synchronize internal input value if external value changes (e.g. popular tags or category)
  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setShowAll(false);
        setActiveIndex(-1);
        // If user typed an exact match in different case, normalize it
        if (inputValue.trim()) {
          const match = options.find((opt) => opt.toLowerCase() === inputValue.trim().toLowerCase());
          if (match && match !== inputValue) {
            setInputValue(match);
            onChange(match);
          }
        }
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowAll(false);
        setActiveIndex(-1);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, inputValue, options, onChange]);

  const filteredOptions = useMemo(() => {
    const trimmed = inputValue.trim().toLowerCase();
    if (!trimmed || showAll) {
      return options;
    }
    return options.filter((opt) => opt.toLowerCase().includes(trimmed));
  }, [options, inputValue, showAll]);

  // Auto-scroll to active item when navigating with keys
  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const target = listRef.current.querySelector(".lw-dropdown-item.active-item");
      if (target) {
        target.scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex, isOpen]);

  // Auto-scroll to selected item when opened
  useEffect(() => {
    if (isOpen && listRef.current) {
      const selectedTarget = listRef.current.querySelector(".lw-dropdown-item.selected");
      if (selectedTarget) {
        selectedTarget.scrollIntoView({ block: "nearest" });
      }
    }
  }, [isOpen]);

  const handleSelect = (val) => {
    onChange(val);
    setInputValue(val);
    setShowAll(false);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setShowAll(false);
    onChange(val);
    setActiveIndex(0);
    if (!isOpen) setIsOpen(true);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange("");
    setInputValue("");
    setShowAll(true);
    setActiveIndex(-1);
    setIsOpen(true);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleKeyDownInput = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setShowAll(true);
        setActiveIndex(0);
      } else if (filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (isOpen && filteredOptions.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filteredOptions.length - 1));
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && filteredOptions[activeIndex]) {
        handleSelect(filteredOptions[activeIndex]);
      } else if (filteredOptions.length > 0) {
        handleSelect(filteredOptions[0]);
      } else {
        setIsOpen(false);
      }
    }
  };

  const handleToggleClick = (e) => {
    e.stopPropagation();
    setShowAll(true);
    setIsOpen((prev) => !prev);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className={`lw-custom-dropdown ${isOpen ? "is-open" : ""}`}
      ref={dropdownRef}
    >
      <div
        className="lw-dropdown-input-wrapper"
        onClick={() => {
          if (!isOpen) {
            setIsOpen(true);
            setShowAll(true);
          }
          if (inputRef.current) inputRef.current.focus();
        }}
      >
        <span className="lw-search-field-icon">{icon}</span>
        <input
          ref={inputRef}
          type="text"
          className="lw-dropdown-main-input"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDownInput}
          onFocus={() => {
            if (!isOpen) {
              setIsOpen(true);
              setShowAll(true);
            }
          }}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
        />
        {inputValue ? (
          <button
            type="button"
            className="lw-dropdown-clear-btn"
            onClick={handleClear}
            title="Clear"
            tabIndex={-1}
          >
            ✕
          </button>
        ) : null}
        <button
          type="button"
          className="lw-dropdown-toggle-btn"
          onClick={handleToggleClick}
          tabIndex={-1}
          title="Show options"
        >
          <span className={`lw-dropdown-arrow ${isOpen ? "open" : ""}`}>▼</span>
        </button>
      </div>

      {isOpen && (
        <div className="lw-dropdown-menu">
          <ul className="lw-dropdown-list" ref={listRef} role="listbox">
            {(!inputValue.trim() || showAll) && (
              <li
                className={`lw-dropdown-item ${!value ? "selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect("");
                }}
                onClick={() => handleSelect("")}
                role="option"
                aria-selected={!value}
              >
                <span>{placeholder}</span>
                {!value && <span className="lw-dropdown-check">✓</span>}
              </li>
            )}
            {filteredOptions.length === 0 ? (
              <li className="lw-dropdown-no-match">
                No matching options found
              </li>
            ) : (
              filteredOptions.map((opt, idx) => (
                <li
                  key={opt}
                  className={`lw-dropdown-item ${value === opt ? "selected" : ""} ${activeIndex === idx ? "active-item" : ""}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(opt);
                  }}
                  onClick={() => handleSelect(opt)}
                  role="option"
                  aria-selected={value === opt}
                >
                  <span>{opt}</span>
                  {value === opt && <span className="lw-dropdown-check">✓</span>}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdvocatesList({ lang: propLang } = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const category = normalize(searchParams.get("cat"));
  const categoryPractices = useMemo(() => CATEGORY_PRACTICES[category] || [], [category]);
  const queryCity = searchParams.get("city") || "";
  const queryPractice = searchParams.get("area") || "";
  const [city, setCity] = useState(queryCity);
  const [practice, setPractice] = useState(queryPractice);
  const [showAllAdvocates, setShowAllAdvocates] = useState(false);

  const [allAdvocates, setAllAdvocates] = useState(() => {
    const list = getAdvocates();
    return Array.isArray(list) ? list.filter((a) => a.status === "approved") : [];
  });

  useEffect(() => {
    const refreshAdvocates = () => {
      const list = getAdvocates();
      setAllAdvocates(Array.isArray(list) ? list.filter((a) => a.status === "approved") : []);
    };
    refreshAdvocates();
    window.addEventListener("law4u_advocates_updated", refreshAdvocates);
    return () => window.removeEventListener("law4u_advocates_updated", refreshAdvocates);
  }, []);

  const [lang, setLang] = useState(() => {
    try {
      return propLang || localStorage.getItem("law4u_home_lang") || "en";
    } catch {
      return "en";
    }
  });

  useEffect(() => {
    if (propLang) setLang(propLang);
  }, [propLang]);

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
    return () => window.removeEventListener("law4u_lang_change", handleLang);
  }, []);

  const isKn = lang === "kn";

  const filterAdvocates = useCallback(
    (selectedCity = "", selectedPractice = "", list = allAdvocates) => {
      const targetCity = normalize(selectedCity);
      const targetPractice = normalize(selectedPractice);

      return (list || []).filter((person) => {
        if (!person) return false;

        const pCity = normalize(person.city || "");
        const pDist = normalize(person.district || "");
        const pTaluk = normalize(person.taluk || "");

        const cityMatch =
          !targetCity ||
          pCity === targetCity ||
          pCity.includes(targetCity) ||
          targetCity.includes(pCity) ||
          (pDist && (pDist === targetCity || pDist.includes(targetCity) || targetCity.includes(pDist))) ||
          (pTaluk && (pTaluk === targetCity || pTaluk.includes(targetCity) || targetCity.includes(pTaluk)));

        const personPractice = normalize(person.practiceArea || person.speciality || "");
        const practiceMatch = targetPractice
          ? personPractice === targetPractice ||
            personPractice.includes(targetPractice) ||
            targetPractice.includes(personPractice)
          : matchesPractice(person, categoryPractices);

        return cityMatch && practiceMatch;
      });
    },
    [allAdvocates, categoryPractices]
  );

  const [filteredResults, setFilteredResults] = useState(() =>
    filterAdvocates(queryCity, queryPractice, allAdvocates)
  );

  useEffect(() => {
    setCity(queryCity);
    setPractice(queryPractice);
    setShowAllAdvocates(false);
  }, [queryCity, queryPractice]);

  useEffect(() => {
    const results = filterAdvocates(city, practice, allAdvocates);
    setFilteredResults(results);
  }, [city, practice, allAdvocates, filterAdvocates]);

  const handleCityChange = (newCity) => {
    setCity(newCity);
    setShowAllAdvocates(false);
  };

  const handlePracticeChange = (newPractice) => {
    setPractice(newPractice);
    setShowAllAdvocates(false);
  };

  const handleSearch = () => {
    setShowAllAdvocates(false);
    const results = filterAdvocates(city, practice, allAdvocates);
    setFilteredResults(results);
  };

  const handlePopularClick = (value) => {
    setPractice(value);
    setShowAllAdvocates(false);
  };

  const handleSeeMoreAdvocates = () => {
    setShowAllAdvocates((prev) => !prev);
  };

  // Only show more than 6 if there are more than 6 total matches AND the user clicked "See More"
  const displayedList = showAllAdvocates ? filteredResults : filteredResults.slice(0, 6);

  return (
    <div className="home-page">
      {/* ── Search Bar Section ── */}
      <section className="lw-search-section">
  <p className="lw-search-headline">
    {isKn
      ? "ಅಡ್ವೊಕೇಟ್ಸ್ ಹಬ್ ಮೂಲಕ ಜಿಲ್ಲಾ ನ್ಯಾಯಾಲಯ, ಹೈಕೋರ್ಟ್ ಮತ್ತು ಸುಪ್ರೀಂ ಕೋರ್ಟ್ ಪ್ರಕರಣಗಳಿಗೆ ಭಾರತದ ಅತ್ಯುತ್ತಮ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ ವಕೀಲರನ್ನು ನೇಮಿಸಿಕೊಳ್ಳಿ"
      : "Hire India's best and most trusted lawyers for District Court, High Court, and Supreme Court cases with Advocates Hub"}
  </p>
  <div className="lw-search-bar">
    <div className="lw-search-field">
      <CustomSearchDropdown
        icon="📍"
        placeholder={isKn ? "ನಗರವನ್ನು ಆಯ್ಕೆಮಾಡಿ / ಹುಡುಕಿ" : "Select City (type to search...)"}
        value={city}
        onChange={handleCityChange}
        options={CITIES}
      />
    </div>
    <div className="lw-search-field">
      <CustomSearchDropdown
        icon="🏛️"
        placeholder={isKn ? "ಕಾರ್ಯಾಚರಣೆಯ ಕ್ಷೇತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ" : "Select Practice Areas"}
        value={practice}
        onChange={handlePracticeChange}
        options={PRACTICE_AREAS}
      />
    </div>
    <button className="lw-search-btn" onClick={handleSearch}>
      {isKn ? "ಹುಡುಕಿ" : "SEARCH"}
    </button>
  </div>
  <div className="lw-popular-searches">
    <strong>{isKn ? "ಜನಪ್ರಿಯ ಹುಡುಕಾಟಗಳು: " : "Popular Searches: "}</strong>
    {POPULAR.map((p, i) => (
      <span key={p}>
        <span className="lw-popular-tag" onClick={() => handlePopularClick(p)}>{p}</span>
        {i < POPULAR.length - 1 && " , "}
      </span>
    ))}
  </div>
</section>

      {/* ── Advocates List Section ── */}
      <section className="lw-section">
        <div className="lw-section-inner">
          <div className="lw-section-head lw-flex-between">
            <div>
              <h2 className="lw-section-title">
                {isKn ? "ನಮ್ಮ ವಕೀಲರನ್ನು ಭೇಟಿ ಮಾಡಿ" : "Meet Our Advocates"}
              </h2>
            </div>
            {/* Show button ONLY if there are more than 6 matches in total */}
            {filteredResults.length > 6 && (
              <button className="lw-btn-primary" onClick={handleSeeMoreAdvocates}>
                {showAllAdvocates
                  ? (isKn ? "ಕಡಿಮೆ ವಕೀಲರನ್ನು ನೋಡಿ" : "See Less Advocates")
                  : (isKn ? "ಇನ್ನಷ್ಟು ವಕೀಲರನ್ನು ನೋಡಿ" : "See More Advocates")} ›
              </button>
            )}
          </div>

          {displayedList.length === 0 ? (
            <div className="lw-no-results">
              {isKn
                ? "ಆಯ್ಕೆಮಾಡಿದ ನಗರ ಮತ್ತು ವಕಾಲತ್ತು ಕ್ಷೇತ್ರಕ್ಕೆ ಯಾವುದೇ ವಕೀಲರು ಕಂಡುಬಂದಿಲ್ಲ."
                : "No advocates found for the selected city and practice area."}
            </div>
          ) : (
            <div className="lw-advocates-grid">
              {displayedList.map((adv) => (
                <div
                  key={adv.id}
                  className="lw-adv-card"
                  onClick={() => navigate(`/profile/${adv.id}`)}
                >
                  <div className="lw-adv-top">
                    <AdvocateAvatar advocate={adv} />
                    <div className="lw-adv-info">
                      <div className="lw-adv-name">{adv.name}</div>
                      <div className="lw-adv-spec">{adv.speciality || adv.practiceArea}</div>
                      <div className="lw-adv-meta">{adv.city} · {adv.experience}</div>
                    </div>
                  </div>

                  <div className="lw-adv-stats">
                    <span className="lw-adv-rating">⭐ {adv.rating}</span>
                    <span className="lw-adv-cases">{adv.cases} {isKn ? "ಪ್ರಕರಣಗಳು" : "cases"}</span>
                  </div>

                  <button
                    className="lw-adv-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/profile/${adv.id}`);
                    }}
                  >
                    {isKn ? "ಸಂಪರ್ಕಿಸಿ" : "Consult Now"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}