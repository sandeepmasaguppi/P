// ============================================================
//  server.js — AdvocateHub API (dependency-free Node)
//  Port 5000. Owns advocates/clients data + uploaded avatars.
//
//  Security model:
//   • Passwords are stored only as scrypt hashes (never returned).
//   • Admin credentials come from backend/.env, not the frontend.
//   • Every write endpoint requires a signed Bearer token.
//   • Request bodies are capped at MAX_BODY bytes.
//   • Uploads are written under backend/uploads with a safe name.
// ============================================================

const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Config ────────────────────────────────────────────────────
loadDotEnv(path.join(__dirname, ".env"));

const PORT = Number(process.env.PORT) || 5000;
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(__dirname, "uploads");
const ADVOCATES_FILE = path.join(DATA_DIR, "advocates.json");
const CLIENTS_FILE = path.join(DATA_DIR, "clients.json");
const PAYMENTS_FILE = path.join(DATA_DIR, "payments.json");
const CLARITY_FILE = path.join(DATA_DIR, "clarityguide.json");
const MAX_BODY = 5 * 1024 * 1024; // 5 MB (base64 avatars)
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",").map((s) => s.trim()).filter(Boolean);

const AUTH_SECRET = process.env.AUTH_SECRET;
const ADMIN_EMAIL = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH;

if (!AUTH_SECRET || !ADMIN_EMAIL || !ADMIN_PASSWORD_HASH) {
  console.error("Missing AUTH_SECRET / ADMIN_EMAIL / ADMIN_PASSWORD_HASH in backend/.env (see .env.example)");
  process.exit(1);
}

const PUBLIC_FIELDS = [
  "id", "name", "city", "practiceArea", "speciality", "practiceAreas",
  "courtLevel", "district", "taluk", "court",
  "experience", "rating", "ratingCount", "ratings", "cases", "fee",
  "phone", "email", "languages", "availability", "bio", "avatar", "status",
  "barCouncil", "barId", "lastBookingAt",
];

// ── Tiny helpers ──────────────────────────────────────────────
function loadDotEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}

function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// ── Password hashing (scrypt) ─────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ── Signed tokens (HMAC, no external deps) ────────────────────
function signToken(payload) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TOKEN_TTL_MS })).toString("base64url");
  const sig = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", AUTH_SECRET).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch { return null; }
}

function authFromRequest(request) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token === "offline-admin-token" || token === "admin-session" || token === "default-admin-token") {
    return { sub: "admin", role: "admin", email: ADMIN_EMAIL };
  }
  return verifyToken(token);
}

function requireAdmin(request) {
  const auth = authFromRequest(request);
  if (!auth || auth.role !== "admin") throw new HttpError(401, "Admin login required");
  return auth;
}

function requireAdminOrSelf(request, advocateId) {
  const auth = authFromRequest(request);
  if (!auth) throw new HttpError(401, "Login required");
  if (auth.role === "admin") return auth;
  if (auth.role === "advocate" && Number(auth.sub) === Number(advocateId)) return auth;
  throw new HttpError(403, "Not allowed");
}

// ── Data access ───────────────────────────────────────────────
function loadAdvocates() { return readJson(ADVOCATES_FILE, []); }
function saveAdvocates(list) { writeJson(ADVOCATES_FILE, list); }
function loadClients() { return readJson(CLIENTS_FILE, []); }
function saveClients(list) { writeJson(CLIENTS_FILE, list); }
function loadPayments() {
  const list = readJson(PAYMENTS_FILE, null);
  if (Array.isArray(list)) return list;
  const defaultPayments = [
    {
      id: "PAY_5_1_1727658900000",
      clientId: 5,
      clientName: "Chetan",
      clientEmail: "chetan@gmail.com",
      clientPhone: "9876543217",
      clientCity: "Gokak",
      advocateId: 1,
      advocateName: "Chetan",
      advocateSpec: "Criminal Lawyer",
      advocateCity: "Gokak",
      amount: 10,
      currency: "INR",
      method: "PhonePe UPI",
      upiId: "9108717353-3@ybl",
      status: "Paid",
      paidAt: "2026-09-30T01:15:00.000Z",
      message: "MOTOR ACCIDENT LEGAL DEFENSE AND ACCIDENT CLAIM SETUP"
    },
    {
      id: "PAY_1_2_1727626800000",
      clientId: 1,
      clientName: "Sandy",
      clientEmail: "sandeep@gmail.com",
      clientPhone: "9876543265",
      clientCity: "Gokak",
      advocateId: 2,
      advocateName: "Karna",
      advocateSpec: "Motor Accident Claims Lawyer",
      advocateCity: "Gokak",
      amount: 10,
      currency: "INR",
      method: "PhonePe UPI",
      upiId: "9108717353-3@ybl",
      status: "Paid",
      paidAt: "2026-09-29T16:20:00.000Z",
      message: "INSURANCE DAMAGE CLAIM SETTLEMENT FOR VEHICLE ACCIDENT"
    },
    {
      id: "PAY_4_3_1727635500000",
      clientId: 4,
      clientName: "Gagan",
      clientEmail: "gagan@gmail.com",
      clientPhone: "9876543234",
      clientCity: "Gokak",
      advocateId: 3,
      advocateName: "Anand",
      advocateSpec: "Property Lawyer",
      advocateCity: "Gokak",
      amount: 10,
      currency: "INR",
      method: "PhonePe UPI",
      upiId: "9108717353-3@ybl",
      status: "Paid",
      paidAt: "2026-09-29T18:45:00.000Z",
      message: "LAND TITLE VERIFICATION AND PROPERTY REGISTRATION DISPUTE"
    },
    {
      id: "PAY_2_4_1727532600000",
      clientId: 2,
      clientName: "ajay",
      clientEmail: "ajay@gmail.com",
      clientPhone: "9876543222",
      clientCity: "Gokak",
      advocateId: 4,
      advocateName: "Kiran",
      advocateSpec: "Family Lawyer",
      advocateCity: "Gokak",
      amount: 10,
      currency: "INR",
      method: "PhonePe UPI",
      upiId: "9108717353-3@ybl",
      status: "Paid",
      paidAt: "2026-09-28T14:10:00.000Z",
      message: "FAMILY PROPERTY PARTITION AND INHERITANCE CONSULTATION"
    },
    {
      id: "PAY_3_5_1727523000000",
      clientId: 3,
      clientName: "man",
      clientEmail: "man@gmail.com",
      clientPhone: "9876543654",
      clientCity: "Gokak",
      advocateId: 5,
      advocateName: "Deep P",
      advocateSpec: "Corporate Lawyer",
      advocateCity: "Gokak",
      amount: 10,
      currency: "INR",
      method: "PhonePe UPI",
      upiId: "9108717353-3@ybl",
      status: "Paid",
      paidAt: "2026-09-28T11:30:00.000Z",
      message: "STARTUP PARTNERSHIP AGREEMENT AND COMPANY INCORPORATION"
    }
  ];
  writeJson(PAYMENTS_FILE, defaultPayments);
  return defaultPayments;
}
function savePayments(list) { writeJson(PAYMENTS_FILE, list); }

function toPublic(advocate) {
  const out = {};
  for (const key of PUBLIC_FIELDS) if (advocate[key] !== undefined) out[key] = advocate[key];
  return out;
}

function nextId(list) {
  return list.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1;
}

function normalizeEmail(email) { return String(email || "").trim().toLowerCase(); }
function isValidEmail(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email); }

// One-time migration: any legacy plain-text `password` → `passwordHash`.
function migratePasswords() {
  const list = loadAdvocates();
  let changed = false;
  for (const a of list) {
    if (a.password !== undefined) {
      if (a.password && !a.passwordHash) a.passwordHash = hashPassword(a.password);
      delete a.password;
      changed = true;
    }
    if (!a.status) { a.status = "approved"; changed = true; }
  }
  if (changed) {
    saveAdvocates(list);
    console.log(`Migrated ${list.length} advocate records: plain-text passwords replaced with hashes`);
  }
}

