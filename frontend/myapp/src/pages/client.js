// ============================================================
//  backend/routes/client.js
//  ------------------------------------------------------------
//  Express routes for CLIENT registration + login.
//  Data is persisted to  backend/data/client.json
//  Passwords are hashed with Node's built-in crypto.scrypt
//  (no external hashing library needed).
//
//  Mount this in your main server file, e.g.:
//
//      const clientRoutes = require("./routes/client");
//      app.use("/api/auth/client", clientRoutes);
//
//  Endpoints:
//      POST /api/auth/client/register
//      POST /api/auth/client/login
//      GET  /api/auth/client/:id        (optional - fetch one client)
// ============================================================

const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

// ---- Where the client data file lives ------------------------
// Adjust this path if you place client.json somewhere else.
const DATA_FILE = path.join(__dirname, "..", "data", "client.json");

// ---- Make sure the data file + folder exist -------------------
function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf-8");
  }
}

// ---- Read all clients from disk --------------------------------
function readClients() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, "utf-8");
  try {
    return JSON.parse(raw || "[]");
  } catch (err) {
    console.error("client.json is corrupted — resetting to []", err);
    return [];
  }
}

// ---- Write all clients to disk -----------------------------------
function writeClients(clients) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(clients, null, 2), "utf-8");
}

// ---- Password hashing helpers (scrypt) ---------------------------
function hashPassword(plainPassword) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(plainPassword, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const hashToCompare = crypto.scryptSync(plainPassword, salt, 64).toString("hex");
  const hashBuf = Buffer.from(hash, "hex");
  const compareBuf = Buffer.from(hashToCompare, "hex");
  if (hashBuf.length !== compareBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, compareBuf);
}

// ---- Simple auto-increment id -------------------------------------
function nextId(clients) {
  if (!clients.length) return 1;
  return Math.max(...clients.map((c) => c.id || 0)) + 1;
}

// ---- Basic validators -----------------------------------------------
function isValidEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || ""));
}

// Strip the password hash before sending a client object back to the browser
function toSafeClient(client) {
  const { passwordHash, ...safe } = client;
  return safe;
}

// ====================================================================
//  POST /api/auth/client/register
// ====================================================================
router.post("/register", (req, res) => {
  const { name, email, password, phone, city, legalIssue } = req.body || {};

  if (!name || !String(name).trim()) {
    return res.status(400).json({ message: "Full name is required." });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "A valid email is required." });
  }
  if (!password || String(password).length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  const emailLower = String(email).trim().toLowerCase();
  const clients = readClients();

  const exists = clients.some((c) => c.email === emailLower);
  if (exists) {
    return res
      .status(409)
      .json({ message: "An account with this email already exists." });
  }

  const newClient = {
    id: nextId(clients),
    name: String(name).trim(),
    email: emailLower,
    passwordHash: hashPassword(password),
    phone: phone ? String(phone).trim() : "",
    city: city || "",
    legalIssue: legalIssue || "",
    createdAt: new Date().toISOString(),
  };

  clients.push(newClient);
  writeClients(clients);

  return res.status(201).json({
    message: "Account created successfully.",
    client: toSafeClient(newClient),
  });
});

// ====================================================================
//  POST /api/auth/client/login
// ====================================================================
router.post("/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required." });
  }

  const emailLower = String(email).trim().toLowerCase();
  const clients = readClients();

  const match = clients.find((c) => c.email === emailLower);
  if (!match) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  const passwordOk = verifyPassword(password, match.passwordHash);
  if (!passwordOk) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  return res.status(200).json({
    message: "Login successful.",
    client: toSafeClient(match),
  });
});

// ====================================================================
//  GET /api/auth/client/:id   (optional helper — fetch one client by id)
// ====================================================================
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const clients = readClients();
  const found = clients.find((c) => c.id === id);
  if (!found) {
    return res.status(404).json({ message: "Client not found." });
  }
  return res.status(200).json({ client: toSafeClient(found) });
});

module.exports = router;