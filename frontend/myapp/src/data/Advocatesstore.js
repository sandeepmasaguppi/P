// ============================================================
//  Advocatesstore.js — Shared advocate data layer (API-backed)
//
//  The backend (backend/server.js) is the single source of truth.
//  Passwords never reach the browser: the public list is fetched
//  from GET /api/advocates and cached in memory + localStorage so
//  the synchronous getAdvocates() / getAdvocateById() helpers used
//  across pages keep working. Call loadAdvocates() (done once in
//  index.js before first render, and again after any write) to
//  refresh the cache.
//
//  Advocate shape (public):
//  { id, name, email, phone, city, speciality, practiceArea, court,
//    barCouncil, barId, experience, fee, bio, languages, rating,
//    cases, availability, avatar, status }
// ============================================================

import { api, getAdminToken, getAdvocateToken, setAdvocateToken } from "./api";

const CACHE_KEY = "law4u_advocates_cache";
const LEGACY_KEY = "law4u_advocates"; // pre-API store (held plain passwords) — purge it
const RATINGS_KEY = "law4u_advocate_ratings";

let cache = null;
const listeners = new Set();

function readRatings() {
  try {
    const raw = localStorage.getItem(RATINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeRatings(data) {
  try {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(data));
  } catch {
    // ignore quota issues
  }
}

function readCache() {
  try {
    localStorage.removeItem(LEGACY_KEY);
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setCache(list) {
  cache = Array.isArray(list) ? list : [];
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ }
  listeners.forEach((fn) => fn(cache));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("law4u_advocates_updated"));
  }
}

// ── Read (sync, from cache) ──────────────────────────────────

export function getAdvocates() {
  if (cache === null) cache = readCache();
  return cache;
}

export function getAdvocateById(id) {
  return getAdvocates().find((a) => a.id === Number(id)) || null;
}

export function getAdvocateByEmail(email) {
  const e = String(email || "").trim().toLowerCase();
  return getAdvocates().find((a) => String(a.email).toLowerCase() === e) || null;
}

export function getAdvocateRatingSummary(id) {
  const advocateId = Number(id);
  const advocate = getAdvocateById(advocateId);
  const localRatings = readRatings();
  const localRecord = localRatings[advocateId] || { total: 0, count: 0, votes: {} };

  // Aggregate votes from both backend advocates.json and local storage
  const combinedVotes = { ...(localRecord.votes || {}) };

  if (advocate?.ratings && typeof advocate.ratings === "object" && !Array.isArray(advocate.ratings)) {
    Object.entries(advocate.ratings).forEach(([uid, val]) => {
      const score = typeof val === "object" ? Number(val.score) || 0 : Number(val) || 0;
      if (score > 0) combinedVotes[String(uid)] = score;
    });
  }

  const scores = Object.values(combinedVotes);
  const count = scores.length;
  const total = scores.reduce((sum, s) => sum + s, 0);

  // Movie-style rating average
  const avg = count > 0
    ? Number((total / count).toFixed(1))
    : (Number(advocate?.rating) || 5.0);

  return {
    rating: avg,
    count: count || (advocate?.ratingCount || 0),
    total,
    votes: combinedVotes,
  };
}

export async function submitAdvocateRating(id, clientId, score, clientName = "") {
  const advocateId = Number(id);
  const voterId = String(clientId || "guest");
  const safeScore = Math.min(5, Math.max(1, Number(score) || 1));

  // 1. Update local storage first for instant feedback
  const summary = setAdvocateRating(advocateId, voterId, safeScore);

  // 2. Persist to backend /api/advocates/:id/rate (writes to backend/data/advocates.json)
  try {
    const res = await api(`/api/advocates/${advocateId}/rate`, {
      method: "POST",
      body: { clientId: voterId, rating: safeScore, clientName }
    });
    if (res && res.ok) {
      const updated = getAdvocates();
      const adv = updated.find((a) => Number(a.id) === advocateId);
      if (adv) {
        adv.rating = res.rating;
        adv.ratingCount = res.ratingCount;
        adv.ratings = res.ratings;
      }
      setCache(updated);
      return {
        rating: res.rating,
        count: res.ratingCount,
        votes: res.ratings || summary.votes,
      };
    }
  } catch (err) {
    console.error("Failed to persist rating to backend advocates.json:", err);
  }

  return summary;
}

export function setAdvocateRating(id, clientId, score) {
  const advocateId = Number(id);
  const voterId = String(clientId);
  const safeScore = Math.min(5, Math.max(1, Number(score) || 1));
  const ratings = readRatings();
  const record = ratings[advocateId] || { total: 0, count: 0, votes: {} };
  const previous = record.votes && Object.prototype.hasOwnProperty.call(record.votes, voterId)
    ? Number(record.votes[voterId])
    : null;

  if (previous !== null) {
    record.total -= previous;
  }

  record.votes[voterId] = safeScore;
  record.total += safeScore;
  record.count = Object.keys(record.votes).length;

  ratings[advocateId] = record;
  writeRatings(ratings);

  const updated = getAdvocates();
  const advocate = updated.find((item) => Number(item.id) === advocateId);
  if (advocate) {
    advocate.rating = record.count ? Number((record.total / record.count).toFixed(1)) : 0;
    advocate.ratingCount = record.count;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(updated)); } catch {}
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("law4u_advocates_updated"));
    }
  }

  return {
    rating: record.count ? Number((record.total / record.count).toFixed(1)) : 0,
    count: record.count,
    votes: record.votes,
  };
}

export function subscribeAdvocates(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ── Refresh from API ─────────────────────────────────────────

// Public list = approved advocates. With an admin token, `all: true`
// returns pending/rejected too (the admin console needs them).
export async function loadAdvocates({ all = false } = {}) {
  const token = all ? getAdminToken() : null;
  const list = await api(all && token ? "/api/advocates?all=1" : "/api/advocates", { token });
  setCache(list);
  return list;
}

// ── Auth ─────────────────────────────────────────────────────

export async function loginAdvocate(email, password, remember = false) {
  const result = await api("/api/auth/advocate/login", { method: "POST", body: { email, password } });
  setAdvocateToken(result.token, remember);
  return result.advocate;
}

export function logoutAdvocate() {
  setAdvocateToken(null);
}

// ── Writes ───────────────────────────────────────────────────

// Self-service signup → status "pending" until an admin approves.
export async function registerAdvocate(advocate) {
  const created = await api("/api/advocates/register", { method: "POST", body: advocate });
  await loadAdvocates().catch(() => {});
  return created;
}

async function adminWrite(path, method, body) {
  const token = getAdminToken();
  if (!token) throw new Error("Admin login required");
  const result = await api(path, { method, body, token });
  await loadAdvocates({ all: true });
  return result;
}

export function addAdvocate(advocate) {
  return adminWrite("/api/advocates", "POST", advocate);
}

export function updateAdvocate(id, updates) {
  const token = getAdminToken() || getAdvocateToken();
  return api(`/api/advocates/${Number(id)}`, { method: "PUT", body: updates, token })
    .then(async (saved) => {
      await loadAdvocates({ all: Boolean(getAdminToken()) });
      return saved;
    });
}

export function deleteAdvocate(id) {
  return adminWrite(`/api/advocates/${Number(id)}`, "DELETE");
}

export function approveAdvocate(id) {
  return adminWrite(`/api/advocates/${Number(id)}/status`, "POST", { status: "approved" });
}

export function rejectAdvocate(id) {
  return adminWrite(`/api/advocates/${Number(id)}/status`, "POST", { status: "rejected" });
}
