import type { Express } from "express";
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { storage } from "../storage";
import { paymentSubmitSchema, vipBotUsers, type Member } from "@workspace/db";
import {
  notifyUser,
  notifyAdmin,
  sendExpiryNotification,
  generateGroupInviteLink,
} from "../telegram";
import { startVipBotPolling, checkExpiredVipUsers, sendOrderAlert } from "../vipbot";

const db = drizzle(process.env.DATABASE_URL!);

function sanitizeMember(member: Member) {
  const { passwordHash, loginKey, ...safe } = member;
  return safe;
}

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.ADMIN_PASSWORD + "_jwt_zak_" + process.env.ADMIN_USERNAME;
const hashedPassword = bcrypt.hashSync(ADMIN_PASSWORD, 12);

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadsDir,
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(null, allowed.includes(file.mimetype));
  },
});

function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
}

export function registerZakRoutes(app: Express) {
  setInterval(() => {
    storage.cleanupExpiredSessions().catch(() => {});
  }, 60 * 60 * 1000);

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain");
    res.send([
      "User-agent: *",
      "Allow: /",
      "Disallow: /admin",
      "Disallow: /login",
      "Disallow: /portal",
      "Disallow: /api/",
      "Disallow: /uploads/",
      "Disallow: /checkout/",
      "",
      "Sitemap: https://zakpubgskin.store/sitemap.xml",
      "Host: https://zakpubgskin.store",
      "",
    ].join("\n"));
  });

  app.get("/sitemap.xml", (_req, res) => {
    const baseUrl = "https://zakpubgskin.store";
    const today = new Date().toISOString().split("T")[0];
    const pages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/demos", priority: "0.9", changefreq: "weekly" },
      { loc: "/contact", priority: "0.8", changefreq: "monthly" },
      { loc: "/support", priority: "0.7", changefreq: "monthly" },
      { loc: "/privacy", priority: "0.4", changefreq: "yearly" },
      { loc: "/terms", priority: "0.4", changefreq: "yearly" },
    ];
    const urls = pages.map((p) =>
      `  <url>\n    <loc>${baseUrl}${p.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
    res.type("application/xml");
    res.send(xml);
  });

  app.use(
    "/uploads",
    (_req, res, next) => {
      res.setHeader("Cache-Control", "public, max-age=86400");
      next();
    },
    express.static(uploadsDir)
  );

  app.post("/api/payment-submit", upload.single("screenshot"), async (req, res) => {
    try {
      const parsed = paymentSubmitSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }

      const existing = await storage.getActiveMemberByTelegramId(parsed.data.telegramId);
      if (existing) {
        if (existing.status === "active") {
          return res.status(409).json({ message: "You already have an active VIP membership." });
        }
        if (existing.status === "pending") {
          return res.status(409).json({ message: "You already have a pending payment. Please wait for approval." });
        }
      }

      const screenshotUrl = req.file ? `/uploads/${req.file.filename}` : null;
      const autoUsername = `user_${parsed.data.telegramId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}_${Date.now().toString(36)}`;

      let referredBy: string | null = null;
      if (parsed.data.referralCode) {
        const referrer = await storage.getMemberByReferralCode(parsed.data.referralCode);
        if (referrer) referredBy = referrer.telegramId;
      }

      const member = await storage.createMember({
        username: autoUsername,
        passwordHash: null,
        telegramId: parsed.data.telegramId,
        plan: parsed.data.plan,
        country: parsed.data.country,
        paymentMethod: parsed.data.paymentMethod,
        screenshotUrl,
        referredBy,
        giftCardCode: parsed.data.giftCardCode || null,
      });

      const existingBotUser = await db.select().from(vipBotUsers).where(eq(vipBotUsers.telegramId, member.telegramId));
      if (existingBotUser.length > 0) {
        await db.update(vipBotUsers).set({
          plan: member.plan,
          paymentMethod: member.paymentMethod,
          screenshotFileId: member.screenshotUrl || null,
          status: "pending",
        }).where(eq(vipBotUsers.telegramId, member.telegramId));
      } else {
        await db.insert(vipBotUsers).values({
          telegramId: member.telegramId,
          plan: member.plan,
          paymentMethod: member.paymentMethod,
          screenshotFileId: member.screenshotUrl || null,
          status: "pending",
        });
      }

      await sendOrderAlert({
        telegramId: member.telegramId,
        plan: member.plan,
        country: member.country,
        paymentMethod: member.paymentMethod,
        orderId: member.id,
        screenshotPath: req.file?.path,
        giftCardCode: parsed.data.giftCardCode,
      });

      return res.status(201).json({ success: true });
    } catch (err: any) {
      console.error("Payment submit error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/order-status", async (req, res) => {
    const { telegramId } = req.query;
    if (!telegramId || typeof telegramId !== "string") {
      return res.status(400).json({ error: "Missing telegramId" });
    }
    try {
      const [botUser] = await db.select().from(vipBotUsers).where(eq(vipBotUsers.telegramId, telegramId));
      if (botUser) {
        return res.json({
          status: botUser.status,
          inviteLink: botUser.status === "active" ? (botUser.inviteLink || null) : null,
          plan: botUser.plan,
        });
      }
      const member = await storage.getActiveMemberByTelegramId(telegramId);
      if (member) {
        return res.json({ status: member.status, inviteLink: null, plan: member.plan });
      }
      return res.json({ status: "pending", inviteLink: null, plan: null });
    } catch {
      return res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { username, password, deviceId } = req.body;
      const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required." });
      }
      if (!deviceId) {
        return res.status(400).json({ message: "Device identification required" });
      }

      const member = await storage.getMemberByUsername(username.trim().toLowerCase());
      if (!member) {
        await storage.logLoginAttempt("unknown", clientIp, deviceId, false, "invalid_username");
        return res.status(401).json({ message: "Invalid username or password." });
      }

      const failedAttempts = await storage.getRecentFailedAttempts(member.telegramId, 15);
      if (failedAttempts >= 5) {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "rate_limited");
        return res.status(429).json({ message: "Too many failed attempts. Try again in 15 minutes." });
      }

      if (!member.passwordHash || !(await bcrypt.compare(password, member.passwordHash))) {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "wrong_password");
        return res.status(401).json({ message: "Invalid username or password." });
      }

      if (member.blocked) {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "blocked");
        return res.status(403).json({ message: "Account blocked. Contact admin." });
      }

      if (member.status !== "active") {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "not_active");
        return res.status(403).json({ message: "Membership not active. Wait for admin approval." });
      }

      if (member.expiryDate && new Date(member.expiryDate).getTime() < Date.now()) {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "expired");
        return res.status(403).json({ message: "VIP membership expired. Renew your plan." });
      }

      if (member.boundDeviceId && member.boundDeviceId !== deviceId) {
        await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, false, "wrong_device");
        return res.status(403).json({ message: "Account locked to another device. 1 account = 1 device. Contact admin to reset." });
      }

      if (!member.boundDeviceId) {
        await storage.bindDevice(member.id, deviceId, clientIp);
      } else {
        await storage.bindDevice(member.id, member.boundDeviceId, clientIp);
      }

      const sessionToken = await storage.createSession(member.id, deviceId, clientIp);
      await storage.logLoginAttempt(member.telegramId, clientIp, deviceId, true);
      return res.json({ member: sanitizeMember(member), sessionToken, deviceId });
    } catch (err) {
      console.error("Login error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/logout", async (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (token) await storage.deleteSession(token);
    return res.json({ success: true });
  });

  app.get("/api/session/validate", async (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (!token) return res.status(401).json({ valid: false });
    try {
      const session = await storage.validateSession(token);
      if (!session) return res.status(401).json({ valid: false });
      const member = await storage.getMember(session.memberId);
      if (!member) {
        await storage.deleteSession(token);
        return res.status(401).json({ valid: false });
      }
      if (member.status !== "active") {
        await storage.deleteSession(token);
        return res.status(401).json({ valid: false, reason: "inactive" });
      }
      if (member.expiryDate && new Date(member.expiryDate).getTime() < Date.now()) {
        await storage.deleteSession(token);
        return res.status(401).json({ valid: false, reason: "expired" });
      }
      return res.json({ valid: true, member: sanitizeMember(member) });
    } catch {
      return res.status(500).json({ valid: false });
    }
  });

  app.get("/api/member/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getMember(id);
      if (!member) return res.status(404).json({ message: "Member not found" });
      return res.json({ member: sanitizeMember(member) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/login", (req, res) => {
    const { username, password } = req.body;
    if (username !== ADMIN_USERNAME || !bcrypt.compareSync(password, hashedPassword)) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({ success: true, token });
  });

  app.get("/api/admin/pending", adminAuth, async (_req, res) => {
    try {
      const pending = await storage.getAllPendingMembers();
      return res.json({ members: pending.map(sanitizeMember) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/active", adminAuth, async (_req, res) => {
    try {
      const active = await storage.getAllActiveMembers();
      return res.json({ members: active.map(sanitizeMember) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/all", adminAuth, async (_req, res) => {
    try {
      const all = await storage.getAllMembers();
      return res.json({ members: all.map(sanitizeMember) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/admin/stats", adminAuth, async (_req, res) => {
    try {
      const all = await storage.getAllMembers();
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      const active = all.filter((m) => m.status === "active");
      const pending = all.filter((m) => m.status === "pending");
      const rejected = all.filter((m) => m.status === "rejected");

      const todaySignups = all.filter((m) => new Date(m.createdAt) >= today).length;
      const weekSignups = all.filter((m) => new Date(m.createdAt) >= weekAgo).length;
      const monthSignups = all.filter((m) => new Date(m.createdAt) >= monthAgo).length;

      const totalRevenue = active.reduce((sum, m) => sum + (m.plan === "60-days" ? 14.99 : 9.99), 0);
      const weekRevenue = active.filter((m) => new Date(m.createdAt) >= weekAgo).reduce((sum, m) => sum + (m.plan === "60-days" ? 14.99 : 9.99), 0);
      const monthRevenue = active.filter((m) => new Date(m.createdAt) >= monthAgo).reduce((sum, m) => sum + (m.plan === "60-days" ? 14.99 : 9.99), 0);

      const countryBreakdown: Record<string, number> = {};
      active.forEach((m) => { countryBreakdown[m.country] = (countryBreakdown[m.country] || 0) + 1; });

      const methodBreakdown: Record<string, number> = {};
      active.forEach((m) => { methodBreakdown[m.paymentMethod] = (methodBreakdown[m.paymentMethod] || 0) + 1; });

      return res.json({
        overview: { total: all.length, active: active.length, pending: pending.length, rejected: rejected.length },
        signups: { today: todaySignups, week: weekSignups, month: monthSignups },
        revenue: { total: totalRevenue, week: weekRevenue, month: monthRevenue },
        plans: { "30-days": active.filter((m) => m.plan === "30-days").length, "60-days": active.filter((m) => m.plan === "60-days").length },
        countries: countryBreakdown,
        methods: methodBreakdown,
        recentSignups: all.slice(0, 10).map((m) => ({ id: m.id, telegramId: m.telegramId, plan: m.plan, country: m.country, status: m.status, createdAt: m.createdAt })),
      });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/approve/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await storage.getMember(id);
      if (!existing) return res.status(404).json({ message: "Member not found" });
      if (existing.status === "active") return res.json({ success: true, member: sanitizeMember(existing) });

      const member = await storage.approveMember(id);
      if (!member) return res.status(404).json({ message: "Member not found" });

      const expiry = (member.expiryDate || new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const planLabel = member.plan === "60-days" ? "60 Days" : "30 Days";
      await notifyAdmin(`✅ Approved: ${member.telegramId} — ${planLabel}`);
      const inviteLink = await generateGroupInviteLink(member.telegramId);
      const inviteSection = inviteLink
        ? `\n\n🔗 *Join VIP Group:*\n${inviteLink}\n\n⚠️ This invite link is for you only and expires in 5 minutes.`
        : `\n\nPlease contact @ZakPubgSkin to join the VIP group.`;
      await notifyUser(member.telegramChatId, `✅ *VIP Approved!*\n\n🎉 Welcome to ZakPubgSkin VIP!\n📅 Plan: ${planLabel}\n📅 Valid until: ${expiry}${inviteSection}`);

      return res.json({ success: true, member: sanitizeMember(member) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/reject/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.rejectMember(id);
      if (!member) return res.status(404).json({ message: "Member not found" });
      await notifyAdmin(`❌ Rejected: ${member.telegramId} (#${member.id})`);
      await notifyUser(member.telegramChatId, `❌ Payment not verified (#${member.id}). Try again or contact @ZakPubgSkin`);
      return res.json({ success: true, member: sanitizeMember(member) });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.post("/api/admin/unblock/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const member = await storage.getMember(id);
      if (!member) return res.status(404).json({ message: "Member not found" });
      await storage.unblockMember(id);
      await storage.bindDevice(id, "", "");
      await storage.deleteSessionsByMemberId(id);
      return res.json({ success: true });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  const ALLOWED_FILES = new Set([
    "vip-guide.zip",
    "sensitivity-settings.txt",
    "graphics-config.ini",
    "pro-tips.ini",
    "scope-guide.txt",
  ]);

  app.post("/api/download/generate", async (req, res) => {
    const token = req.headers["x-session-token"] as string;
    if (!token) return res.status(401).json({ message: "Unauthorized" });
    const session = await storage.validateSession(token);
    if (!session) return res.status(401).json({ message: "Invalid session" });

    try {
      const member = await storage.getMember(session.memberId);
      if (!member || member.status !== "active") return res.status(403).json({ message: "No active membership" });
      if (member.blocked) return res.status(403).json({ message: "Account blocked" });
      const { fileName } = req.body;
      if (!fileName || !ALLOWED_FILES.has(fileName)) return res.status(400).json({ message: "Invalid file" });

      const downloadToken = await storage.createSecureDownload(member.id, fileName);
      return res.json({ downloadUrl: `/api/download/${downloadToken}`, expiresIn: 300 });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/download/:token", async (req, res) => {
    try {
      const result = await storage.validateSecureDownload(req.params.token);
      if (!result) return res.status(410).json({ message: "Download link expired or already used." });
      if (!ALLOWED_FILES.has(result.fileName)) return res.status(400).json({ message: "Invalid file" });

      const member = await storage.getMember(result.memberId);
      if (!member || member.status !== "active" || member.blocked) {
        return res.status(403).json({ message: "Membership not active" });
      }

      const vipDir = path.resolve(process.cwd(), "vip-files");
      const filePath = path.resolve(vipDir, result.fileName);
      if (!filePath.startsWith(vipDir)) return res.status(400).json({ message: "Invalid file path" });
      if (!fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });

      res.setHeader("Content-Disposition", `attachment; filename="${result.fileName}"`);
      res.setHeader("Cache-Control", "no-store");
      return res.sendFile(filePath);
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/referral/:code", async (req, res) => {
    try {
      const member = await storage.getMemberByReferralCode(req.params.code);
      if (!member) return res.status(404).json({ valid: false });
      return res.json({ valid: true, telegramId: member.telegramId });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/referral-stats/:telegramId", async (req, res) => {
    try {
      const count = await storage.getReferralCount(req.params.telegramId);
      const member = await storage.getMemberByTelegramId(req.params.telegramId);
      return res.json({ referralCount: count, referralCode: member?.referralCode || null });
    } catch {
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Expiry notification cron
  const expiryNotifiedSet = new Set<string>();
  async function checkExpiringMembers() {
    try {
      const expiringMembers = await storage.getExpiringMembers(3);
      for (const member of expiringMembers) {
        if (!member.expiryDate) continue;
        const daysLeft = Math.ceil((member.expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const notifyKey3 = `${member.id}-3day`;
        const notifyKey0 = `${member.id}-0day`;

        if (daysLeft <= 3 && daysLeft > 0 && !expiryNotifiedSet.has(notifyKey3) && member.telegramChatId) {
          await sendExpiryNotification(member.telegramChatId, member.plan, daysLeft);
          expiryNotifiedSet.add(notifyKey3);
        }

        if (daysLeft <= 0 && !expiryNotifiedSet.has(notifyKey0) && member.telegramChatId) {
          await sendExpiryNotification(member.telegramChatId, member.plan, 0);
          expiryNotifiedSet.add(notifyKey0);
          await storage.markExpiryNotified(member.id);
        }
      }
    } catch {}
  }

  checkExpiringMembers();
  setInterval(checkExpiringMembers, 12 * 60 * 60 * 1000);

  // Start bot polling
  startVipBotPolling();
  checkExpiredVipUsers();
  setInterval(checkExpiredVipUsers, 6 * 60 * 60 * 1000);
}
