import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type User = {
  id: number;
  email: string;
  username: string;
  telegramId: string | null;
  googleId: string | null;
  avatarUrl: string | null;
  emailVerified: boolean | null;
  lastLoginAt: string | null;
  createdAt: string;
};

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  signup: (data: { email: string; username: string; password: string; telegramId?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateTelegramId: (telegramId: string | null) => Promise<void>;
};

const TOKEN_KEY = "zakpubg_auth_token";
const AuthContext = createContext<AuthContextValue | null>(null);

async function api(path: string, opts: RequestInit = {}, token?: string | null) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...(opts.headers as any) };
  if (token) headers["x-auth-token"] = token;
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!token) { setUser(null); setLoading(false); return; }
    try {
      const data = await api("/api/auth/me", {}, token);
      setUser(data.user);
    } catch {
      try { localStorage.removeItem(TOKEN_KEY); } catch {}
      setToken(null); setUser(null);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { refresh(); }, [refresh]);

  function storeToken(tok: string, userData: User) {
    try { localStorage.setItem(TOKEN_KEY, tok); } catch {}
    setToken(tok); setUser(userData);
  }

  const login: AuthContextValue["login"] = async (identifier, password) => {
    const data = await api("/api/auth/login", { method: "POST", body: JSON.stringify({ identifier, password }) });
    storeToken(data.token, data.user);
  };

  const loginWithGoogle: AuthContextValue["loginWithGoogle"] = async (credentialOrToken, isAccessToken = false) => {
    const body = isAccessToken ? { access_token: credentialOrToken } : { credential: credentialOrToken };
    const data = await api("/api/auth/google", { method: "POST", body: JSON.stringify(body) });
    storeToken(data.token, data.user);
  };

  const signup: AuthContextValue["signup"] = async (payload) => {
    const data = await api("/api/auth/signup", { method: "POST", body: JSON.stringify(payload) });
    storeToken(data.token, data.user);
  };

  const updateTelegramId: AuthContextValue["updateTelegramId"] = async (telegramId) => {
    const data = await api("/api/auth/me/telegram", { method: "PATCH", body: JSON.stringify({ telegramId }) }, token);
    setUser(data.user);
  };

  const logout = async () => {
    try { await api("/api/auth/logout", { method: "POST" }, token); } catch {}
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(null); setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithGoogle, signup, logout, refresh, updateTelegramId }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
