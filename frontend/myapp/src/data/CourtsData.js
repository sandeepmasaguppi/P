// ============================================================
//  CourtsData.js — Karnataka Court Levels, Districts & Taluks
// ============================================================

export const COURT_LEVELS = [
  "Supreme Court",
  "High Court",
  "District & Sessions Court",
  "Taluk / JMFC / Civil Court",
  "Family Court",
  "Consumer Forum / Commission",
  "Labour & Industrial Tribunal",
  "Revenue Court / Land Tribunal",
];

export const HIGH_COURT_BENCHES = [
  "High Court of Karnataka - Principal Bench (Bengaluru)",
  "High Court of Karnataka - Dharwad Bench",
  "High Court of Karnataka - Kalaburagi Bench",
  "High Court of Judicature (Other High Court)",
];

export const KARNATAKA_DISTRICTS_TALUKS = {
  "Belagavi": [
    "Gokak", "Athani", "Bailhongal", "Belagavi", "Chikkodi", "Hukkeri",
    "Kagawad", "Khanapur", "Kittur", "Mudalagi", "Nippani", "Raibag",
    "Ramdurg", "Saundatti (Yellamma)", "Yaragatti"
  ],
  "Bagalkot": [
    "Bagalkot", "Badami", "Bilagi", "Guledgudda", "Hunagund", "Ilkal",
    "Jamkhandi", "Mudhol", "Rabkavi Banhatti"
  ],
  "Ballari": [
    "Ballari", "Kampli", "Kurugodu", "Sandur", "Siruguppa"
  ],
  "Bengaluru Urban": [
    "Bengaluru North", "Bengaluru South", "Bengaluru East", "Anekal", "Yelahanka"
  ],
  "Bengaluru Rural": [
    "Devanahalli", "Doddaballapur", "Hosakote", "Nelamangala"
  ],
  "Bidar": [
    "Bidar", "Aurad", "Basavakalyan", "Bhalki", "Chittaguppa", "Hulsoor",
    "Humnabad", "Kamalnagar"
  ],
  "Chamarajanagar": [
    "Chamarajanagar", "Gundlupet", "Hanur", "Kollegal", "Yelandur"
  ],
  "Chikkaballapur": [
    "Chikkaballapur", "Bagepalli", "Chintamani", "Gauribidanur", "Gudibande", "Sidlaghatta"
  ],
  "Chikkamagaluru": [
    "Chikkamagaluru", "Ajjampura", "Kadur", "Koppa", "Mudigere",
    "Narasimharajapura", "Sringeri", "Tarikere"
  ],
  "Chitradurga": [
    "Chitradurga", "Challakere", "Hiriyur", "Holalkere", "Hosadurga", "Molakalmuru"
  ],
  "Dakshina Kannada (Mangaluru)": [
    "Mangaluru", "Bantwal", "Belthangady", "Kadaba", "Moodabidri", "Puttur", "Sullia"
  ],
  "Davanagere": [
    "Davanagere", "Channagiri", "Harihar", "Honnali", "Jagalur", "Nyamathi"
  ],
  "Dharwad": [
    "Dharwad", "Alnavar", "Annigeri", "Hubballi Rural", "Hubballi Urban",
    "Kalghatgi", "Kundgol", "Navalgund"
  ],
  "Gadag": [
    "Gadag", "Gajendragad", "Lakshmeshwar", "Mundargi", "Nargund", "Ron", "Shirahatti"
  ],
  "Hassan": [
    "Hassan", "Alur", "Arkalgud", "Arsikere", "Belur", "Channarayapatna",
    "Holenarasipura", "Sakleshpur"
  ],
  "Haveri": [
    "Haveri", "Byadgi", "Hangal", "Hirekerur", "Ranebennur", "Rattihalli",
    "Savanur", "Shiggaon"
  ],
  "Kalaburagi (Gulbarga)": [
    "Kalaburagi", "Afzalpur", "Aland", "Chincholi", "Chitapur", "Jevargi",
    "Kalagi", "Kamalapur", "Sedam", "Shahabad", "Yedrami"
  ],
  "Kodagu (Madikeri)": [
    "Madikeri", "Kushalnagar", "Ponnampet", "Somwarpet", "Virajpet"
  ],
  "Kolar": [
    "Kolar", "Bangarapet", "KGF", "Malur", "Mulbagal", "Srinivaspur"
  ],
  "Koppal": [
    "Koppal", "Gangavathi", "Kanakagiri", "Karatagi", "Kukanoor", "Kushtagi", "Yelburga"
  ],
  "Mandya": [
    "Mandya", "K.R. Pet", "Maddur", "Malavalli", "Nagamangala", "Pandavapura", "Srirangapatna"
  ],
  "Mysuru (Mysore)": [
    "Mysuru", "H.D. Kote", "Hunsur", "K.R. Nagar", "Nanjangud", "Piriyapatna",
    "Saragur", "T. Narasipura"
  ],
  "Raichur": [
    "Raichur", "Devadurga", "Lingsugur", "Manvi", "Maski", "Sindhanur", "Sirwar"
  ],
  "Ramanagara": [
    "Ramanagara", "Channapatna", "Harohalli", "Kanakapura", "Magadi"
  ],
  "Shivamogga (Shimoga)": [
    "Shivamogga", "Bhadravathi", "Hosanagara", "Sagara", "Shikaripura", "Soraba", "Thirthahalli"
  ],
  "Tumakuru (Tumkur)": [
    "Tumakuru", "Chiknayakanhalli", "Gubbi", "Koratagere", "Kunigal", "Madhugiri",
    "Pavagada", "Sira", "Tiptur", "Turuvekere"
  ],
  "Udupi": [
    "Udupi", "Brahmavara", "Byndoor", "Hebri", "Karkala", "Kaup", "Kundapura"
  ],
  "Uttara Kannada (Karwar)": [
    "Karwar", "Ankola", "Bhatkal", "Dandeli", "Haliyal", "Honnavar", "Joida",
    "Kumta", "Mundgod", "Siddapur", "Sirsi", "Yellapur"
  ],
  "Vijayapura (Bijapur)": [
    "Vijayapura", "Babaleshwar", "Basavana Bagewadi", "Chadchan", "Devar Hippargi",
    "Indi", "Kolhar", "Muddebihal", "Nidagundi", "Sindagi", "Tikota"
  ],
  "Vijayanagara": [
    "Hosapete", "Hagaribommanahalli", "Harapanahalli", "Hoovina Hadagali", "Kotturu", "Kudligi"
  ],
  "Yadgir": [
    "Yadgir", "Gurmitkal", "Hunsagi", "Shahapur", "Shorapur", "Vadagera"
  ]
};

