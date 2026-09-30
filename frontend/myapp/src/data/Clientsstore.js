// ============================================================
//  Clientsstore.js — Client data layer (API-backed)
//  Single source of truth is backend/data/clients.json.
//  No hardcoded default clients are injected or assumed.
// ============================================================

import { api, getAdminToken } from "./api";

// Kept for backward compatibility if imported elsewhere, but empty by default
export const DEFAULT_CLIENTS = [];

export function getLocalClients() {
  try {
    const raw = localStorage.getItem("law4u_clients");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function registerClient(client) {
  return api("/api/clients/register", { method: "POST", body: client });
}

export async function createClient(client) {
  const res = await api("/api/clients", { method: "POST", body: client, token: getAdminToken() });
  await getClients();
  return res;
}

export async function getClients() {
  try {
    // Fetches live from backend/data/clients.json via GET /api/clients
    const list = await api("/api/clients", { token: getAdminToken() });
    if (Array.isArray(list)) {
      try {
        localStorage.setItem("law4u_clients", JSON.stringify(list));
      } catch {}
      return list;
    }
  } catch (err) {
    console.error("Failed to fetch clients from backend/data/clients.json:", err);
  }
  return getLocalClients();
}

export async function updateClient(id, updates) {
  const res = await api(`/api/clients/${Number(id)}`, { method: "PUT", body: updates, token: getAdminToken() });
  await getClients();
  return res;
}

export async function deleteClient(id) {
  const res = await api(`/api/clients/${Number(id)}`, { method: "DELETE", token: getAdminToken() });
  await getClients();
  return res;
}

