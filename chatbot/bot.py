# ============================================================
#  bot.py  —  AdvocateHub Smart Chatbot Logic (Live Server Sync)
#  Handles:
#    • Live loading from backend/data/advocates.json (no restart/rebuild needed)
#    • Live loading & answering from backend/data/clarityguide.json
#    • Full bilingual support: English & Kannada (ಕನ್ನಡ)
#    • Instant advocate search by Name, City, Court, & Speciality
#    • Multi-parameter queries & Navigation commands
# ============================================================

import json
import os
import re
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AdvocateHubBot")

BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
DATA_PATH    = os.path.abspath(os.path.join(BASE_DIR, "..", "backend", "data", "advocates.json"))
CLARITY_PATH = os.path.abspath(os.path.join(BASE_DIR, "..", "backend", "data", "clarityguide.json"))

# ── Live Data Loaders (auto-reloads whenever JSON files change on disk) ──
_advocates_mtime = 0
_cached_advocates = []

def get_advocates():
    global _advocates_mtime, _cached_advocates
    try:
        if os.path.exists(DATA_PATH):
            mtime = os.path.getmtime(DATA_PATH)
            if mtime != _advocates_mtime or not _cached_advocates:
                with open(DATA_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, dict):
                    data = data.get("advocates", [])
                _cached_advocates = data if isinstance(data, list) else []
                _advocates_mtime = mtime
                logger.info(f"Loaded {len(_cached_advocates)} advocates live from {DATA_PATH}")
    except Exception as e:
        logger.error(f"Error loading live advocates JSON: {e}")
    return _cached_advocates

_clarity_mtime = 0
_cached_clarity = []