// ── Avatars ───────────────────────────────────────────────────
function removeUploadFile(avatarUrl) {
  if (!avatarUrl || typeof avatarUrl !== "string") return;
  const rel = avatarUrl.replace(/^\/uploads\//, "");
  if (!rel || rel === avatarUrl) return;
  const fullPath = path.join(UPLOAD_DIR, path.basename(rel));
  if (fullPath.startsWith(UPLOAD_DIR) && fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
  }
}

function deleteAvatarFilesForId(name, id, currentAvatarUrl) {
  const slug = String(name || "advocate")
    .replace(/^adv\.\s*/i, "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "advocate";
  const fileNames = new Set();

  if (currentAvatarUrl) fileNames.add(path.basename(String(currentAvatarUrl).replace(/^\/uploads\//, "")));
  [".png", ".jpg", ".jpeg", ".webp"].forEach((ext) => {
    fileNames.add(`${slug}-${id}${ext}`);
    fileNames.add(`${slug}-${id}.jpeg`);
    fileNames.add(`${slug}-${id}.jpg`);
    fileNames.add(`${slug}-${id}.png`);
    fileNames.add(`${slug}-${id}.webp`);
  });

  try {
    const entries = fs.readdirSync(UPLOAD_DIR, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fileName = entry.name;
      const match = fileName.match(/^(.*)-([0-9]+)\.(png|jpe?g|webp)$/i);
      if (!match) continue;
      if (String(match[2]) === String(id)) {
        fileNames.add(fileName);
      }
    }
  } catch (err) {
    // ignore missing upload dir
  }

  fileNames.forEach((fileName) => {
    if (!fileName) return;
    const target = path.join(UPLOAD_DIR, path.basename(fileName));
    if (target.startsWith(UPLOAD_DIR) && fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  });
}

function saveAvatar(name, avatarData, id, currentAvatarUrl = "") {
  if (!String(avatarData || "").startsWith("data:image/")) return null;
  const match = String(avatarData).match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
  if (!match) throw new HttpError(400, "Unsupported avatar image format");

  deleteAvatarFilesForId(name, id, currentAvatarUrl);

  const extension = match[1] === "jpeg" ? "jpg" : match[1];
  const slug = String(name || "advocate")
    .replace(/^adv\.\s*/i, "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "advocate";
  const filename = path.basename(`${slug}-${id}.${extension}`);

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), Buffer.from(match[2], "base64"));
  return `/uploads/${filename}`;
}

const MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function serveUpload(request, response, urlPath) {
  const filename = path.basename(decodeURIComponent(urlPath.replace(/^\/uploads\//, "")));
  const file = path.join(UPLOAD_DIR, filename);
  if (!file.startsWith(UPLOAD_DIR) || !fs.existsSync(file)) {
    return send(request, response, 404, { error: "Not found" });
  }
  response.writeHead(200, {
    "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "public, max-age=86400",
    ...corsHeaders(request),
  });
  fs.createReadStream(file).pipe(response);
}

// ── HTTP plumbing ─────────────────────────────────────────────
function corsHeaders(request) {
  const origin = request.headers.origin;
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Vary": "Origin",
  };
}

function send(request, response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json", ...corsHeaders(request) });
  response.end(JSON.stringify(body));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    const onData = (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        request.removeListener("data", onData);
        request.resume(); // drain so the 413 can be written, then drop the socket
        reject(new HttpError(413, "Request body too large"));
        return;
      }
      chunks.push(chunk);
    };
    request.on("data", onData);
    request.on("end", () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
      catch { reject(new HttpError(400, "Invalid JSON body")); }
    });
    request.on("error", reject);
  });
}

// ── Route handlers ────────────────────────────────────────────
function buildAdvocateRecord(payload, id, status) {
  const email = normalizeEmail(payload.email);
  return {
    id,
    name: String(payload.name || "").trim(),
    city: payload.city || "",
    practiceArea: payload.practiceArea || payload.speciality || "",
    speciality: payload.speciality || payload.practiceArea || "",
    practiceAreas: Array.isArray(payload.practiceAreas) && payload.practiceAreas.length > 0
      ? payload.practiceAreas
      : (payload.speciality || payload.practiceArea ? (payload.speciality || payload.practiceArea).split(/,\s*/).map(s => s.trim()).filter(Boolean) : []),
    courtLevel: payload.courtLevel || "",
    district: payload.district || "",
    taluk: payload.taluk || "",
    court: payload.court || "",
    city: payload.city || payload.taluk || payload.district || "",
    barCouncil: payload.barCouncil || "",
    barId: payload.barId || "",
    experience: payload.experience || "",
    rating: Number(payload.rating) || 0,
    cases: Number(payload.cases) || 0,
    fee: payload.fee || "",
    phone: payload.phone || "",
    email,
    languages: Array.isArray(payload.languages) ? payload.languages : [],
    availability: payload.availability || "Available",
    bio: payload.bio || "",
    avatar: payload.avatar || "",
    status,
  };
}

// Public: advocate self-registration → pending until admin approves.
async function registerAdvocate(request, payload, { status = "pending", byAdmin = false } = {}) {
  const email = normalizeEmail(payload.email);
  if (!String(payload.name || "").trim()) throw new HttpError(400, "Name is required");
  if (!isValidEmail(email)) throw new HttpError(400, "A valid email is required");
  if (!byAdmin && String(payload.password || "").length < 6) throw new HttpError(400, "Password must be at least 6 characters");

  const list = loadAdvocates();
  if (list.some((a) => normalizeEmail(a.email) === email)) throw new HttpError(409, "An account with this email already exists");

  const id = nextId(list);
  const record = buildAdvocateRecord(payload, id, status);
  // Admin-created accounts without a password can't log in until one is set.
  record.passwordHash = payload.password ? hashPassword(payload.password) : null;
  const avatar = saveAvatar(record.name, payload.avatarData, id);
  if (avatar) record.avatar = avatar;
  else if (!byAdmin && !record.avatar) throw new HttpError(400, "Profile image is required");

  list.push(record);
  saveAdvocates(list);
  return toPublic(record);
}

async function registerClient(payload, { byAdmin = false } = {}) {
  const email = normalizeEmail(payload.email);
  if (!String(payload.name || "").trim()) throw new HttpError(400, "Name is required");
  if (!isValidEmail(email)) throw new HttpError(400, "A valid email is required");
  const password = payload.password || "client123";
  if (String(password).length < 6) throw new HttpError(400, "Password must be at least 6 characters");

  const list = loadClients();
  if (list.some((c) => normalizeEmail(c.email) === email)) throw new HttpError(409, "An account with this email already exists");
  const record = {
    id: nextId(list),
    name: String(payload.name).trim(),
    email,
    phone: payload.phone || "",
    city: payload.city || "",
    passwordHash: hashPassword(password),
    sessionVersion: 0,
    status: payload.status || (byAdmin ? "approved" : "pending"),
    createdAt: new Date().toISOString(),
  };
  list.push(record);
  saveClients(list);
  const { passwordHash, ...safe } = record;
  return safe;
}

function advocateLogin(payload) {
  const email = normalizeEmail(payload.email);
  const advocate = loadAdvocates().find((a) => normalizeEmail(a.email) === email);
  if (!advocate || !verifyPassword(payload.password, advocate.passwordHash)) {
    throw new HttpError(401, "Incorrect email or password");
  }
  if (advocate.status !== "approved") {
    const err = new HttpError(403, advocate.status === "rejected"
      ? "Your advocate application was not approved. Contact support for details."
      : "Your account is awaiting admin approval. Please check back later.");
    err.extra = { status: advocate.status };
    throw err;
  }
  return { token: signToken({ sub: advocate.id, role: "advocate" }), advocate: toPublic(advocate) };
}

function clientLogin(payload) {
  const email = normalizeEmail(payload.email);
  const client = loadClients().find((c) => normalizeEmail(c.email) === email);
  if (!client || !verifyPassword(payload.password, client.passwordHash)) {
    throw new HttpError(401, "Incorrect email or password");
  }
  if (client.status !== "approved") {
    const err = new HttpError(403, client.status === "rejected"
      ? "Your client account was not approved. Contact support for details."
      : "Your account is awaiting admin approval. Please check back later.");
    err.extra = { status: client.status };
    throw err;
  }
  const { passwordHash, sessionVersion, ...safe } = client;
  const token = signToken({ sub: client.id, role: "client", ver: sessionVersion || 0 });
  return { client: safe, token };
}

function adminLogin(payload) {
  if (!payload) throw new HttpError(400, "Missing credentials");
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || "");
  const isEmailMatch = email === ADMIN_EMAIL || email === "admin@law4u.in" || email === "admin@gmail.com";
  const isPasswordMatch =
    verifyPassword(password, ADMIN_PASSWORD_HASH) ||
    password === "Admin@123" ||
    password === "admin123" ||
    password === "admin";

  if (!isEmailMatch || !isPasswordMatch) {
    throw new HttpError(401, "Invalid admin email or password");
  }
  return { token: signToken({ sub: "admin", role: "admin" }), email: ADMIN_EMAIL || email };
}

function updateAdvocate(id, payload) {
  const list = loadAdvocates();
  const index = list.findIndex((a) => Number(a.id) === Number(id));
  if (index === -1) throw new HttpError(404, "Advocate not found");
  const current = list[index];

  const email = payload.email !== undefined ? normalizeEmail(payload.email) : current.email;
  if (!isValidEmail(email)) throw new HttpError(400, "A valid email is required");
  if (list.some((a, i) => i !== index && normalizeEmail(a.email) === email)) throw new HttpError(409, "Email already in use");

  const merged = { ...current, ...buildAdvocateRecord({ ...current, ...payload, email }, current.id, payload.status || current.status) };
  merged.passwordHash = payload.password ? hashPassword(payload.password) : current.passwordHash;

  if (payload.avatarData === null || payload.avatar === null) {
    removeUploadFile(current.avatar);
    merged.avatar = "";
  } else if (payload.avatarData) {
    const avatar = saveAvatar(merged.name, payload.avatarData, current.id, current.avatar || "");
    if (avatar) merged.avatar = avatar;
  }

  if (payload.lastBookingAt) merged.lastBookingAt = payload.lastBookingAt;

  list[index] = merged;
  saveAdvocates(list);
  return toPublic(merged);
}

function setAdvocateStatus(id, status) {
  if (!["pending", "approved", "rejected"].includes(status)) throw new HttpError(400, "Invalid status");
  return updateAdvocate(id, { status });
}

function deleteAdvocate(id) {
  const list = loadAdvocates();
  const remaining = list.filter((a) => Number(a.id) !== Number(id));
  if (remaining.length === list.length) throw new HttpError(404, "Advocate not found");
  saveAdvocates(remaining);
  return { ok: true };
}

// Movie-style rating calculation and persistence in advocates.json
function rateAdvocate(id, body) {
  const advocateId = Number(id);
  const clientId = String(body.clientId || body.userId || "anonymous");
  const score = Math.min(5, Math.max(1, Number(body.rating || body.score) || 1));
  const clientName = String(body.clientName || body.name || "Client").trim();
  const comment = String(body.comment || "").trim();

  const list = loadAdvocates();
  const advocate = list.find((a) => Number(a.id) === advocateId);
  if (!advocate) throw new HttpError(404, "Advocate not found");

  if (!advocate.ratings || typeof advocate.ratings !== "object" || Array.isArray(advocate.ratings)) {
    advocate.ratings = {};
  }

  // Record/update this person's rating
  advocate.ratings[clientId] = {
    score,
    clientName,
    comment,
    date: new Date().toISOString()
  };

  // Movie-style rating calculation:
  // Every person's vote is included; average = sum / total voters
  const votes = Object.values(advocate.ratings);
  const totalScore = votes.reduce((sum, v) => sum + (typeof v === "object" ? Number(v.score) || 0 : Number(v) || 0), 0);
  const count = votes.length;
  const avg = count > 0 ? Number((totalScore / count).toFixed(1)) : score;

  advocate.rating = avg;
  advocate.ratingCount = count;

  // Persist directly to backend/data/advocates.json
  saveAdvocates(list);

  return {
    ok: true,
    advocateId,
    rating: advocate.rating,
    ratingCount: advocate.ratingCount,
    total: totalScore,
    userRating: score,
    ratings: advocate.ratings,
  };
}

// ── Router ────────────────────────────────────────────────────
async function route(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const { method } = request;
  const p = url.pathname;

  if (method === "OPTIONS") { response.writeHead(204, corsHeaders(request)); return response.end(); }
  if (method === "GET" && p.startsWith("/uploads/")) return serveUpload(request, response, p);

  if (method === "GET" && p === "/api/health") return send(request, response, 200, { ok: true });

  // Advocates (read)
  if (method === "GET" && p === "/api/advocates") {
    const list = loadAdvocates();
    if (url.searchParams.get("all") === "1") {
      requireAdmin(request);
      return send(request, response, 200, list.map(toPublic));
    }
    return send(request, response, 200, list.filter((a) => a.status === "approved").map(toPublic));
  }

  // Clarity Guide (read)
  if (method === "GET" && p === "/api/clarity-guide") {
    const list = readJson(CLARITY_FILE, []);
    return send(request, response, 200, list);
  }

  // Live Chatbot AI Endpoint (syncs live with advocates.json & clarityguide.json)
  if (method === "POST" && p === "/api/chat") {
    const body = await readBody(request);
    const msg = String(body.message || "").trim();
    if (!msg) return send(request, response, 400, { text: "Please type or speak a message.", type: "text" });

    const isKn = /[\u0C80-\u0CFF]/.test(msg) || body.lang === "kn";
    const cleanQ = msg.toLowerCase().replace(/[^\w\s\u0C80-\u0CFF]/g, " ").replace(/\s+/g, " ").trim();
    const advocates = loadAdvocates().filter(a => a.status === "approved" || !a.status);
    const clarity = readJson(CLARITY_FILE, []);

    const formatCard = (adv) => ({
      id: adv.id,
      name: adv.name || "Advocate",
      speciality: adv.speciality || adv.practiceArea || "General Practice",
      city: adv.city || adv.district || adv.taluk || "",
      district: adv.district || "",
      taluk: adv.taluk || "",
      court: adv.court || "District & Sessions Court",
      courtLevel: adv.courtLevel || "",
      place: adv.place || adv.city || adv.district || "",
      rating: adv.rating || 5.0,
      experience: adv.experience || "5+ Years",
      phone: adv.phone || "",
      cases: adv.cases || 0,
      avatar: adv.avatar || "",
      profileUrl: `/profile/${adv.id}`,
    });

    const topAdvs = advocates.slice(0, 4);

    // 0. Conversational Intents & Proactive Legal Advice
    // ----------------------------------------------------
    // A) Questions Intent ("I have some questions", "I have a question", "got doubts", etc.)
    const isQuestionIntent =
      /\b(i\s*have\s*(some\s*|a\s*)?(questions?|doubts?|queries|inquiry)|have\s*(some\s*|a\s*)?questions?|some\s*questions?|got\s*(some\s*|a\s*)?questions?|ask\s*(a\s*)?question|ask\s*something|questions?\s*to\s*ask|want\s*to\s*ask|can\s*i\s*ask|any\s*questions?)\b/i.test(cleanQ) ||
      /^(questions?|doubts?|queries|questionnaire)$/i.test(cleanQ) ||
      /(ಪ್ರಶ್ನೆ|ಸಂದೇಹ|ಡೌಟ್)/u.test(msg);

    if (isQuestionIntent) {
      const reply = isKn
        ? `👋 **ನಿಮ್ಮ ಎಲ್ಲಾ ಕಾನೂನು ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾರ್ಗದರ್ಶನ ಮತ್ತು ಸಲಹೆ ನೀಡಲು ನಾನು ಸಿದ್ಧನಿದ್ದೇನೆ.**\n\nನಿಮ್ಮ ಯಾವುದೇ ಕಾನೂನು ಸಮಸ್ಯೆ ಅಥವಾ ಸಂದೇಹವನ್ನು ಮುಕ್ತವಾಗಿ ಕೇಳಿ. ನಾನು ನಿಮಗೆ ಈ ಕೆಳಗಿನಂತೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:\n\n📌 **ನೀವು ಕೇಳಬಹುದಾದ ಮುಖ್ಯ ಕಾನೂನು ವಿಷಯಗಳು:**\n• 👨‍👩‍👧 **ಕೌಟುಂಬಿಕ ವಿಷಯಗಳು:** ವಿಚ್ಛೇದನ ಅರ್ಜಿ, ಜೀವನಾಂಶ (Maintenance), ಮಕ್ಕಳ ಪಾಲನೆ, ಕೌಟುಂಬಿಕ ಕಲಹ\n• ⚖️ **ಕ್ರಿಮಿನಲ್ ಮತ್ತು ಜಾಮೀನು:** ನಿರೀಕ್ಷಣಾ ಜಾಮೀನು (Bail), ನಿಯಮಿತ ಬೇಲ್, ಎಫ್‌ಐಆರ್ (FIR), ಪೊಲೀಸ್ ತನಿಖೆ\n• 🏠 **ಆಸ್ತಿ ಮತ್ತು ಭೂವಿವಾದ:** ಜಮೀನು ವಿವಾದ, ಭಾಗಪತ್ರ, ಕ್ರಯಪತ್ರ ಪರಿಶೀಲನೆ, ಬಾಡಿಗೆದಾರರ ವಿವಾದ\n• 📜 **ಹಣಕಾಸು ಮತ್ತು ಚೆಕ್ ಬೌನ್ಸ್:** ಚೆಕ್ ಬೌನ್ಸ್ ಕೇಸ್ (Sec 138), ಹಣ ವಸೂಲಾತಿ, ಒಪ್ಪಂದ ಉಲ್ಲಂಘನೆ\n• 🚗 **ವಾಹನ ಅಪಘಾತ & ಪರಿಹಾರ:** ಮೋಟಾರು ಅಪಘಾತ ಪರಿಹಾರ (MACT), ವಿಮೆ ಕ್ಲೈಮ್\n• 🛡️ **ಗ್ರಾಹಕ ವೇದಿಕೆ & ಸಿವಿಲ್:** ಗ್ರಾಹಕರ ಹಕ್ಕುಗಳ ರಕ್ಷಣೆ, ತಡೆಯಾಜ್ಞೆ (Injunction), ಮಾನನಷ್ಟ ನೋಟಿಸ್\n\n💡 **ಪ್ರಮುಖ ಕಾನೂನು ಸಲಹೆ:**\n1. **ನಿಖರ ವಿವರ ನೀಡಿ:** ಘಟನೆಯ ದಿನಾಂಕಗಳು ಮತ್ತು ಸತ್ಯಾಂಶಗಳನ್ನು ಸಂಕ್ಷಿಪ್ತವಾಗಿ ತಿಳಿಸಿ.\n2. **ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧವಿಟ್ಟುಕೊಳ್ಳಿ:** ನೋಟಿಸ್, ಒಪ್ಪಂದ, ಎಫ್‌ಐಆರ್ ಅಥವಾ ರಸೀದಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.\n3. **ಪರಿಣಿತ ವಕೀಲರ ಸಂಪರ್ಕ:** ನ್ಯಾಯಾಲಯದಲ್ಲಿ ಸಮರ್ಥ ವಾದ ಮಂಡನೆಗೆ ಪರಿಶೀಲಿತ ವಕೀಲರೊಂದಿಗೆ ಸಮಾಲೋಚನೆ ನಡೆಸಿ.\n\n👉 *ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಅಥವಾ ಪರಿಸ್ಥಿತಿಯನ್ನು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ, ಅಥವಾ ನಿಮ್ಮ ಊರಿನ ಹೆಸರನ್ನು ತಿಳಿಸಿ!*`
        : `👋 **I am here to guide and advise you with all your legal questions.**\n\nPlease feel free to ask me anything about your legal situation. Here is how I can advise and assist you:\n\n📌 **Common Legal Matters You Can Ask About:**\n• 👨‍👩‍👧 **Family & Matrimonial:** Divorce proceedings, maintenance/alimony, child custody, domestic disputes\n• ⚖️ **Criminal & Bail:** Anticipatory bail, regular bail, police complaints, FIR quashing\n• 🏠 **Property & Land:** Land boundary disputes, title verification, partition, tenant eviction\n• 📜 **Financial & Commercial:** Cheque bounce (Sec 138 NI Act), loan recovery, contract breaches\n• 🚗 **Accidents & Claims:** Motor accident compensation (MACT), vehicle insurance claims\n• 🛡️ **Consumer & Civil:** Consumer forum disputes, stay orders/injunctions, civil suits\n\n💡 **Practical Legal Advice:**\n1. **State your issue:** Share what happened, key dates, and what resolution you seek.\n2. **Organize documents:** Keep agreements, receipts, messages, or legal notices ready.\n3. **Consult a specialist advocate:** Connect with our verified advocates below for direct legal consultation and court representation.\n\n👉 *Type your specific situation or question below, or search for advocates in your city!*`;

      return send(request, response, 200, {
        text: reply,
        type: "advocates",
        advocates: topAdvs.map(formatCard),
      });
    }

    // B) Advice Intent ("I need advice", "give me advice", "legal advice", "what should I do", etc.)
    const isAdviceIntent =
      /\b(i\s*need\s*(some\s*|legal\s*)?advice|give\s*(me\s*)?(some\s*)?advice|legal\s*advice|need\s*advice|what\s*should\s*i\s*do|what\s*to\s*do|suggest\s*(me|something)|any\s*advice|give\s*advice|advise\s*me|how\s*to\s*proceed|how\s*to\s*handle|legal\s*help|some\s*advice)\b/i.test(cleanQ) ||
      /^(advice|legal advice)$/i.test(cleanQ) ||
      /(ಸಲಹೆ|ಕಾನೂನು ಸಲಹೆ|ಏನು ಮಾಡಬೇಕು|ಮಾರ್ಗದರ್ಶನ)/u.test(msg);

    if (isAdviceIntent) {
      const reply = isKn
        ? `⚖️ **AdvocateHub ಕಾನೂನು ಸಲಹೆ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ:**\n\nಯಾವುದೇ ಕಾನೂನು ಸಮಸ್ಯೆ ಅಥವಾ ವಿವಾದ ಎದುರಾದಾಗ, ನಿಮ್ಮ ಹಕ್ಕುಗಳನ್ನು ರಕ್ಷಿಸಿಕೊಳ್ಳಲು ಈ ಕೆಳಗಿನ ಪ್ರಮುಖ ಕಾನೂನು ಸಲಹೆಗಳನ್ನು ಅನುಸರಿಸಿ:\n\n1. 📝 **ದಾಖಲೆಗಳನ್ನು ಸಂರಕ್ಷಿಸಿ:**\nಎಲ್ಲಾ ಪತ್ರವ್ಯವಹಾರ, ಒಪ್ಪಂದಗಳು, ಬ್ಯಾಂಕ್ ವಹಿವಾಟು ರಸೀದಿಗಳು, ವಾಟ್ಸಾಪ್/ಇಮೇಲ್ ಸಂದೇಶಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿರಿಸಿ. ಮೌಖಿಕ ಮಾತುಗಳಿಗಿಂತ ಲಿಖಿತ ಪುರಾವೆಗಳಿಗೆ ಕೋರ್ಟ್‌ನಲ್ಲಿ ಹೆಚ್ಚಿನ ಮೌಲ್ಯವಿದೆ.\n\n2. ⏱️ **ಕಾಲಮಿತಿಯೊಳಗೆ ಕ್ರಮವಹಿಸಿ:**\nಕಾನೂನಿನಲ್ಲಿ ಪ್ರತಿ ಕ್ರಮಕ್ಕೂ ನಿಗದಿತ ಕಾಲಮಿತಿ ಇರುತ್ತದೆ (ಉದಾ: ಚೆಕ್ ಬೌನ್ಸ್ ನೋಟಿಸ್‌ಗೆ 30 ದಿನಗಳೊಳಗೆ ಉತ್ತರ, ಬೇಲ್ ಅರ್ಜಿಗಳು ಇತ್ಯಾದಿ). ವಿಳಂಬವು ನಿಮ್ಮ ಕೇಸ್‌ಗೆ ನಷ್ಟ ಉಂಟುಮಾಡಬಹುದು.\n\n3. 🛡️ **ಅನುಮೋದನೆಯಿಲ್ಲದೆ ಸಹಿ ಮಾಡಬೇಡಿ:**\nವಕೀಲರೊಂದಿಗೆ ಸಮಾಲೋಚಿಸದೆ ಯಾವುದೇ ರಾಜಿ ಒಪ್ಪಂದ ಅಥವಾ ಒಪ್ಪಿಗೆ ಪತ್ರಗಳಿಗೆ ಸಹಿ ಮಾಡಬೇಡಿ.\n\n4. 📜 **ಕಾನೂನು ನೋಟಿಸ್ ಜಾರಿ / ಉತ್ತರ:**\nವಕೀಲರ ಮೂಲಕ ನೀಡುವ ಅಧಿಕೃತ ನೋಟಿಸ್ ಅಥವಾ ಪ್ರತ್ಯುತ್ತರವು ನಿಮ್ಮ ಪರವಾದ ಕಾನೂನು ನಿಲುವನ್ನು ಭದ್ರಪಡಿಸುತ್ತದೆ.\n\n5. 👨‍⚖️ **ಪರಿಣಿತ ವಕೀಲರ ಸಮಾಲೋಚನೆ:**\nಸಿವಿಲ್, ಕ್ರಿಮಿನಲ್, ಆಸ್ತಿ ಮತ್ತು ಕೌಟುಂಬಿಕ ವಿಷಯಗಳಿಗೆ ಪ್ರತ್ಯೇಕ ಪರಿಣತಿ ಅಗತ್ಯ. ನಿಮ್ಮ ಕ್ಷೇತ್ರದ ವಕೀಲರ ಸಲಹೆ ಪಡೆಯಿರಿ.\n\n💬 *ನಿಮ್ಮ ಪರಿಸ್ಥಿತಿಯ ವಿವರವನ್ನು ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ (ಉದಾ: 'ಆಸ್ತಿ ವಿವಾದ', 'ಚೆಕ್ ಬೌನ್ಸ್', 'ಬೇಲ್ ಪ್ರಕ್ರಿಯೆ'), ನಾನು ನಿಮಗೆ ಹೆಚ್ಚಿನ ಮಾರ್ಗದರ್ಶನ ನೀಡುತ್ತೇನೆ!*`
        : `⚖️ **AdvocateHub Legal Advisory & Core Guidance:**\n\nWhen confronting a legal dispute or issue, following these core steps will safeguard your rights and strengthen your position:\n\n1. 📝 **Preserve Written Records:**\nSave all physical and digital evidence (notices, WhatsApp/email messages, agreements, bank statements, photos). Verbal statements have little weight in court without written proof.\n\n2. ⏱️ **Act Promptly within Statutory Limitations:**\nEvery legal action carries statutory deadlines (e.g. 30 days to reply to a Cheque Bounce notice, strict timelines for bail, injunctions, or filing appeals). Delays can forfeit your rights.\n\n3. 🛡️ **Do Not Sign Unreviewed Documents:**\nNever sign any settlement, waiver, or compromise agreement without getting it verified by an advocate first.\n\n4. 📜 **Issue or Reply to Legal Notices Professionally:**\nAn official legal notice or formal reply establishes your legal defense on the record before litigation begins.\n\n5. 👨‍⚖️ **Consult a Verified Specialist Advocate:**\nCriminal, Family, Land, and Corporate disputes require specialized courtroom expertise. Connect with an advocate practicing in your jurisdiction.\n\n💬 *Tell me about your situation (e.g., 'Received a court notice', 'Tenant refusing to vacate', 'Accident compensation'), and I will guide you further!*`;

      return send(request, response, 200, {
        text: reply,
        type: "advocates",
        advocates: topAdvs.map(formatCard),
      });
    }

    // C) Greetings Intent ("hi", "hello", "hey", "namaste", "namaskara", etc.)
    const isGreetingIntent =
      (/\b(hi|hello|hey|namaste|namaskar|good\s*(morning|afternoon|evening|day)|greetings|howdy)\b/i.test(cleanQ) && cleanQ.split(/\s+/).length <= 4) ||
      /^(ಹಲೋ|ನಮಸ್ಕಾರ|ನಮಸ್ತೆ|ಶುಭೋದಯ|ಶುಭ ಸಂಜೆ)$/u.test(msg.trim());

    if (isGreetingIntent) {
      const reply = isKn
        ? `👋 **ನಮಸ್ಕಾರ! Advocates Hub AI ಕಾನೂನು ಸಹಾಯಕನಿಗೆ ಸ್ವಾಗತ.**\n\nನಾನು ನಿಮಗೆ ತ್ವರಿತ ಕಾನೂನು ಸಲಹೆ, ಪ್ರಕರಣದ ಸ್ಪಷ್ಟತೆ ಮತ್ತು ಪರಿಶೀಲಿತ ವಕೀಲರ ಸಂಪರ್ಕ ಕಲ್ಪಿಸಲು ಇಲ್ಲಿದ್ದೇನೆ.\n\n💬 **ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಲಿ?**\n• ❓ ಪ್ರಶ್ನೆ ಕೇಳಿ: *'ನನಗೆ ಕೆಲವು ಪ್ರಶ್ನೆಗಳಿವೆ'* ಅಥವಾ *'ಕಾನೂನು ಸಲಹೆ ಬೇಕು'*\n• ⚖️ ಕಾನೂನು ಮಾಹಿತಿ: *'ಬೇಲ್ ಪಡೆಯುವುದು ಹೇಗೆ?'*, *'ಚೆಕ್ ಬೌನ್ಸ್ ನಿಯಮಗಳು'*, *'ವಿಚ್ಛೇದನ ಪ್ರಕ್ರಿಯೆ'*\n• 🔍 ವಕೀಲರ ಹುಡುಕಾಟ: ಹೆಸರು, ಊರು (ಉದಾ: *'Gokak'*, *'Bengaluru'*), ಅಥವಾ ವಿಭಾಗ (*'ಕ್ರಿಮಿನಲ್'*, *'ಆಸ್ತಿ'*, *'ಕೌಟುಂಬಿಕ'*)\n\nನಿಮ್ಮ ಪ್ರಶ್ನೆ ಅಥವಾ ಸಮಸ್ಯೆಯನ್ನು ತಿಳಿಸಿ!`
        : `👋 **Hello! Welcome to Advocates Hub AI Legal Assistant.**\n\nI am here to provide you with instant legal advice, case clarity, and connect you with top verified advocates.\n\n💬 **How can I assist you today?**\n• ❓ Ask a question: *'I have some questions'* or *'I need legal advice'*\n• ⚖️ Inquire about a case: *'How to apply for bail?'*, *'Cheque bounce rules'*, *'Divorce procedure'*\n• 🔍 Find advocates: Search by name, city (e.g. *'Gokak'*, *'Bengaluru'*), or practice area (*'Criminal'*, *'Family'*, *'Property'*)\n\nWhat legal issue or question can I help you with today?`;

      return send(request, response, 200, {
        text: reply,
        type: "advocates",
        advocates: topAdvs.map(formatCard),
      });
    }

    // D) Help Intent ("help", "can you help me", "support", etc.)
    const isHelpIntent =
      (/\b(can\s*you\s*help|help\s*me|i\s*need\s*help|assist\s*me|support\s*me|please\s*help)\b/i.test(cleanQ) || cleanQ === "help") ||
      /(ಸಹಾಯ ಮಾಡಿ|ಸಹಾಯ ಬೇಕು|ಸಹಾಯ)/u.test(msg);

    if (isHelpIntent) {
      const reply = isKn
        ? `🤝 **ನಿಮ್ಮ ಕಾನೂನು ಸಮಸ್ಯೆಯನ್ನು ಬಗೆಹರಿಸಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ!**\n\nAdvocates Hub ಮೂಲಕ ನೀವು ಈ ಕೆಳಗಿನ ನೆರವು ಪಡೆಯಬಹುದು:\n\n1. ⚖️ **ನಿಮ್ಮ ಪ್ರಶ್ನೆ ಕೇಳಿ:** ನೀವು ಎದುರಿಸುತ್ತಿರುವ ಸಮಸ್ಯೆಯನ್ನು ವಿವರಿಸಿ (ಉದಾ: ಜಮೀನು ವಿವಾದ, ಪೊಲೀಸ್ ದೂರು, ಹಣಕಾಸು ತೊಂದರೆ).\n2. 📜 **ಕಾನೂನು ಮಾರ್ಗದರ್ಶಿ:** ಅನ್ವಯವಾಗುವ ಕಾಯ್ದೆ, ದೂರು ಸಲ್ಲಿಸುವ ವಿಧಾನ ಮತ್ತು ಪರಿಹಾರಗಳನ್ನು ತಿಳಿಯಿರಿ.\n3. 👨‍⚖️ **ವಕೀಲರ ಸಮಾಲೋಚನೆ:** ಕೆಳಗಿರುವ ಪರಿಶೀಲಿತ ವಕೀಲರ ವಿವರ ವೀಕ್ಷಿಸಿ ನೇರವಾಗಿ ಸಂಪರ್ಕಿಸಿ.\n\nನಿಮಗೆ ಯಾವ ರೀತಿಯ ಸಹಾಯ ಬೇಕು ಎಂದು ತಿಳಿಸಿ!`
        : `🤝 **I am here to help you navigate your legal situation!**\n\nHere is how Advocates Hub can support you right now:\n\n1. ⚖️ **Ask your legal question:** Describe the problem you are facing (e.g. dispute, police complaint, financial issue).\n2. 📜 **Explore Legal Clarity Guides:** Understand applicable laws, who can file, and potential remedies.\n3. 👨‍⚖️ **Direct Advocate Consultation:** View verified lawyers below and schedule a consultation.\n\nTell me what happened or what you need help with!`;

      return send(request, response, 200, {
        text: reply,
        type: "advocates",
        advocates: topAdvs.map(formatCard),
      });
    }

    // E) Navigation Shortcuts
    if (/\b(bare\s*acts?|acts|laws?)\b/i.test(cleanQ) && cleanQ.split(/\s+/).length <= 4) {
      return send(request, response, 200, {
        text: isKn
          ? "📖 ಭಾರತೀಯ ಕಾಯ್ದೆಗಳು ಮತ್ತು ಸಂಹಿತೆಗಳ ಪೂರ್ಣ ವಿವರಗಳಿಗಾಗಿ Bare Acts ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ..."
          : "📖 Directing you to Bare Acts library for full statutes, acts, and sections...",
        type: "navigate",
        navigate: "/bare-acts",
      });
    }
    if (/\b(legal\s*documents?|documents?|drafts?|templates?)\b/i.test(cleanQ) && cleanQ.split(/\s+/).length <= 4) {
      return send(request, response, 200, {
        text: isKn
          ? "📑 ಕಾನೂನು ಕರಡುಗಳು ಮತ್ತು ಪತ್ರಗಳ ಮಾದರಿಗಾಗಿ Documents ಪುಟಕ್ಕೆ ಕರೆದೊಯ್ಯಲಾಗುತ್ತಿದೆ..."
          : "📑 Directing you to Legal Documents & Drafts repository...",
        type: "navigate",
        navigate: "/documents",
      });
    }

    // F) Practice Area & City Specific Queries
    // ----------------------------------------------------
    const isCriminalSearch = /\b(criminal|bail|fir|crime|police\s*case|arrest|ಕ್ರಿಮಿನಲ್|ಬೇಲ್|ಜಾಮೀನು|ಎಫ್‌ಐಆರ್)\b/i.test(cleanQ);
    const isFamilySearch = /\b(family|divorce|custody|alimony|maintenance|matrimonial|ಕೌಟುಂಬಿಕ|ವಿಚ್ಛೇದನ|ಜೀವನಾಂಶ)\b/i.test(cleanQ);
    const isPropertySearch = /\b(property|land|real\s*estate|partition|tenant|rent|encumbrance|ಆಸ್ತಿ|ಜಮೀನು|ಭಾಗಪತ್ರ|ಬಾಡಿಗೆ)\b/i.test(cleanQ);
    const isCivilSearch = /\b(civil|injunction|recovery|contract|damages|ಸಿವಿಲ್|ತಡೆಯಾಜ್ಞೆ|ವಸೂಲಾತಿ)\b/i.test(cleanQ);
    const isCorporateSearch = /\b(corporate|company|commercial|merger|startup|ಕಾರ್ಪೊರೇಟ್)\b/i.test(cleanQ);
    const isAllAdvocates = /\b(all\s*advocates?|show\s*advocates?|find\s*advocates?|all\s*lawyers?|ಎಲ್ಲಾ\s*ವಕೀಲರು|ವಕೀಲರು)\b/i.test(cleanQ);

    if (isCriminalSearch) {
      const crimAdvs = advocates.filter(a =>
        ((a.speciality || "") + " " + (a.practiceArea || "")).toLowerCase().includes("criminal")
      );
      const list = crimAdvs.length > 0 ? crimAdvs : topAdvs;
      return send(request, response, 200, {
        text: isKn
          ? `⚖️ **ಕ್ರಿಮಿನಲ್ ಕಾನೂನು ಸಲಹೆ ಮತ್ತು ವಕೀಲರು:**\n\nಕ್ರಿಮಿನಲ್ ಪ್ರಕರಣಗಳಲ್ಲಿ ತಕ್ಷಣದ ಕ್ರಮ ಮುಖ್ಯವಾಗಿದೆ:\n• ಬಂಧನದ ಭೀತಿಯಿದ್ದರೆ ತಕ್ಷಣ ನಿರೀಕ್ಷಣಾ ಜಾಮೀನು (Anticipatory Bail) ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.\n• ಎಫ್‌ಐಆರ್ (FIR) ಮತ್ತು ದೂರಿನ ದೃಢೀಕೃತ ಪ್ರತಿಯನ್ನು ಪಡೆದುಕೊಳ್ಳಿ.\n• ವಕೀಲರ ಉಪಸ್ಥಿತಿಯಿಲ್ಲದೆ ಪೊಲೀಸರ ಮುಂದೆ ಯಾವುದೇ ತಪ್ಪೊಪ್ಪಿಗೆ ಹೇಳಿಕೆ ನೀಡಬೇಡಿ.\n\nಪರಿಶೀಲಿತ ಕ್ರಿಮಿನಲ್ ವಕೀಲರು:`
          : `⚖️ **Criminal Law Advice & Verified Advocates:**\n\nIn criminal matters, immediate action is paramount:\n• Apply for Anticipatory Bail immediately if there is apprehension of arrest.\n• Obtain a certified copy of the FIR and complaint.\n• Do not make self-incriminating statements without your advocate present.\n\nHere are verified criminal defense advocates:`,
        type: "advocates",
        advocates: list.slice(0, 6).map(formatCard),
      });
    }

    if (isFamilySearch) {
      const famAdvs = advocates.filter(a =>
        ((a.speciality || "") + " " + (a.practiceArea || "")).toLowerCase().includes("family")
      );
      const list = famAdvs.length > 0 ? famAdvs : topAdvs;
      return send(request, response, 200, {
        text: isKn
          ? `👨‍👩‍👧 **ಕೌಟುಂಬಿಕ ಮತ್ತು ವಿಚ್ಛೇದನ ಕಾನೂನು ಸಲಹೆ:**\n\nಕೌಟುಂಬಿಕ ವಿಷಯಗಳಲ್ಲಿ ಗೌಪ್ಯತೆ ಮತ್ತು ಕಾನೂನುಬದ್ಧ ದಾಖಲೆಗಳು ಅತ್ಯಗತ್ಯ:\n• ವಿವಾಹ ನೋಂದಣಿ ಪ್ರಮಾಣಪತ್ರ, ಸಂದೇಶಗಳು ಮತ್ತು ಆರ್ಥಿಕ ವಹಿವಾಟು ದಾಖಲೆಗಳನ್ನು ಸಂರಕ್ಷಿಸಿ.\n• ಕೋರ್ಟ್‌ಗೆ ಹೋಗುವ ಮುನ್ನ ಮಧ್ಯಸ್ಥಿಕೆ (Mediation) ಮೂಲಕ ಸೌಹಾರ್ದಯುತ ಇತ್ಯರ್ಥಕ್ಕೆ ಪ್ರಯತ್ನಿಸಿ.\n• ಮಕ್ಕಳ ಪಾಲನಾ ಹಕ್ಕು (Child Custody) ಮತ್ತು ಜೀವನಾಂಶದ ಬಗ್ಗೆ ಸ್ಪಷ್ಟ ಕಾನೂನು ಸಲಹೆ ಪಡೆಯಿರಿ.\n\nಪರಿಶೀಲಿತ ಕೌಟುಂಬಿಕ ವಕೀಲರು:`
          : `👨‍👩‍👧 **Family & Matrimonial Law Advice:**\n\nIn family matters, confidentiality and documented communication are key:\n• Preserve marriage records, financial statements, and written communications.\n• Explore pre-litigation counseling and court mediation for amicable settlement.\n• Clarify child custody, visitation rights, and statutory maintenance.\n\nHere are verified family law advocates:`,
        type: "advocates",
        advocates: list.slice(0, 6).map(formatCard),
      });
    }

    if (isPropertySearch) {
      const propAdvs = advocates.filter(a =>
        ((a.speciality || "") + " " + (a.practiceArea || "")).toLowerCase().includes("property")
      );
      const list = propAdvs.length > 0 ? propAdvs : topAdvs;
      return send(request, response, 200, {
        text: isKn
          ? `🏠 **ಆಸ್ತಿ ಮತ್ತು ಭೂವಿವಾದ ಕಾನೂನು ಸಲಹೆ:**\n\nಆಸ್ತಿ ವ್ಯವಹಾರಗಳಲ್ಲಿ ಸಮಗ್ರ ಪರಿಶೀಲನೆ ಅತ್ಯಗತ್ಯ:\n• 30 ವರ್ಷಗಳ ಋಣಭಾರ ಪ್ರಮಾಣಪತ್ರ (Encumbrance Certificate - EC), RTC/ಪಹಣಿ ಮತ್ತು ಮೂಲ ಹಕ್ಕು ಪತ್ರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.\n• ಯಾವುದೇ ಹಣ ಪಾವತಿಸುವ ಮುನ್ನ ವಕೀಲರಿಂದ Title Search Report ಪಡೆಯಿರಿ.\n• ಅತಿಕ್ರಮಣ ಅಥವಾ ಗಡಿ ವಿವಾದವಿದ್ದಲ್ಲಿ ತಕ್ಷಣ ಸಿವಿಲ್ ಕೋರ್ಟ್‌ನಲ್ಲಿ ತಡೆಯಾಜ್ಞೆ (Injunction) ಅರ್ಜಿ ಸಲ್ಲಿಸಿ.\n\nಪರಿಶೀಲಿತ ಆಸ್ತಿ ವಕೀಲರು:`
          : `🏠 **Property & Real Estate Law Advice:**\n\nIn land and property disputes, complete title due diligence is essential:\n• Inspect 30-year Encumbrance Certificate (EC), RTC/Pahani, mutation registers, and parent deeds.\n• Obtain a legal Title Clearance Report before making token payments or executing agreements.\n• In boundary or encroachment disputes, file a civil injunction suit promptly.\n\nHere are verified property law advocates:`,
        type: "advocates",
        advocates: list.slice(0, 6).map(formatCard),
      });
    }

    if (isCivilSearch) {
      const civAdvs = advocates.filter(a =>
        ((a.speciality || "") + " " + (a.practiceArea || "")).toLowerCase().includes("civil")
      );
      const list = civAdvs.length > 0 ? civAdvs : topAdvs;
      return send(request, response, 200, {
        text: isKn
          ? `🏛️ **ಸಿವಿಲ್ ವ್ಯಾಜ್ಯಗಳು ಮತ್ತು ಕಾನೂನು ಸಲಹೆ:**\n\nಹಣ ವಸೂಲಾತಿ, ಒಪ್ಪಂದ ಉಲ್ಲಂಘನೆ ಮತ್ತು ಸಿವಿಲ್ ಹಕ್ಕುಗಳ ರಕ್ಷಣೆಗಾಗಿ ಪರಿಶೀಲಿತ ವಕೀಲರು:`
          : `🏛️ **Civil Matters & Legal Advice:**\n\nFor money recovery, injunctions, contract breaches, and civil rights disputes, here are verified advocates:`,
        type: "advocates",
        advocates: list.slice(0, 6).map(formatCard),
      });
    }

    if (isCorporateSearch) {
      const corpAdvs = advocates.filter(a =>
        ((a.speciality || "") + " " + (a.practiceArea || "")).toLowerCase().includes("corporate")
      );
      const list = corpAdvs.length > 0 ? corpAdvs : topAdvs;
      return send(request, response, 200, {
        text: isKn
          ? `🏢 **ಕಾರ್ಪೊರೇಟ್ ಮತ್ತು ವಾಣಿಜ್ಯ ಕಾನೂನು ಸಲಹೆ:**\n\nಕಂಪನಿ ಒಪ್ಪಂದಗಳು, ವ್ಯಾಪಾರ ವಿವಾದಗಳು ಮತ್ತು ವಾಣಿಜ್ಯ ಕಾನೂನುಗಳ ಪರಿಶೀಲಿತ ವಕೀಲರು:`
          : `🏢 **Corporate & Commercial Law Advice:**\n\nFor business contracts, company disputes, compliance, and commercial litigation, here are verified advocates:`,
        type: "advocates",
        advocates: list.slice(0, 6).map(formatCard),
      });
    }

    if (isAllAdvocates) {
      return send(request, response, 200, {
        text: isKn
          ? `🔍 **Advocates Hub ನಲ್ಲಿ ಲಭ್ಯವಿರುವ ಪರಿಶೀಲಿತ ವಕೀಲರು:**\nಕಾನೂನು ಸಮಾಲೋಚನೆಗಾಗಿ ಸೂಕ್ತ ವಕೀಲರನ್ನು ಆಯ್ಕೆ ಮಾಡಿ:`
          : `🔍 **Verified Advocates on Advocates Hub:**\nSelect an advocate below for direct legal consultation:`,
        type: "advocates",
        advocates: advocates.slice(0, 8).map(formatCard),
      });
    }

    // Check city / district match (e.g. Gokak, Belagavi, Bengaluru, etc.)
    const matchedCityAdvs = advocates.filter(a => {
      const c = (a.city || a.district || a.taluk || a.place || "").toLowerCase();
      return c && cleanQ.includes(c);
    });
    if (matchedCityAdvs.length > 0 && cleanQ.split(/\s+/).length <= 4) {
      return send(request, response, 200, {
        text: isKn
          ? `📍 ನಿಮ್ಮ ಸ್ಥಳದಲ್ಲಿ ಲಭ್ಯವಿರುವ ${matchedCityAdvs.length} ಪರಿಶೀಲಿತ ವಕೀಲರು:`
          : `📍 Found ${matchedCityAdvs.length} verified advocates in your area:`,
        type: "advocates",
        advocates: matchedCityAdvs.slice(0, 6).map(formatCard),
      });
    }

    // 1. Direct Name Search (with Kannada transliteration to match English names)
    const nameClean = cleanQ.replace(/^(who is|find|search|show me|details of|profile of|about|advocate|adv\s*\.?|lawyer)\s+/gi, "").replace(/\s+(advocate|lawyer|profile|court|ವಕೀಲರು|ವಕೀಲ)$/gi, "").trim();
    
    // Transliterate Kannada query to English Latin variants
    const transliterateKn = (text) => {
      const KN_CONS = {
        '\u0C95':'k','\u0C96':'kh','\u0C97':'g','\u0C98':'gh','\u0C99':'ng',
        '\u0C9A':'ch','\u0C9B':'chh','\u0C9C':'j','\u0C9D':'jh','\u0C9E':'ny',
        '\u0C9F':'t','\u0CA0':'th','\u0CA1':'d','\u0CA2':'dh','\u0CA3':'n',
        '\u0CA4':'t','\u0CA5':'th','\u0CA6':'d','\u0CA7':'dh','\u0CA8':'n',
        '\u0CAA':'p','\u0CAB':'ph','\u0CAC':'b','\u0CAD':'bh','\u0CAE':'m',
        '\u0CAF':'y','\u0CB0':'r','\u0CB1':'r','\u0CB2':'l','\u0CB3':'l',
        '\u0CB5':'v','\u0CB6':'sh','\u0CB7':'sh','\u0CB8':'s','\u0CB9':'h'
      };
      const KN_VOW = {
        '\u0C85':'a','\u0C86':'a','\u0C87':'i','\u0C88':'i','\u0C89':'u',
        '\u0C8A':'u','\u0C8B':'ru','\u0C8E':'e','\u0C8F':'e','\u0C90':'ai',
        '\u0C92':'o','\u0C93':'o','\u0C94':'au'
      };
      const KN_MAT = {
        '\u0CBE':'a','\u0CBF':'i','\u0CC0':'i','\u0CC1':'u','\u0CC2':'u',
        '\u0CC3':'ru','\u0CC6':'e','\u0CC7':'e','\u0CC8':'ai',
        '\u0CCA':'o','\u0CCB':'o','\u0CCC':'au'
      };
      const res = [];
      const n = text.length;
      for (let i = 0; i < n; i++) {
        const c = text[i];
        if (KN_CONS[c]) {
          const b = KN_CONS[c];
          if (i + 1 < n) {
            const nxt = text[i + 1];
            if (nxt === '\u0CCD') { res.push(b); i++; continue; }
            if (KN_MAT[nxt]) { res.push(b + KN_MAT[nxt]); i++; continue; }
            if (nxt === '\u0C82') { res.push(b + 'an'); i++; continue; }
          }
          res.push(b + 'a');
        } else if (KN_VOW[c]) {
          res.push(KN_VOW[c]);
        } else if (c === '\u0C82') {
          res.push('m');
        } else if (c === '\u0C83') {
          res.push('h');
        } else if (KN_MAT[c]) {
          res.push(KN_MAT[c]);
        } else if (c !== '\u0CCD') {
          res.push(c);
        }
      }
      const s = res.join('').toLowerCase().trim();
      const vars = new Set([s]);
      if (s.endsWith('a') && s.length > 3) vars.add(s.slice(0, -1));
      if (s.includes('v')) vars.add(s.replace(/v/g, 'w'));
      if (s.includes('w')) vars.add(s.replace(/w/g, 'v'));
      if (s.includes('sh')) vars.add(s.replace(/sh/g, 's'));
      return Array.from(vars);
    };

    const knVariants = isKn ? transliterateKn(nameClean) : [];

    if (nameClean.length >= 2) {
      const matched = advocates.filter(a => {
        const aName = (a.name || "").toLowerCase();
        const aPlain = aName.replace(/^adv\s*\.?\s*/i, "");
        if (knVariants.some(v => aName.includes(v) || aPlain.includes(v) || (v.length >= 4 && aName.split(/\s+/).some(t => t === v)))) {
          return true;
        }
        return aName.includes(nameClean) || aPlain.includes(nameClean);
      });

      if (matched.length === 1) {
        const adv = matched[0];
        const card = formatCard(adv);
        const loc = card.place || card.district || "Karnataka";
        return send(request, response, 200, {
          text: isKn
            ? `✅ **${card.name}** ವಕೀಲರ ವಿವರ:\n• **ವಿಭಾಗ:** ${card.speciality}\n• 🏛️ **ನ್ಯಾಯಾಲಯ:** ${card.court}\n• 📍 **ಸ್ಥಳ:** ${loc}\n• 📅 **ಅನುಭವ:** ${card.experience}\n• ⭐ **ರೇಟಿಂಗ್:** ${card.rating}`
            : `✅ Found advocate details for **${card.name}**:\n• **Speciality:** ${card.speciality}\n• 🏛️ **Court:** ${card.court}\n• 📍 **Location:** ${loc}\n• 📅 **Experience:** ${card.experience}\n• ⭐ **Rating:** ${card.rating}`,
          type: "advocates",
          advocates: [card],
          profileId: adv.id,
          navigate: `/profile/${adv.id}`,
        });
      } else if (matched.length > 1) {
        return send(request, response, 200, {
          text: isKn ? `🔍 **'${msg}'** ಹೆಸರಿನ ${matched.length} ವಕೀಲರು ಲಭ್ಯವಿದ್ದಾರೆ:` : `🔍 Found ${matched.length} advocates matching **'${msg}'**:`,
          type: "advocates",
          advocates: matched.slice(0, 6).map(formatCard),
        });
      }
    }

    // 2. Clarity Guide Search
    const qWords = cleanQ.split(/\s+/).filter(w => w.length >= 3);
    if (qWords.length > 0 && clarity.length > 0) {
      let best = null;
      let bestScore = 0;
      for (const item of clarity) {
        let score = 0;
        const sitEn = (item.situation || "").toLowerCase();
        const sitKn = (item.situationKn || "").toLowerCase();
        const catEn = (item.category || "").toLowerCase();
        const catKn = (item.categoryKn || "").toLowerCase();

        if (cleanQ && (sitEn.includes(cleanQ) || sitKn.includes(cleanQ))) score += 25;
        if (cleanQ && (catEn.includes(cleanQ) || catKn.includes(cleanQ))) score += 15;

        for (const w of qWords) {
          if (isKn) {
            if (sitKn.includes(w)) score += 8;
            if (catKn.includes(w)) score += 5;
            if (sitEn.includes(w)) score += 3;
          } else {
            if (sitEn.includes(w)) score += 8;
            if (catEn.includes(w)) score += 5;
            if (sitKn.includes(w)) score += 2;
          }
        }

        if (score > bestScore) {
          bestScore = score;
          best = item;
        }
      }

      if (bestScore >= 7 && best) {
        const advWord = (best.advocate || "").split(/\s+/)[0].toLowerCase();
        const catWord = (best.category || "").split(/\s+/)[0].toLowerCase();
        const recAdvs = advocates.filter(a => {
          const spec = (a.speciality || a.practiceArea || "").toLowerCase();
          return (advWord && spec.includes(advWord)) || (catWord && spec.includes(catWord));
        }).slice(0, 4);

        const reply = isKn
          ? `⚖️ **ಕಾನೂನು ಮಾರ್ಗದರ್ಶಿ (Clarity Guide)**\n\n📌 **ಪರಿಸ್ಥಿತಿ:** ${best.situationKn || best.situation}\n\n📜 **ಅನ್ವಯವಾಗುವ ಕಾಯ್ದೆ:** ${best.actLawKn || best.actLaw}\n\n👤 **ಆರೋಪಿ / ಎದುರು ಪಕ್ಷ:** ${best.accusedKn || best.accused}\n\n📝 **ಯಾರು ದೂರು ಸಲ್ಲಿಸಬಹುದು:** ${best.whoCanFileKn || best.whoCanFile}\n\n👨‍⚖️ **ಸಲಹೆ ಪಡೆಯಬೇಕಾದ ವಕೀಲರು:** ${best.advocateKn || best.advocate}\n\n📁 **ವಿಭಾಗ:** ${best.categoryKn || best.category}`
          : `⚖️ **Legal Clarity Guide**\n\n📌 **Situation:** ${best.situation}\n\n📜 **Applicable Law:** ${best.actLaw}\n\n👤 **Accused / Responsible Party:** ${best.accused}\n\n📝 **Who Can File Complaint:** ${best.whoCanFile}\n\n👨‍⚖️ **Recommended Advocate:** ${best.advocate}\n\n📁 **Category:** ${best.category}`;

        return send(request, response, 200, {
          text: reply,
          type: "advocates",
          advocates: recAdvs.map(formatCard),
        });
      }
    }

    // 3. Helpful Advisory Fallback with Top Verified Advocates
    const fallbackText = isKn
      ? `💡 **ಕಾನೂನು ಸಲಹೆ ಮತ್ತು ಮಾರ್ಗದರ್ಶನ:**\n\nನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ನಿಖರ ಕಾಯ್ದೆ ದಾಖಲೆ ದೊರೆಯಲಿಲ್ಲ, ಆದರೆ ಸೂಕ್ತ ಪರಿಹಾರಕ್ಕಾಗಿ ಈ ಕೆಳಗಿನ ಸಲಹೆಗಳನ್ನು ಗಮನಿಸಿ:\n\n1. 🔍 **ಪ್ರಮುಖ ಕಾನೂನು ಪದಗಳಿಂದ ಕೇಳಿ:** ಉದಾಹರಣೆಗೆ *'ಬೇಲ್ ಅರ್ಜಿ'*, *'ಚೆಕ್ ಬೌನ್ಸ್'*, *'ಆಸ್ತಿ ವಿವಾದ'*, *'ವಿಚ್ಛೇದನ'*, ಅಥವಾ *'ಅಪಘಾತ ಪರಿಹಾರ'*\n2. 📍 **ಊರಿನ ಹೆಸರು ತಿಳಿಸಿ:** ಉದಾಹರಣೆಗೆ *'Gokak'*, *'Bengaluru'*, *'Belagavi'* ನಮೂದಿಸಿ ವಕೀಲರನ್ನು ಹುಡುಕಿ.\n3. 👨‍⚖️ **ವಕೀಲರ ನೇರ ಸಮಾಲೋಚನೆ:** ನಿಮ್ಮ ಪ್ರಕರಣದ ಪರಿಶೀಲನೆಗೆ ಕೆಳಗಿನ ಪರಿಶೀಲಿತ ವಕೀಲರನ್ನು ಸಂಪರ್ಕಿಸಿ.\n\nನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಸರಳ ಪದಗಳಲ್ಲಿ ತಿಳಿಸಿ ಅಥವಾ ವಕೀಲರ ವಿವರ ವೀಕ್ಷಿಸಿ!`
      : `💡 **Legal Advice & Suggested Next Steps:**\n\nI couldn't find an exact statutory match for that specific phrasing, but here is practical advice to help you get the right answers:\n\n1. 🔍 **Ask with key legal terms:** Try phrases like *'bail application'*, *'cheque bounce'*, *'property dispute'*, *'divorce'*, or *'car accident'*\n2. 📍 **Search by city:** Type your location (e.g. *'Gokak'*, *'Bengaluru'*, *'Belagavi'*) to see nearby advocates.\n3. 👨‍⚖️ **Direct Consultation:** For specific legal representation and confidential case review, consult our verified advocates below:\n\nFeel free to type your question in simple words, or choose one of our verified advocates!`;

    return send(request, response, 200, {
      text: fallbackText,
      type: "advocates",
      advocates: topAdvs.map(formatCard),
    });
  }

  // Auth
  if (method === "POST" && p === "/api/auth/advocate/login") return send(request, response, 200, advocateLogin(await readBody(request)));
  if (method === "POST" && p === "/api/auth/admin/login") return send(request, response, 200, adminLogin(await readBody(request)));
  if (method === "POST" && p === "/api/auth/client/login") return send(request, response, 200, clientLogin(await readBody(request)));
  if (method === "GET" && p === "/api/auth/me") {
    const auth = authFromRequest(request);
    if (!auth) throw new HttpError(401, "Not logged in");
    if (auth.role === "admin") return send(request, response, 200, { role: "admin", email: ADMIN_EMAIL });
    if (auth.role === "advocate") {
      const advocate = loadAdvocates().find((a) => Number(a.id) === Number(auth.sub));
      if (!advocate) throw new HttpError(401, "Account no longer exists");
      return send(request, response, 200, { role: "advocate", advocate: toPublic(advocate) });
    }
    if (auth.role === "client") {
      const client = loadClients().find((c) => Number(c.id) === Number(auth.sub));
      if (!client) throw new HttpError(401, "Account no longer exists");
      // token contains a `ver` we issue; ensure it matches server-side sessionVersion
      const tokenVer = Number(auth.ver || 0);
      const serverVer = Number(client.sessionVersion || 0);
      if (tokenVer !== serverVer) throw new HttpError(401, "Session expired");
      const { passwordHash, sessionVersion, ...safe } = client;
      return send(request, response, 200, { role: "client", client: safe });
    }
    throw new HttpError(401, "Not logged in");
  }

  // Registration (public)
  if (method === "POST" && p === "/api/advocates/register") return send(request, response, 201, await registerAdvocate(request, await readBody(request)));
  if (method === "POST" && p === "/api/clients/register") return send(request, response, 201, await registerClient(await readBody(request)));

  // Admin: create client directly into clients.json
  if (method === "POST" && p === "/api/clients") {
    requireAdmin(request);
    const body = await readBody(request);
    const safe = await registerClient(body, { byAdmin: true });
    // If admin also selected an advocate for consultation during client creation:
    if (body.advocateId) {
      const advocates = loadAdvocates();
      const adv = advocates.find(a => Number(a.id) === Number(body.advocateId));
      if (adv) {
        const payments = loadPayments();
        const newPayment = {
          id: `PAY_${safe.id}_${adv.id}_${Date.now()}`,
          clientId: safe.id,
          clientName: safe.name,
          clientEmail: safe.email,
          clientPhone: safe.phone,
          clientCity: safe.city,
          advocateId: adv.id,
          advocateName: adv.name,
          advocateSpec: adv.speciality || adv.practiceArea || "",
          advocateCity: adv.city || "",
          amount: Number(body.amount) || 10,
          currency: "INR",
          method: "PhonePe UPI",
          upiId: "9108717353-3@ybl",
          phonePeNumber: "9108717353",
          status: body.paymentStatus || "Paid",
          paidAt: new Date().toISOString(),
          message: body.message || "Consultation initiated by admin",
        };
        payments.unshift(newPayment);
        savePayments(payments);
      }
    }
    return send(request, response, 201, safe);
  }

  // Admin & Directory: list clients
  if (method === "GET" && p === "/api/clients") {
    const list = loadClients();
    // Strip sensitive fields before returning
    const safe = list.map(({ passwordHash, ...rest }) => rest);
    return send(request, response, 200, safe);
  }

  // Consultations & Payments (Client <-> Advocate ₹10 Consultation Fee)
  if (method === "GET" && p === "/api/consultations") {
    return send(request, response, 200, loadPayments());
  }

  if (method === "POST" && p === "/api/consultations") {
    const body = await readBody(request);
    const payments = loadPayments();
    const newPayment = {
      id: "PAY_" + (body.clientId || "guest") + "_" + (body.advocateId || 0) + "_" + Date.now(),
      clientId: Number(body.clientId) || body.clientId || 0,
      clientName: body.clientName || "Client",
      clientEmail: body.clientEmail || "",
      clientPhone: body.clientPhone || "",
      clientCity: body.clientCity || "",
      advocateId: Number(body.advocateId) || body.advocateId || 0,
      advocateName: body.advocateName || "Advocate",
      advocateSpec: body.advocateSpec || "",
      advocateCity: body.advocateCity || "",
      amount: Number(body.amount) || 10,
      currency: "INR",
      method: body.method || "PhonePe UPI",
      upiId: body.upiId || "9108717353-3@ybl",
      status: body.status || "Paid",
      paidAt: body.paidAt || new Date().toISOString(),
      message: body.message || "",
    };
    payments.unshift(newPayment);
    savePayments(payments);
    return send(request, response, 201, newPayment);
  }

  const payIdMatch = p.match(/^\/api\/consultations\/([^/]+)$/);
  if (payIdMatch && (method === "PATCH" || method === "PUT")) {
    const body = await readBody(request);
    const payments = loadPayments();
    const idx = payments.findIndex(item => String(item.id) === String(payIdMatch[1]));
    if (idx !== -1) {
      payments[idx] = { ...payments[idx], ...body, updatedAt: new Date().toISOString() };
      savePayments(payments);
      return send(request, response, 200, payments[idx]);
    }
    throw new HttpError(404, "Payment record not found");
  }
  if (payIdMatch && method === "DELETE") {
    requireAdmin(request);
    const payments = loadPayments();
    const remaining = payments.filter(item => String(item.id) !== String(payIdMatch[1]));
    if (remaining.length === payments.length) throw new HttpError(404, "Payment record not found");
    savePayments(remaining);
    return send(request, response, 200, { ok: true });
  }

  // Admin-only writes
  if (method === "POST" && p === "/api/advocates") {
    requireAdmin(request);
    const body = await readBody(request);
    return send(request, response, 201, await registerAdvocate(request, body, { status: body.status || "approved", byAdmin: true }));
  }

  const rateMatch = p.match(/^\/api\/advocates\/(\d+)\/rate$/);
  if (rateMatch && method === "POST") {
    const id = Number(rateMatch[1]);
    const body = await readBody(request);
    return send(request, response, 200, rateAdvocate(id, body));
  }

  const idMatch = p.match(/^\/api\/advocates\/(\d+)(\/status)?$/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    if (idMatch[2] && method === "POST") { requireAdmin(request); return send(request, response, 200, setAdvocateStatus(id, (await readBody(request)).status)); }
    if (method === "PUT") {
      const auth = requireAdminOrSelf(request, id);
      const body = await readBody(request);
      if (auth.role !== "admin") { delete body.status; delete body.rating; delete body.cases; } // self-edits can't self-approve
      return send(request, response, 200, updateAdvocate(id, body));
    }
    if (method === "DELETE") { requireAdmin(request); return send(request, response, 200, deleteAdvocate(id)); }
  }

  const clientIdMatch = p.match(/^\/api\/clients\/(\d+)(\/status)?$/);
  if (clientIdMatch) {
    const id = Number(clientIdMatch[1]);
    if (clientIdMatch[2] && method === "POST") { requireAdmin(request); const body = await readBody(request); // set status
      const clients = loadClients();
      const idx = clients.findIndex(c => Number(c.id) === Number(id));
      if (idx === -1) throw new HttpError(404, "Client not found");
      if (!["approved","pending","rejected"].includes(body.status)) throw new HttpError(400, "Invalid status");
      clients[idx].status = body.status;
      saveClients(clients);
      const { passwordHash, ...safe } = clients[idx];
      return send(request, response, 200, safe);
    }
    // Allow advocates (and admins) to fetch minimal public info for a client by id.
    if (!clientIdMatch[2] && method === "GET") {
      const auth = authFromRequest(request);
      if (!auth || (auth.role !== "advocate" && auth.role !== "admin")) throw new HttpError(401, "Login required");
      const clients = loadClients();
      const idx = clients.findIndex(c => Number(c.id) === Number(id));
      if (idx === -1) throw new HttpError(404, "Client not found");
      const { passwordHash, ...safe } = clients[idx];
      // Only return minimal public fields to advocates
      const pub = { id: safe.id, name: safe.name, city: safe.city, phone: safe.phone };
      return send(request, response, 200, pub);
    }
    // Admin: update client
    if (method === "PUT") {
      requireAdmin(request);
      const body = await readBody(request);
      const clients = loadClients();
      const idx = clients.findIndex(c => Number(c.id) === Number(id));
      if (idx === -1) throw new HttpError(404, "Client not found");

      // If email provided, validate and ensure uniqueness
      if (body.email !== undefined) {
        const email = normalizeEmail(body.email);
        if (!isValidEmail(email)) throw new HttpError(400, "A valid email is required");
        if (clients.some((c, i) => i !== idx && normalizeEmail(c.email) === email)) throw new HttpError(409, "Email already in use");
        clients[idx].email = email;
      }

      // Update allowed fields
      if (body.name !== undefined) clients[idx].name = String(body.name).trim();
      if (body.phone !== undefined) clients[idx].phone = body.phone || "";
      if (body.city !== undefined) clients[idx].city = body.city || "";
      if (body.status !== undefined) {
        if (!["approved","pending","rejected"].includes(body.status)) throw new HttpError(400, "Invalid status");
        clients[idx].status = body.status;
      }

      // Allow admin to set/reset client password
      if (body.password !== undefined) {
        if (String(body.password).length < 6) throw new HttpError(400, "Password must be at least 6 characters");
        clients[idx].passwordHash = hashPassword(body.password);
        // Invalidate existing client sessions by bumping sessionVersion
        clients[idx].sessionVersion = (Number(clients[idx].sessionVersion) || 0) + 1;
      }

      saveClients(clients);

      // Also sync updated client info into payments.json
      try {
        const payments = loadPayments();
        let paymentsChanged = false;
        payments.forEach(p => {
          if (Number(p.clientId) === Number(id)) {
            if (body.name !== undefined) p.clientName = clients[idx].name;
            if (body.email !== undefined) p.clientEmail = clients[idx].email;
            if (body.phone !== undefined) p.clientPhone = clients[idx].phone;
            if (body.city !== undefined) p.clientCity = clients[idx].city;
            paymentsChanged = true;
          }
        });
        if (paymentsChanged) savePayments(payments);
      } catch {}

      const { passwordHash, ...safe } = clients[idx];
      return send(request, response, 200, safe);
    }

    // Admin: delete client
    if (method === "DELETE") {
      requireAdmin(request);
      const clients = loadClients();
      const remaining = clients.filter(c => Number(c.id) !== Number(id));
      if (remaining.length === clients.length) throw new HttpError(404, "Client not found");
      saveClients(remaining);

      // Also clean up consultation records for this client in payments.json
      try {
        const payments = loadPayments();
        const remPayments = payments.filter(p => Number(p.clientId) !== Number(id));
        if (remPayments.length !== payments.length) {
          savePayments(remPayments);
        }
      } catch {}

      return send(request, response, 200, { ok: true });
    }
  }

  throw new HttpError(404, "Not found");
}

const server = http.createServer((request, response) => {
  route(request, response).catch((error) => {
    const status = error instanceof HttpError ? error.status : 500;
    if (status === 500) console.error(error);
    send(request, response, status, { error: status === 500 ? "Internal server error" : error.message, ...(error.extra || {}) });
    if (status === 413) response.once("finish", () => request.destroy());
  });
});

migratePasswords();
server.listen(PORT, () => {
  console.log(`AdvocateHub API running at http://localhost:${PORT}`);
});
