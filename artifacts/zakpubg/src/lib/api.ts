const API_BASE = "/api";

const TOKEN_KEY = "zakpubg_auth_token";
export function getAuthToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { "x-auth-token": token } : {};
}

async function req(method: string, path: string, body?: any, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders(), ...extraHeaders };
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? headers : { ...authHeaders(), ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── Games ─────────────────────────────────────────────────────────────────────
export async function getGames() { return req("GET", "/games"); }
export async function getGame(slug: string) { return req("GET", `/games/${slug}`); }
export async function getGameProducts(slug: string) { return req("GET", `/games/${slug}/products`); }

// ── Payments ──────────────────────────────────────────────────────────────────
export async function createPayment(productId: number, payCurrency: string, opts?: { durationDays?: number; priceUsd?: string }) {
  return req("POST", "/payments/create", { productId, payCurrency, ...(opts || {}) });
}
export async function getPaymentStatus(paymentId: number) {
  return req("GET", `/payments/${paymentId}/status`);
}
export async function getMyMemberships() { return req("GET", "/my/memberships"); }

// ── Site Settings ──────────────────────────────────────────────────────────────
export async function getSetting(key: string): Promise<string | null> {
  try {
    const d = await fetch(`${API_BASE}/settings/${key}`).then(r => r.json());
    return d.value ?? null;
  } catch { return null; }
}
export async function adminSaveSetting(token: string, key: string, value: string) {
  const res = await fetch(`${API_BASE}/admin/settings/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error("Failed to save setting");
  return res.json();
}

export async function getCoinMinAmounts(): Promise<Record<string, number>> {
  try {
    const d = await req("GET", "/payments/min-amounts");
    return d.mins || {};
  } catch { return {}; }
}

// ── Admin: games ──────────────────────────────────────────────────────────────
export function adminHeaders(token: string) { return { Authorization: `Bearer ${token}` }; }

export async function adminGetGames(token: string) {
  const res = await fetch(`${API_BASE}/admin/games`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}
export async function adminCreateGame(token: string, data: any) {
  const res = await fetch(`${API_BASE}/admin/games`, { method: "POST", headers: { ...adminHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
  return res.json();
}
export async function adminUpdateGame(token: string, id: number, data: any) {
  const res = await fetch(`${API_BASE}/admin/games/${id}`, { method: "PUT", headers: { ...adminHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
  return res.json();
}
export async function adminDeleteGame(token: string, id: number) {
  const res = await fetch(`${API_BASE}/admin/games/${id}`, { method: "DELETE", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

// ── Admin: products ───────────────────────────────────────────────────────────
export async function adminGetProducts(token: string) {
  const res = await fetch(`${API_BASE}/admin/products`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}
export async function adminCreateProduct(token: string, data: any) {
  const res = await fetch(`${API_BASE}/admin/products`, { method: "POST", headers: { ...adminHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
  return res.json();
}
export async function adminUpdateProduct(token: string, id: number, data: any) {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, { method: "PUT", headers: { ...adminHeaders(token), "Content-Type": "application/json" }, body: JSON.stringify(data) });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "Failed"); }
  return res.json();
}
export async function adminDeleteProduct(token: string, id: number) {
  const res = await fetch(`${API_BASE}/admin/products/${id}`, { method: "DELETE", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

// ── Admin: payments ───────────────────────────────────────────────────────────
export async function adminGetPayments(token: string) {
  const res = await fetch(`${API_BASE}/admin/payments`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}
export async function adminApproveManualPayment(token: string, id: number) {
  const res = await fetch(`${API_BASE}/admin/payments/manual/${id}/approve`, { method: "POST", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
export async function adminRejectManualPayment(token: string, id: number) {
  const res = await fetch(`${API_BASE}/admin/payments/manual/${id}/reject`, { method: "POST", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed");
  return res.json();
}
export async function createManualPayment(productId: number, opts: { methodId: string; senderName: string; senderPhone?: string; txReference: string; screenshotBase64?: string | null; durationDays?: number; priceUsd?: string }) {
  return req("POST", "/payments/manual/create", { productId, ...opts });
}
export async function getManualPaymentStatus(paymentId: number) {
  return req("GET", `/payments/manual/${paymentId}/status`);
}

// ── Legacy admin ──────────────────────────────────────────────────────────────
export async function adminLogin(username: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) });
  if (!res.ok) throw new Error("Invalid credentials");
  return res.json();
}
export async function getPendingMembers(token: string) {
  const res = await fetch(`${API_BASE}/admin/pending`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized"); return res.json();
}
export async function getActiveMembers(token: string) {
  const res = await fetch(`${API_BASE}/admin/active`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized"); return res.json();
}
export async function getAllMembers(token: string) {
  const res = await fetch(`${API_BASE}/admin/all`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized"); return res.json();
}
export async function getAdminStats(token: string) {
  const res = await fetch(`${API_BASE}/admin/stats`, { headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Unauthorized"); return res.json();
}
export async function approveMember(id: number, token: string) {
  const res = await fetch(`${API_BASE}/admin/approve/${id}`, { method: "POST", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed"); return res.json();
}
export async function rejectMember(id: number, token: string) {
  const res = await fetch(`${API_BASE}/admin/reject/${id}`, { method: "POST", headers: adminHeaders(token) });
  if (!res.ok) throw new Error("Failed"); return res.json();
}

// ── Legacy VIP member login ───────────────────────────────────────────────────
export async function getMember(id: number) {
  const res = await fetch(`${API_BASE}/member/${id}`);
  if (!res.ok) throw new Error("Member not found");
  return res.json();
}

export async function logoutMember() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("zakpubg_session_token");
  } catch {}
  const res = await fetch(`${API_BASE}/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  });
  if (!res.ok) throw new Error(`Logout failed: HTTP ${res.status}`);
  return res.json().catch(() => ({ success: true }));
}

export async function adminGetConfig(token: string): Promise<Record<string, string>> {
  const res = await fetch(`${API_BASE}/admin/config`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return {};
  return res.json();
}

export function getDeviceId(): string {
  let deviceId = localStorage.getItem("zakpubg_device_id");
  if (!deviceId) {
    deviceId = "dev_" + Math.abs(Date.now() ^ Math.random() * 0xffffffff | 0).toString(36) + "_" + Date.now().toString(36);
    localStorage.setItem("zakpubg_device_id", deviceId);
  }
  return deviceId;
}