def get_clarity_guide():
    global _clarity_mtime, _cached_clarity
    try:
        if os.path.exists(CLARITY_PATH):
            mtime = os.path.getmtime(CLARITY_PATH)
            if mtime != _clarity_mtime or not _cached_clarity:
                with open(CLARITY_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                _cached_clarity = data if isinstance(data, list) else []
                _clarity_mtime = mtime
                logger.info(f"Loaded {len(_cached_clarity)} clarity guide records live from {CLARITY_PATH}")
    except Exception as e:
        logger.error(f"Error loading clarity guide JSON: {e}")
    return _cached_clarity

# Pre-warm on startup
get_advocates()
get_clarity_guide()

# ── Navigation map ────────────────────────────────────────────
NAV_MAP = {
    "home": "/",
    "main page": "/",
    "landing": "/",
    "advocates": "/find-lawyer",
    "advocate list": "/find-lawyer",
    "find lawyer": "/find-lawyer",
    "find advocate": "/find-lawyer",
    "lawyers": "/find-lawyer",
    "talk to advocate": "/talk-to-advocate",
    "talk": "/talk-to-advocate",
    "consult": "/talk-to-advocate",
    "ask question": "/legal-advice/ask-question",
    "legal advice": "/legal-advice/ask-question",
    "clarity guide": "/clarity-guide",
    "guide": "/clarity-guide",
    "ask": "/legal-advice/ask-question",
    "legal documents": "/legal-advice/documents",
    "documents": "/legal-advice/documents",
    "templates": "/legal-advice/documents",
    "bare acts": "/legal-advice/bare-acts",
    "laws": "/legal-advice/bare-acts",
    "acts": "/legal-advice/bare-acts",
    "ipc": "/legal-advice/bare-acts",
    "bns": "/legal-advice/bare-acts",
    "legal news": "/legal-advice/news",
    "news": "/legal-advice/news",
    "login": "/login",
    "sign in": "/login",
    "signup": "/signup",
    "register": "/signup",
    "privacy": "/privacy",
    "privacy policy": "/privacy",
    "terms": "/terms",
    "terms of use": "/terms",
    "contact": "/Contact",
    "about": "/aboutus",
    "partners": "/Partners",
}

# ── Keyword → speciality mapping (English & Kannada) ───────────
SPECIALITY_KEYWORDS = {
    "criminal": [
        "criminal", "crime", "fir", "bail", "arrest", "ipc", "bns", "murder", "theft", "assault",
        "ಕ್ರಿಮಿನಲ್", "ಬೇಲ್", "ಜಾಮೀನು", "ಎಫ್‌ಐಆರ್", "ಬಂಧನ", "ಕೊಲೆ", "ಕಳ್ಳತನ"
    ],
    "family": [
        "family", "divorce", "custody", "marriage", "matrimonial", "maintenance", "adoption", "alimony",
        "ಕೌಟುಂಬಿಕ", "ವಿಚ್ಛೇದನ", "ಜೀವನಾಂಶ", "ಮದುವೆ", "ದತ್ತು", "ಪೋಷಕತ್ವ"
    ],
    "property": [
        "property", "land", "title", "rera", "real estate", "plot", "builder", "partition", "khata",
        "ಆಸ್ತಿ", "ಜಮೀನು", "ನಿವೇಶನ", "ಖಾತಾ", "ವಿಭಜನೆ", "ಖರೀದಿ", "ರೆರಾ"
    ],
    "civil": [
        "civil", "cheque bounce", "recovery", "ni act", "suit", "injunction", "debt",
        "ಸಿವಿಲ್", "ಚೆಕ್ ಬೌನ್ಸ್", "ವಸೂಲಾತಿ", "ದಾವೆ", "ತಡೆಯಾಜ್ಞೆ"
    ],
    "motor accident": [
        "accident", "motor accident", "mact", "vehicle damage", "hit and run", "insurance claim",
        "ಅಪಘಾತ", "ರಸ್ತೆ ಅಪಘಾತ", "ವಾಹನ ಅಪಘಾತ", "ವಿಮೆ ಕ್ಲೈಮ್"
    ],
    "corporate": [
        "corporate", "company", "gst", "tax", "business", "startup", "compliance",
        "ಕಾರ್ಪೊರೇಟ್", "ಕಂಪನಿ", "ಜಿಎಸ್‌ಟಿ", "ತೆರಿಗೆ", "ವ್ಯಾಪಾರ"
    ],
    "labour": [
        "labour", "labor", "employee", "termination", "pf", "esic", "salary", "wages",
        "ಕಾರ್ಮಿಕ", "ಉದ್ಯೋಗಿ", "ವೇತನ", "ಪಿಎಫ್", "ವಜಾ"
    ],
    "consumer": [
        "consumer", "refund", "product", "e-commerce", "defect", "service deficiency",
        "ಗ್ರಾಹಕ", "ಮರುಪಾವತಿ", "ದೋಷಪೂರಿತ", "ಪರಿಹಾರ"
    ],
    "cyber": [
        "cyber", "cybercrime", "hacking", "online fraud", "defamation", "it act", "otp fraud",
        "ಸೈಬರ್", "ಆನ್‌ಲೈನ್ ವಂಚನೆ", "ಹ್ಯಾಕಿಂಗ್", "ಐಟಿ ಕಾಯ್ದೆ"
    ],
    "immigration": ["immigration", "visa", "oci", "citizenship", "nri", "passport", "ವೀಸಾ", "ಪಾಸ್‌ಪೋರ್ಟ್"],
    "banking": ["banking", "bank", "sarfaesi", "loan", "npa", "drt", "ಬ್ಯಾಂಕ್", "ಸಾಲ"],
}

# ── City & District Names (English & Kannada) ───────────────────
CITIES_LIST = [
    "Afzalpur", "Alur", "Aland", "Ankola", "Arakalgud", "Arasikere", "Athani", "Aurad", "Anekal",
    "Bagepalli", "Bagalkot", "Bailhongal", "Baindur", "Banahatti", "Bangarapet", "Bantwal", 
    "Basavana Bagewadi", "Basavakalyan", "Belagavi", "Belthangady", "Belur", "Bhadravati", 
    "Bhalki", "Bhatkal", "Bilagi", "Byadgi", "Bengaluru", "Bengaluru Rural", "Challakere", 
    "Chamarajanagar", "Channagiri", "Channapatna", "Channarayapatna", "Chikkaballapur", 
    "Chikkamagaluru", "Chikkodi", "Chiknayakanhalli", "Chincholi", "Chintamani", "Chitapur", 
    "Chitradurga", "Dandeli", "Davangere", "Devanahalli", "Devadurga", "Dharwad", "Doddaballapur", 
    "Gadag", "Gangavathi", "Gauribidanur", "Gokak", "Gudibande", "Gubbi", "Gundlupet", "Hassan", 
    "Haveri", "Hospete", "Hubballi", "Kalaburagi", "Mangaluru", "Mysuru", "Shivamogga", "Tumakuru", 
    "Udupi", "Vijayapura", "Yadgir", "Mumbai", "Delhi", "Chennai", "Hyderabad", "Pune"
]

CITIES_KN_MAP = {
    "ಗೋಕಾಕ್": "Gokak",
    "ಗೋಕಾಕ": "Gokak",
    "ಬೆಳಗಾವಿ": "Belagavi",
    "ಬೆಂಗಳೂರು": "Bengaluru",
    "ಗದಗ": "Gadag",
    "ಧಾರವಾಡ": "Dharwad",
    "ಹುಬ್ಬಳ್ಳಿ": "Hubballi",
    "ಮೈಸೂರು": "Mysuru",
    "ಮಂಗಳೂರು": "Mangaluru",
    "ಕಲಬುರಗಿ": "Kalaburagi",
    "ಬಾಗಲಕೋಟೆ": "Bagalkot",
    "ವಿಜಯಪುರ": "Vijayapura",
    "ಶಿವಮೊಗ್ಗ": "Shivamogga",
    "ದಾವಣಗೆರೆ": "Davangere",
    "ತುಮಕೂರು": "Tumakuru",
    "ಉಡುಪಿ": "Udupi",
    "ಹಾಸನ": "Hassan",
    "ಹಾವೇರಿ": "Haveri",
    "ಬಳ್ಳಾರಿ": "Ballari",
    "ಕೊಪ್ಪಳ": "Koppal",
    "ರಾಯಚೂರು": "Raichur",
    "ಯಾದಗಿರಿ": "Yadgir",
    "ಚಿಕ್ಕಮಗಳೂರು": "Chikkamagaluru",
    "ಚಿಕ್ಕಬಳ್ಳಾಪುರ": "Chikkaballapur",
    "ಕೋಲಾರ": "Kolar",
    "ರಾಮನಗರ": "Ramanagara",
    "ಮಂಡ್ಯ": "Mandya",
    "ಚಾಮರಾಜನಗರ": "Chamarajanagar",
    "ಕೊಡಗು": "Kodagu",
    "ಉತ್ತರ ಕನ್ನಡ": "Uttara Kannada",
    "ದಕ್ಷಿಣ ಕನ್ನಡ": "Dakshina Kannada",
}

# ── Helpers ───────────────────────────────────────────────────
def is_kannada(text):
    """Detect if text contains Kannada script."""
    return bool(re.search(r'[\u0C80-\u0CFF]', text or ""))

def clean(text):
    """Lowercase and normalize whitespace and special chars."""
    if not text:
        return ""
    # Retain Kannada script, english chars, numbers and whitespace
    t = re.sub(r"[^\w\s\u0C80-\u0CFF]", " ", str(text).lower(), flags=re.UNICODE)
    return " ".join(t.split())

def strip_name_prefixes(query):
    """Strip common search phrases to isolate person's name."""
    q = clean(query)
    patterns = [
        r"^(who is|find|search|show me|open profile of|profile of|details of|details about|about|contact|call)\s+",
        r"^(advocate|adv\s*\.?|lawyer|attorney|mr\s*\.?|ms\s*\.?|mrs\s*\.?|dr\s*\.?)\s+",
        r"\s+(advocate|lawyer|profile|details|number|phone|contact|court)$",
        r"\s+(ವಕೀಲರು|ವಕೀಲ|ಪ್ರೊಫೈಲ್|ವಿವರ)$",
    ]
    changed = True
    while changed:
        changed = False
        for pat in patterns:
            new_q = re.sub(pat, "", q).strip()
            if new_q != q and len(new_q) >= 2:
                q = new_q
                changed = True
    return q

def format_advocate_card(adv):
    """Format advocate record for client display without fees or unavailable status."""
    name       = adv.get("name", "Advocate")
    spec       = adv.get("speciality") or adv.get("practiceArea", "General Legal Practice")
    city       = adv.get("city") or adv.get("district") or adv.get("taluk") or ""
    court      = adv.get("court") or adv.get("courtName") or "District & Sessions Court"
    court_lvl  = adv.get("courtLevel", "")
    district   = adv.get("district", "")
    taluk      = adv.get("taluk", "")
    place      = adv.get("place") or city or district
    rating     = adv.get("rating", 5.0)
    exp        = adv.get("experience", "5+ Years")
    phone      = adv.get("phone", "")
    cases      = adv.get("cases", "")
    adv_id     = adv.get("id", "")
    avatar     = adv.get("avatar", "")
    
    return {
        "id": adv_id,
        "name": name,
        "speciality": spec,
        "city": city,
        "district": district,
        "taluk": taluk,
        "court": court,
        "courtLevel": court_lvl,
        "place": place,
        "rating": rating,
        "experience": exp,
        "phone": phone,
        "cases": cases,
        "avatar": avatar,
        "profileUrl": f"/profile/{adv_id}",
    }

# ── Kannada to Latin Transliteration for Cross-Language Advocate Search ──
KN_CONSONANTS = {
    '\u0C95': 'k', '\u0C96': 'kh', '\u0C97': 'g', '\u0C98': 'gh', '\u0C99': 'ng',
    '\u0C9A': 'ch', '\u0C9B': 'chh', '\u0C9C': 'j', '\u0C9D': 'jh', '\u0C9E': 'ny',
    '\u0C9F': 't', '\u0CA0': 'th', '\u0CA1': 'd', '\u0CA2': 'dh', '\u0CA3': 'n',
    '\u0CA4': 't', '\u0CA5': 'th', '\u0CA6': 'd', '\u0CA7': 'dh', '\u0CA8': 'n',
    '\u0CAA': 'p', '\u0CAB': 'ph', '\u0CAC': 'b', '\u0CAD': 'bh', '\u0CAE': 'm',
    '\u0CAF': 'y', '\u0CB0': 'r', '\u0CB1': 'r', '\u0CB2': 'l', '\u0CB3': 'l',
    '\u0CB5': 'v', '\u0CB6': 'sh', '\u0CB7': 'sh', '\u0CB8': 's', '\u0CB9': 'h',
}
KN_VOWELS = {
    '\u0C85': 'a', '\u0C86': 'a', '\u0C87': 'i', '\u0C88': 'i', '\u0C89': 'u',
    '\u0C8A': 'u', '\u0C8B': 'ru', '\u0C8E': 'e', '\u0C8F': 'e', '\u0C90': 'ai',
    '\u0C92': 'o', '\u0C93': 'o', '\u0C94': 'au',
}
KN_MATRAS = {
    '\u0CBE': 'a', '\u0CBF': 'i', '\u0CC0': 'i', '\u0CC1': 'u', '\u0CC2': 'u',
    '\u0CC3': 'ru', '\u0CC6': 'e', '\u0CC7': 'e', '\u0CC8': 'ai',
    '\u0CCA': 'o', '\u0CCB': 'o', '\u0CCC': 'au',
}
KN_VIRAMA = '\u0CCD'
KN_ANUSVARA = '\u0C82'
KN_VISARGA = '\u0C83'

def transliterate_kn_to_en(text):
    """Transliterates Kannada text to phonetically matching English variants."""
    res = []
    i = 0
    n = len(text)
    while i < n:
        c = text[i]
        if c in KN_CONSONANTS:
            base = KN_CONSONANTS[c]
            if i + 1 < n:
                nxt = text[i + 1]
                if nxt == KN_VIRAMA:
                    res.append(base)
                    i += 2
                    continue
                elif nxt in KN_MATRAS:
                    res.append(base + KN_MATRAS[nxt])
                    i += 2
                    continue
                elif nxt == KN_ANUSVARA:
                    res.append(base + 'an')
                    i += 2
                    continue
            res.append(base + 'a')
            i += 1
        elif c in KN_VOWELS:
            res.append(KN_VOWELS[c])
            i += 1
        elif c == KN_ANUSVARA:
            res.append('m')
            i += 1
        elif c == KN_VISARGA:
            res.append('h')
            i += 1
        elif c in KN_MATRAS:
            res.append(KN_MATRAS[c])
            i += 1
        elif c == KN_VIRAMA:
            i += 1
        else:
            res.append(c)
            i += 1
    s = ''.join(res).lower().strip()
    variants = {s}
    if s.endswith('a') and len(s) > 3:
        variants.add(s[:-1])
    if 'v' in s: variants.add(s.replace('v', 'w'))
    if 'w' in s: variants.add(s.replace('w', 'v'))
    if 'sh' in s: variants.add(s.replace('sh', 's'))
    return list(variants)

# ── Live Search Functions ─────────────────────────────────────

def find_advocate_by_name(query):
    """Search live advocates from backend/data/advocates.json by name (supports both English and Kannada input)."""
    advocates = get_advocates()
    raw_q = clean(query)
    stripped_q = strip_name_prefixes(query)
    
    if len(stripped_q) < 2 and len(raw_q) < 2:
        return []

    # If query is in Kannada, generate transliteration variants to match against English names in advocates.json
    kn_variants = []
    if is_kannada(query) or is_kannada(stripped_q):
        kn_variants.extend(transliterate_kn_to_en(stripped_q))
        for part in stripped_q.split():
            if len(part) >= 2:
                kn_variants.extend(transliterate_kn_to_en(part))
        kn_variants = list(set([v for v in kn_variants if len(v) >= 2]))

    results = []
    seen_ids = set()

    for adv in advocates:
        adv_name = clean(adv.get("name", ""))
        adv_plain = clean(re.sub(r"^adv\s*\.?\s*", "", adv.get("name", ""), flags=re.I))
        adv_id = adv.get("id")

        # 1. Kannada transliteration match against English advocate name
        if kn_variants:
            matched_kn = False
            for v in kn_variants:
                if v in adv_name or v in adv_plain or (len(v) >= 4 and any(v == token for token in adv_name.split())):
                    matched_kn = True
                    break
            if matched_kn:
                if adv_id not in seen_ids:
                    seen_ids.add(adv_id)
                    results.append(adv)
                    continue

        # 2. Exact or substring match on English name
        if (stripped_q and (stripped_q in adv_name or stripped_q in adv_plain or adv_plain in stripped_q)) or \
           (raw_q and (raw_q in adv_name or raw_q in adv_plain)):
            if adv_id not in seen_ids:
                seen_ids.add(adv_id)
                results.append(adv)
                continue

        # 3. Match each token if user typed first + last name
        tokens = stripped_q.split()
        if len(tokens) >= 2 and all(t in adv_name for t in tokens):
            if adv_id not in seen_ids:
                seen_ids.add(adv_id)
                results.append(adv)

    return results

def find_advocates_by_city(city):
    """Search live advocates by city, district, taluk or place."""
    advocates = get_advocates()
    c = city.lower().strip()
    results = []
    for a in advocates:
        city_fld = a.get("city", "").lower()
        dist_fld = a.get("district", "").lower()
        taluk_fld = a.get("taluk", "").lower()
        place_fld = a.get("place", "").lower()
        court_fld = a.get("court", "").lower()
        if c in city_fld or c in dist_fld or c in taluk_fld or c in place_fld or c in court_fld:
            results.append(a)
    return results

def find_advocates_by_speciality(spec):
    """Search live advocates by speciality or practiceArea."""
    advocates = get_advocates()
    s = spec.lower().strip()
    results = []
    for a in advocates:
        spec_fld = a.get("speciality", "").lower()
        area_fld = a.get("practiceArea", "").lower()
        areas_list = [str(x).lower() for x in a.get("practiceAreas", [])]
        if s in spec_fld or s in area_fld or any(s in x for x in areas_list):
            results.append(a)
    return results

def detect_speciality(query):
    q = clean(query)
    for spec, keywords in SPECIALITY_KEYWORDS.items():
        if any(kw.lower() in q for kw in keywords):
            return spec
    return None

def detect_city(query):
    q = clean(query)
    # Check Kannada city map first
    for kn_city, en_city in CITIES_KN_MAP.items():
        if kn_city in q:
            return en_city
    # Check English cities list
    for city in CITIES_LIST:
        if city.lower() in q:
            return city
    return None

def detect_navigation(query):
    q = query.lower().strip()
    for keyword, path in NAV_MAP.items():
        if keyword in q:
            return path, keyword
    return None, None

# ── Clarity Guide Search (Bilingual) ───────────────────────────

def search_clarity_guide(query, lang="en"):
    """
    Search legal issues from backend/data/clarityguide.json.
    Returns structured legal advice with situation, applicable law,
    accused, filing person, and recommended advocate type.
    """
    clarity_list = get_clarity_guide()
    if not clarity_list:
        return None

    user_is_kn = is_kannada(query) or (lang == "kn")
    q_clean = clean(query)
    q_words = [w for w in q_clean.split() if len(w) >= 3]

    if not q_words and len(q_clean) < 3:
        return None

    best_match = None
    best_score = 0

    for item in clarity_list:
        score = 0
        sit_en = clean(item.get("situation", ""))
        sit_kn = clean(item.get("situationKn", ""))
        cat_en = clean(item.get("category", ""))
        cat_kn = clean(item.get("categoryKn", ""))
        act_en = clean(item.get("actLaw", ""))
        act_kn = clean(item.get("actLawKn", ""))
        adv_en = clean(item.get("advocate", ""))
        adv_kn = clean(item.get("advocateKn", ""))

        # Exact phrase bonus
        if q_clean in sit_en or q_clean in sit_kn:
            score += 25
        if q_clean in cat_en or q_clean in cat_kn:
            score += 15

        # Word overlap scoring
        for w in q_words:
            if user_is_kn:
                if w in sit_kn: score += 8
                if w in cat_kn: score += 5
                if w in act_kn: score += 4
                if w in adv_kn: score += 3
                if w in sit_en: score += 3
            else:
                if w in sit_en: score += 8
                if w in cat_en: score += 5
                if w in act_en: score += 4
                if w in adv_en: score += 3
                if w in sit_kn: score += 2

        if score > best_score:
            best_score = score
            best_match = item

    # Threshold for relevance
    if best_score < 7 or not best_match:
        return None

    # Find relevant advocates matching recommended advocate field
    adv_keyword = best_match.get("advocate", "").split()[0].lower() if best_match.get("advocate") else ""
    cat_keyword = best_match.get("category", "").split()[0].lower() if best_match.get("category") else ""
    
    suggested_advocates = []
    if adv_keyword:
        suggested_advocates = find_advocates_by_speciality(adv_keyword)
    if not suggested_advocates and cat_keyword:
        suggested_advocates = find_advocates_by_speciality(cat_keyword)

    return {
        "item": best_match,
        "score": best_score,
        "is_kn": user_is_kn,
        "advocates": [format_advocate_card(a) for a in suggested_advocates[:4]],
    }

# ── Main Response Function ────────────────────────────────────

def get_response(message, lang="en"):
    """
    Main response engine.
    Processes live data from advocates.json & clarityguide.json.
    Supports English & Kannada queries.
    """
    if not message or not isinstance(message, str):
        return {
            "text": "ದಯವಿಟ್ಟು ಪ್ರಶ್ನೆ ಟೈಪ್ ಮಾಡಿ ಅಥವಾ ಮಾತನಾಡಿ (Please type or speak your query).",
            "type": "text"
        }

    raw = message.strip()
    query = clean(raw)
    user_is_kn = is_kannada(raw) or (lang == "kn")

    # 1. Greetings (English & Kannada)
    greet_words = [
        "hello", "hi", "hey", "namaste", "namaskara", "namaskar", "good morning",
        "good afternoon", "good evening", "hii", "helo",
        "ನಮಸ್ಕಾರ", "ಹಲೋ", "ಹಾಯ್", "ಶುಭೋದಯ", "ಶುಭ ಸಂಜೆ"
    ]
    if any(g == query or query.startswith(g + " ") for g in greet_words):
        if user_is_kn:
            return {
                "text": "👋 ನಮಸ್ಕಾರ! ನಾನು **AdvocateHub AI ಸಹಾಯಕ**.\n\nನಾನು ನಿಮಗೆ ಈ ಕೆಳಗಿನವುಗಳಲ್ಲಿ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n• 🔍 **ವಕೀಲರ ಹುಡುಕಾಟ:** ಹೆಸರು, ಊರು (Gokak, Belagavi ಇತ್ಯಾದಿ) ಅಥವಾ ಕ್ಷೇತ್ರದ ಪ್ರಕಾರ\n• ⚖️ **ಕಾನೂನು ಮಾರ್ಗದರ್ಶಿ (Clarity Guide):** ಅಪಘಾತ, ವಿಚ್ಛೇದನ, ಆಸ್ತಿ ವಿವಾದ, ಚೆಕ್ ಬೌನ್ಸ್ ಇತ್ಯಾದಿ ಪ್ರಶ್ನೆಗಳು\n• 🧭 **ಪುಟಗಳ ಭೇಟಿ:** Bare Acts, Legal Documents, Ask Question ಇತ್ಯಾದಿ\n• 🎙️ **ಧ್ವನಿ ಸಂದೇಶ:** ಕನ್ನಡ ಅಥವಾ ಇಂಗ್ಲಿಷ್‌ನಲ್ಲಿ ಮಾತನಾಡಿ ಕೇಳಬಹುದು!\n\nನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?",
                "type": "text",
            }
        return {
            "text": "👋 Hello! I'm the **AdvocateHub AI Assistant**.\n\nI can help you:\n• 🔍 **Find advocates live:** Search by name, city (e.g. Gokak, Belagavi), or legal speciality\n• ⚖️ **Legal Clarity Guide:** Ask questions about road accidents, bail, divorce, property disputes, cheque bounce, etc.\n• 🧭 **Navigate:** Instantly open Bare Acts, Legal Documents, Ask Question, or profiles\n• 🎙️ **Voice to Text:** Speak in either English or Kannada!\n\nWhat can I help you with today?",
            "type": "text",
        }

    # 2. PRIORITY: Direct Advocate Name Search
    # If the user enters a person's name (e.g., "Shankar", "Adv. Shankar", "Sanju", "Priya", "who is Shankar"),
    # search live advocates.json immediately!
    name_matches = find_advocate_by_name(raw)
    # Check if the query is a direct person lookup (short or explicitly asking for a person)
    has_person_intent = any(w in query for w in ["who is", "advocate", "lawyer", "profile", "details of", "ವಕೀಲ", "ಪ್ರೊಫೈಲ್"]) or len(query.split()) <= 4
    if name_matches and has_person_intent:
        if len(name_matches) == 1:
            adv = name_matches[0]
            card = format_advocate_card(adv)
            loc_str = f"{card['place']}" if card['place'] else (card['district'] or "Karnataka")
            if user_is_kn:
                reply_text = f"✅ **{card['name']}** ವಕೀಲರ ವಿವರ ದೊರೆತಿದೆ:\n• **ವಿಭಾಗ:** {card['speciality']}\n• 🏛️ **ನ್ಯಾಯಾಲಯ:** {card['court']}\n• 📍 **ಸ್ಥಳ:** {loc_str}\n• 📅 **ಅನುಭವ:** {card['experience']}\n• ⭐ **ರೇಟಿಂಗ್:** {card['rating']}"
            else:
                reply_text = f"✅ Found advocate details for **{card['name']}**:\n• **Speciality:** {card['speciality']}\n• 🏛️ **Court:** {card['court']}\n• 📍 **Location:** {loc_str}\n• 📅 **Experience:** {card['experience']}\n• ⭐ **Rating:** {card['rating']}"
            
            return {
                "text": reply_text,
                "type": "advocates",
                "advocates": [card],
                "profileId": adv.get("id"),
                "navigate": f"/profile/{adv.get('id')}",
            }
        else:
            if user_is_kn:
                reply_text = f"🔍 **'{raw}'** ಹೆಸರಿನ {len(name_matches)} ವಕೀಲರು ಲಭ್ಯವಿದ್ದಾರೆ. ಕೆಳಗಿನ ಪ್ರೊಫೈಲ್ ಪರಿಶೀಲಿಸಿ:"
            else:
                reply_text = f"🔍 Found {len(name_matches)} advocates matching **'{raw}'**:"
            return {
                "text": reply_text,
                "type": "advocates",
                "advocates": [format_advocate_card(a) for a in name_matches[:6]],
            }

    # 3. Navigation commands
    nav_triggers = ["go to", "navigate to", "open page", "take me to", "show me page", "visit", "ತೆರೆ", "ಹೋಗು"]
    if any(t in query for t in nav_triggers):
        path, keyword = detect_navigation(query)
        if path:
            label = keyword.replace("-", " ").title()
            msg = f"ಖಂಡಿತ! {label} ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ..." if user_is_kn else f"Taking you to the {label} page..."
            return {
                "text": msg,
                "type": "navigate",
                "navigate": path,
            }

    # 4. Multi-parameter Search (Speciality + City)
    detected_spec = detect_speciality(query)
    detected_city = detect_city(query)
    
    if detected_spec and detected_city:
        spec_matched = find_advocates_by_speciality(detected_spec)
        combined = [
            a for a in spec_matched
            if detected_city.lower() in a.get("city", "").lower()
            or detected_city.lower() in a.get("district", "").lower()
            or detected_city.lower() in a.get("taluk", "").lower()
            or detected_city.lower() in a.get("place", "").lower()
        ]
        if combined:
            if user_is_kn:
                text = f"**{detected_city}** ನಲ್ಲಿ {detected_spec.title()} ವಿಭಾಗದ {len(combined)} ವಕೀಲರು ಲಭ್ಯವಿದ್ದಾರೆ:"
            else:
                text = f"Found {len(combined)} {detected_spec.title()} advocate(s) in **{detected_city}**:"
            return {
                "text": text,
                "type": "advocates",
                "advocates": [format_advocate_card(a) for a in combined[:6]],
            }

    # 5. Filter explicitly by City (e.g. "Gokak", "Belagavi", "Gadag", "ಗೋಕಾಕ್")
    if detected_city and (len(query.split()) <= 3 or "in " + detected_city.lower() in query or "advocates in" in query):
        city_results = find_advocates_by_city(detected_city)
        if city_results:
            if user_is_kn:
                text = f"**{detected_city}** ನಲ್ಲ ಲಭ್ಯವಿರುವ {len(city_results)} ವಕೀಲರು:"
            else:
                text = f"Found {len(city_results)} advocate(s) listed in **{detected_city}**:"
            return {
                "text": text,
                "type": "advocates",
                "advocates": [format_advocate_card(a) for a in city_results[:6]],
            }
        else:
            msg = f"**{detected_city}** ನಲ್ಲಿ ಸದ್ಯಕ್ಕೆ ಯಾವುದೇ ವಕೀಲರು ನೋಂದಣಿಯಾಗಿಲ್ಲ. ಎಲ್ಲಾ ವಕೀಲರನ್ನು ಹುಡುಕಿ." if user_is_kn else f"No advocates currently listed under **{detected_city}**. You can view all advocates on the directory."
            return {
                "text": msg,
                "type": "text",
                "navigate": "/find-lawyer"
            }

    # 6. Filter by Speciality alone
    if detected_spec and (len(query.split()) <= 3 or any(w in query for w in ["lawyer", "advocate", "ವಕೀಲ", "ಕೋರ್ಟ್", "specialist"])):
        spec_results = find_advocates_by_speciality(detected_spec)
        if spec_results:
            if user_is_kn:
                text = f"**{detected_spec.title()}** ವಿಭಾಗದ ವಕೀಲರು ({len(spec_results)} ಲಭ್ಯವಿದೆ):"
            else:
                text = f"Here are verified advocates specialising in **{detected_spec.title()} Law** ({len(spec_results)} available):"
            return {
                "text": text,
                "type": "advocates",
                "advocates": [format_advocate_card(a) for a in spec_results[:6]],
            }

    # 7. CONNECT WITH CLARITY GUIDE (backend/data/clarityguide.json)
    # Answers legal situations, applicable laws, accused parties, and who can file
    clarity_res = search_clarity_guide(raw, lang="kn" if user_is_kn else "en")
    if clarity_res:
        item = clarity_res["item"]
        advs = clarity_res["advocates"]
        
        if user_is_kn:
            sit  = item.get("situationKn") or item.get("situation")
            act  = item.get("actLawKn") or item.get("actLaw")
            acc  = item.get("accusedKn") or item.get("accused")
            who  = item.get("whoCanFileKn") or item.get("whoCanFile")
            rec  = item.get("advocateKn") or item.get("advocate")
            cat  = item.get("categoryKn") or item.get("category")

            reply = (
                f"⚖️ **ಕಾನೂನು ಮಾರ್ಗದರ್ಶಿ (Clarity Guide)**\n\n"
                f"📌 **ಪರಿಸ್ಥಿತಿ:** {sit}\n\n"
                f"📜 **ಅನ್ವಯವಾಗುವ ಕಾಯ್ದೆ / ಸೆಕ್ಷನ್:** {act}\n\n"
                f"👤 **ಆರೋಪಿ / ಎದುರು ಪಕ್ಷ:** {acc}\n\n"
                f"📝 **ಯಾರು ಕೇಸ್ / ದೂರು ಸಲ್ಲಿಸಬಹುದು:** {who}\n\n"
                f"👨‍⚖️ **ಸಲಹೆ ಪಡೆಯಬೇಕಾದ ವಕೀಲರು:** {rec}\n\n"
                f"📁 **ವಿಭಾಗ:** {cat}"
            )
        else:
            sit  = item.get("situation")
            act  = item.get("actLaw")
            acc  = item.get("accused")
            who  = item.get("whoCanFile")
            rec  = item.get("advocate")
            cat  = item.get("category")

            reply = (
                f"⚖️ **Legal Clarity Guide**\n\n"
                f"📌 **Situation:** {sit}\n\n"
                f"📜 **Applicable Law / Section:** {act}\n\n"
                f"👤 **Accused / Responsible Party:** {acc}\n\n"
                f"📝 **Who Can File Complaint / Case:** {who}\n\n"
                f"👨‍⚖️ **Recommended Advocate:** {rec}\n\n"
                f"📁 **Category:** {cat}"
            )

        resp_dict = {
            "text": reply,
            "type": "clarity" if not advs else "advocates",
        }
        if advs:
            resp_dict["advocates"] = advs
        return resp_dict

    # 8. List all advocates command
    list_triggers = ["all advocates", "all lawyers", "list advocates", "show all", "advocates list", "ಎಲ್ಲಾ ವಕೀಲರು", "ವಕೀಲರ ಪಟ್ಟಿ"]
    if any(t in query for t in list_triggers):
        all_advs = get_advocates()
        msg = f"ಲಭ್ಯವಿರುವ ಒಟ್ಟು {len(all_advs)} ವಕೀಲರಲ್ಲಿ ಕೆಲವರು:" if user_is_kn else f"Here are our listed advocates ({len(all_advs)} total available):"
        return {
            "text": msg,
            "type": "advocates",
            "advocates": [format_advocate_card(a) for a in all_advs[:8]],
            "navigate": "/find-lawyer",
        }

    # 9. General navigation fallback lookup
    path, keyword = detect_navigation(query)
    if path:
        label = keyword.replace("-", " ").title()
        msg = f"{label} ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯುತ್ತಿದ್ದೇನೆ..." if user_is_kn else f"Taking you to {label}..."
        return {
            "text": msg,
            "type": "navigate",
            "navigate": path,
        }

    # 10. Secondary Advocate Name Lookup (in case query had extra words)
    name_matches_secondary = find_advocate_by_name(raw)
    if name_matches_secondary:
        card = format_advocate_card(name_matches_secondary[0])
        msg = f"**{card['name']}** ವಕೀಲರ ಪ್ರೊಫೈಲ್:" if user_is_kn else f"Found advocate profile for **{card['name']}**:"
        return {
            "text": msg,
            "type": "advocates",
            "advocates": [card],
            "profileId": name_matches_secondary[0].get("id"),
        }

    # 11. Help command
    help_words = ["help", "what can you do", "commands", "options", "assist", "ಸಹಾಯ"]
    if any(h in query for h in help_words):
        if user_is_kn:
            return {
                "text": "🤖 **AdvocateHub ಸಹಾಯಕ ಕಮಾಂಡ್‌ಗಳು:**\n\n🔍 **ವಕೀಲರ ಹುಡುಕಾಟ:**\n• ವಕೀಲರ ಹೆಸರು (ಉದಾ: 'Shankar', 'Priya Sharma')\n• ಊರಿನ ಹೆಸರು (ಉದಾ: 'Gokak', 'Belagavi', 'Gadag')\n• 'Criminal lawyers in Gokak'\n\n⚖️ **ಕಾನೂನು ಪ್ರಶ್ನೆಗಳು (Clarity Guide):**\n• 'ರಸ್ತೆ ಅಪಘಾತ ಪರಿಹಾರ'\n• 'ಚೆಕ್ ಬೌನ್ಸ್'\n• 'ವಿಚ್ಛೇದನ ಅರ್ಜಿ'\n• 'What is bail?'\n\n🧭 **ಪುಟಗಳ ಭೇಟಿ:**\n• 'Bare Acts'\n• 'Legal Documents'\n\n🎙️ ಧ್ವನಿ ಮೂಲಕವೂ ಮಾತನಾಡಬಹುದು!",
                "type": "text",
            }
        return {
            "text": "🤖 **AdvocateHub Bot Commands:**\n\n🔍 **Find Advocates & Courts**\n→ Search any advocate name (e.g. 'Shankar', 'Priya')\n→ Type any city (e.g. 'Gokak', 'Belagavi')\n→ 'Criminal lawyers in Gokak'\n\n⚖️ **Legal Clarity Guide**\n→ 'Road accident death'\n→ 'Drunk driving accident'\n→ 'Cheque bounce notice'\n→ 'Property dispute'\n\n🧭 **Platform Navigation**\n→ 'Go to Bare Acts'\n→ 'Open Legal Documents'\n\n🎙️ You can also use the microphone to speak in Kannada or English!",
            "type": "text",
        }

    # 12. Final fallback
    if user_is_kn:
        return {
            "text": "ಕ್ಷಮಿಸಿ, ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಸರಿಯಾಗಿ ಅರ್ಥವಾಗಲಿಲ್ಲ. ನೀವು ವಕೀಲರ ಹೆಸರು (ಉದಾ: **'Shankar'**), ಊರು (ಉದಾ: **'Gokak'**), ಅಥವಾ ಕಾನೂನು ಪ್ರಶ್ನೆ (ಉದಾ: **'ಅಪಘಾತ'**, **'ಚೆಕ್ ಬೌನ್ಸ್'**) ಕೇಳಬಹುದು.",
            "type": "text",
        }
    return {
        "text": "I'm not quite sure I caught that. You can search by advocate name (e.g. **'Shankar'**), city (e.g. **'Gokak'**), or ask a legal question (e.g. **'road accident'**, **'cheque bounce'**, **'bail'**). Type **'help'** to see all commands.",
        "type": "text",
    }