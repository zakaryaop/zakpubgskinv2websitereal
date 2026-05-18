import type { Express, Request, Response, NextFunction } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, or, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { OAuth2Client } from "google-auth-library";
import {
  users,
  userSessions,
  signupSchema,
  signinSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  forgotUsernameSchema,
} from "@workspace/db";
import { sendPasswordResetEmail, sendEmailVerification, sendUsernameReminder } from "./lib/email";

const db = drizzle(process.env.DATABASE_URL!);
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VIPBOT_TOKEN;
const ADMIN_CHAT_ID = process.env.VIPBOT_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRate(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) { rateBuckets.set(key, { count: 1, resetAt: now + windowMs }); return true; }
  if (bucket.count >= max) return false;
  bucket.count++;
  return true;
}
setInterval(() => { const now = Date.now(); for (const [k, v] of rateBuckets) if (v.resetAt < now) rateBuckets.delete(k); }, 5 * 60 * 1000).unref?.();

function clientIp(req: any): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

async function sendTelegram(chatId: string | number, text: string) {
  if (!BOT_TOKEN) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
    const data = await res.json(); return Boolean(data.ok);
  } catch { return false; }
}

function sanitize(user: any) {
  if (!user) return null;
  const { passwordHash, resetCode, resetCodeExpiry, ...safe } = user;
  return safe;
}

function genToken() { return crypto.randomBytes(32).toString("hex"); }
function genResetCode() { return String(Math.floor(100000 + Math.random() * 900000)); }
const SESSION_DAYS = 30;

async function createSession(userId: number, req: any) {
  const token = genToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(userSessions).values({
    token, userId,
    ip: (req.ip || "").toString(),
    userAgent: req.headers["user-agent"] || "",
    expiresAt,
  });
  return token;
}