export function getDistricts() {
  return Object.keys(KARNATAKA_DISTRICTS_TALUKS).sort();
}

export function getTaluksForDistrict(district) {
  if (!district) return [];
  return KARNATAKA_DISTRICTS_TALUKS[district] || [];
}

export function buildTargetCourt({ courtLevel, district, taluk, bench }) {
  if (courtLevel === "Supreme Court") {
    return "Supreme Court of India (New Delhi)";
  }
  if (courtLevel === "High Court") {
    return bench || "High Court of Karnataka";
  }
  if (courtLevel === "District & Sessions Court") {
    return district ? `${district} District & Sessions Court` : "District & Sessions Court";
  }
  if (courtLevel === "Taluk / JMFC / Civil Court") {
    if (taluk && district) return `${taluk} JMFC & Civil Court (${district} District)`;
    if (taluk) return `${taluk} JMFC & Civil Court`;
    if (district) return `${district} District - Taluk / JMFC Court`;
    return "Taluk / JMFC Court";
  }
  if (courtLevel === "Family Court") {
    return district ? `${district} Family Court` : "Family Court";
  }
  if (courtLevel === "Consumer Forum / Commission") {
    return district ? `District Consumer Disputes Redressal Commission (${district})` : "District Consumer Forum";
  }
  if (courtLevel === "Labour & Industrial Tribunal") {
    return district ? `Labour & Industrial Tribunal (${district})` : "Labour Court";
  }
  if (courtLevel === "Revenue Court / Land Tribunal") {
    if (taluk) return `${taluk} Revenue Court / Tahsildar Court`;
    if (district) return `${district} Revenue Court`;
    return "Revenue Court";
  }
  return taluk ? `${taluk} Court` : (district ? `${district} Court` : "Court");
}
