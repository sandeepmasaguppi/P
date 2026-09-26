// ============================================================
//  Clientsstore.js — Client registration (API-backed)
//  Clients are created via POST /api/clients/register; the backend
//  hashes the password and keeps the record in backend/data/clients.json.
// ============================================================

import { api, getAdminToken } from "./api";

export function registerClient(client) {
  return api("/api/clients/register", { method: "POST", body: client });
}

export function getClients() {
  return api("/api/clients", { token: getAdminToken() });
}

export function updateClient(id, updates) {
  return api(`/api/clients/${Number(id)}`, { method: "PUT", body: updates, token: getAdminToken() });
}

export function deleteClient(id) {
  return api(`/api/clients/${Number(id)}`, { method: "DELETE", token: getAdminToken() });
}