export function registerAuthRoutes(app: Express) {
  async function requireAuth(req: Request, res: Response, next: NextFunction) {
    const token = (req.headers["x-auth-token"] as string) ||
      (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
    if (!token) return res.status(401).json({ message: "Not authenticated" });
    const [row] = await db.select().from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())));
    if (!row) return res.status(401).json({ message: "Session expired" });
    const [user] = await db.select().from(users).where(eq(users.id, row.userId));
    if (!user) return res.status(401).json({ message: "User not found" });
    (req as any).user = user; (req as any).sessionToken = token; next();
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { credential, access_token } = req.body;
      if (!credential && !access_token) return res.status(400).json({ message: "Missing credential" });
      if (!GOOGLE_CLIENT_ID) return res.status(503).json({ message: "Google login not configured. Add GOOGLE_CLIENT_ID env var." });

      let googleId: string, email: string | undefined, name: string | undefined, picture: string | undefined;

      if (access_token) {
        // Verify via Google userinfo endpoint
        const r = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!r.ok) return res.status(400).json({ message: "Invalid Google access token" });
        const info = await r.json();
        googleId = info.sub; email = info.email; name = info.name; picture = info.picture;
      } else {
        const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
        const payload = ticket.getPayload();
        if (!payload) return res.status(400).json({ message: "Invalid Google token" });
        ({ sub: googleId, email, name, picture } = payload as any);
      }

      const { sub: _sub, email: _email, name: _name, picture: _pic, ...rest } = { sub: googleId, email, name, picture };
      if (!email) return res.status(400).json({ message: "No email in Google token" });

      let [user] = await db.select().from(users).where(eq(users.googleId, googleId!));

      if (!user) {
        const [byEmail] = await db.select().from(users).where(eq(users.email, email));
        if (byEmail) {
          [user] = await db.update(users).set({ googleId, avatarUrl: picture, lastLoginAt: new Date() })
            .where(eq(users.id, byEmail.id)).returning();
        } else {
          const baseUsername = (name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20);
          let username = baseUsername;
          for (let i = 1; i < 20; i++) {
            const [existing] = await db.select().from(users).where(eq(users.username, username));
            if (!existing) break;
            username = `${baseUsername}${i}`;
          }
          [user] = await db.insert(users).values({
            email, username,
            passwordHash: null,
            googleId, avatarUrl: picture,
            emailVerified: true,
            lastLoginAt: new Date(),
          }).returning();

          if (ADMIN_CHAT_ID) {
            sendTelegram(ADMIN_CHAT_ID, `🆕 *New Google signup*\n\n👤 ${username}\n📧 ${email}`).catch(() => {});
          }
        }
      } else {
        await db.update(users).set({ avatarUrl: picture, lastLoginAt: new Date() }).where(eq(users.id, user.id));
      }

      const token = await createSession(user.id, req);
      return res.json({ user: sanitize(user), token });
    } catch (err) {
      console.error("[auth/google]", err);
      return res.status(500).json({ message: "Google login failed" });
    }
  });

  // ── Signup ────────────────────────────────────────────────────────────────
  app.post("/api/auth/signup", async (req, res) => {
    try {
      if (!checkRate(`signup:${clientIp(req)}`, 5, 60 * 60 * 1000))
        return res.status(429).json({ message: "Too many signups. Try again later." });
      const parsed = signupSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
      const { email, username, password, telegramId } = parsed.data;
      const normEmail = email.toLowerCase().trim();
      const normUsername = username.trim().toLowerCase();

      const [existingEmail] = await db.select().from(users).where(eq(users.email, normEmail));
      if (existingEmail) return res.status(409).json({ message: "Email already registered" });
      const [existingUsername] = await db.select().from(users).where(eq(users.username, normUsername));
      if (existingUsername) return res.status(409).json({ message: "Username already taken" });

      const passwordHash = await bcrypt.hash(password, 12);
      const verifyToken = genToken();
      const [user] = await db.insert(users).values({
        email: normEmail, username: normUsername, passwordHash,
        telegramId: telegramId ? String(telegramId).trim() : null,
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastLoginAt: new Date(),
      }).returning();

      const token = await createSession(user.id, req);
      sendEmailVerification(normEmail, verifyToken, normUsername).catch(() => {});
      if (ADMIN_CHAT_ID) sendTelegram(ADMIN_CHAT_ID, `🆕 *New signup*\n👤 ${normUsername}\n📧 ${normEmail}`).catch(() => {});
      return res.json({ user: sanitize(user), token });
    } catch (err) { console.error("[auth/signup]", err); return res.status(500).json({ message: "Signup failed" }); }
  });

  // ── Login ─────────────────────────────────────────────────────────────────
  app.post("/api/auth/login", async (req, res) => {
    try {
      if (!checkRate(`login:${clientIp(req)}`, 10, 15 * 60 * 1000))
        return res.status(429).json({ message: "Too many login attempts. Try again in 15 minutes." });
      const parsed = signinSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
      const { identifier, password } = parsed.data;
      const normId = identifier.toLowerCase().trim();
      const [user] = await db.select().from(users).where(or(eq(users.email, normId), eq(users.username, normId)));
      if (!user) return res.status(401).json({ message: "Invalid credentials" });
      if (!user.passwordHash) return res.status(401).json({ message: "This account uses Google login. Please sign in with Google." });
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials" });
      const token = await createSession(user.id, req);
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
      return res.json({ user: sanitize(user), token });
    } catch (err) { console.error("[auth/login]", err); return res.status(500).json({ message: "Login failed" }); }
  });

  // ── Logout ────────────────────────────────────────────────────────────────
  app.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      await db.delete(userSessions).where(eq(userSessions.token, (req as any).sessionToken));
      return res.json({ success: true });
    } catch { return res.status(500).json({ message: "Logout failed" }); }
  });

  // ── Me ────────────────────────────────────────────────────────────────────
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    return res.json({ user: sanitize((req as any).user) });
  });

  app.patch("/api/auth/me/telegram", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      const raw = req.body?.telegramId;
      const value = typeof raw === "string" && raw.trim().length > 0 ? raw.trim().replace(/^@/, "").slice(0, 64) : null;
      if (value && !/^[a-zA-Z0-9_]{3,64}$/.test(value))
        return res.status(400).json({ message: "Invalid Telegram username." });
      const [updated] = await db.update(users).set({ telegramId: value }).where(eq(users.id, u.id)).returning();
      return res.json({ user: sanitize(updated) });
    } catch { return res.status(500).json({ message: "Failed" }); }
  });

  // ── Password reset ────────────────────────────────────────────────────────
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      if (!checkRate(`forgot:${clientIp(req)}`, 5, 15 * 60 * 1000))
        return res.status(429).json({ message: "Too many requests." });
      const parsed = forgotPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid request" });
      const normId = parsed.data.identifier.toLowerCase().trim();
      const [user] = await db.select().from(users).where(or(eq(users.email, normId), eq(users.username, normId)));
      if (user) {
        const code = genResetCode();
        const codeHash = await bcrypt.hash(code, 10);
        await db.update(users).set({ resetCode: codeHash, resetCodeExpiry: new Date(Date.now() + 15 * 60 * 1000) }).where(eq(users.id, user.id));
        if (user.email) await sendPasswordResetEmail(user.email, code, user.username || user.email).catch(() => {});
        if (user.telegramId) await sendTelegram(user.telegramId, `🔐 *Password Reset Code:* \`${code}\`\n\nExpires in 15 minutes.`).catch(() => {});
      }
      return res.json({ success: true, message: "If that account exists, a reset code has been sent to your email." });
    } catch { return res.status(500).json({ message: "Request failed" }); }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      if (!checkRate(`reset:${clientIp(req)}`, 10, 15 * 60 * 1000))
        return res.status(429).json({ message: "Too many attempts." });
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message || "Invalid data" });
      const { identifier, code, password } = parsed.data;
      const normId = identifier.toLowerCase().trim();
      const [user] = await db.select().from(users).where(or(eq(users.email, normId), eq(users.username, normId)));
      if (!user || !user.resetCode || !user.resetCodeExpiry) return res.status(400).json({ message: "Invalid or expired code" });
      if (user.resetCodeExpiry < new Date()) return res.status(400).json({ message: "Code expired" });
      if (!(await bcrypt.compare(code, user.resetCode))) return res.status(400).json({ message: "Invalid code" });
      const passwordHash = await bcrypt.hash(password, 12);
      await db.update(users).set({ passwordHash, resetCode: null, resetCodeExpiry: null }).where(eq(users.id, user.id));
      await db.delete(userSessions).where(eq(userSessions.userId, user.id));
      return res.json({ success: true, message: "Password reset. Please log in." });
    } catch { return res.status(500).json({ message: "Reset failed" }); }
  });

  app.post("/api/auth/forgot-username", async (req, res) => {
    try {
      const parsed = forgotUsernameSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Invalid email" });
      const normEmail = parsed.data.email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, normEmail));
      if (user) {
        if (user.email) await sendUsernameReminder(user.email, user.username).catch(() => {});
        if (user.telegramId) await sendTelegram(user.telegramId, `👤 *Your username:* \`${user.username}\``).catch(() => {});
      }
      return res.json({ success: true, message: "If that account exists, your username has been sent to your email." });
    } catch { return res.status(500).json({ message: "Request failed" }); }
  });

  // ── Email verification ────────────────────────────────────────────────────
  app.get("/api/auth/verify-email", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.status(400).json({ message: "Missing token" });
      const [user] = await db.select().from(users).where(eq(users.emailVerifyToken, token));
      if (!user) return res.status(400).json({ message: "Invalid or already used token" });
      if (user.emailVerifyExpiry && user.emailVerifyExpiry < new Date()) {
        return res.status(400).json({ message: "Verification link expired" });
      }
      await db.update(users)
        .set({ emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null })
        .where(eq(users.id, user.id));
      return res.json({ success: true, message: "Email verified. You can now use all features." });
    } catch { return res.status(500).json({ message: "Verification failed" }); }
  });

  app.post("/api/auth/resend-verification", requireAuth, async (req, res) => {
    try {
      const u = (req as any).user;
      if (u.emailVerified) return res.json({ success: true, message: "Email already verified." });
      if (!checkRate(`resendverify:${u.id}`, 3, 60 * 60 * 1000))
        return res.status(429).json({ message: "Please wait before requesting again." });
      const verifyToken = genToken();
      await db.update(users).set({
        emailVerifyToken: verifyToken,
        emailVerifyExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      }).where(eq(users.id, u.id));
      await sendEmailVerification(u.email, verifyToken, u.username);
      return res.json({ success: true, message: "Verification email sent." });
    } catch { return res.status(500).json({ message: "Failed to send" }); }
  });
}
