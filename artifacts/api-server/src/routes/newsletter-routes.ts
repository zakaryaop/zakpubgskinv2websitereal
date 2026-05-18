import type { Express } from "express";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { newsletterSubscribers } from "@workspace/db";
import { sendNewsletterWelcome } from "../lib/email";
import { logger } from "../lib/logger";

const db = drizzle(process.env.DATABASE_URL!);

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const recent = new Map<string, number>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const last = recent.get(ip) || 0;
  if (now - last < 10_000) return true;
  recent.set(ip, now);
  if (recent.size > 5000) {
    for (const [k, v] of recent) if (now - v > 60_000) recent.delete(k);
  }
  return false;
}

export function registerNewsletterRoutes(app: Express) {
  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const ip = (req.ip || req.socket.remoteAddress || "unknown").trim();
      if (rateLimited(ip)) return res.status(429).json({ message: "Too many requests, please wait a moment." });

      const raw = String(req.body?.email || "").trim().toLowerCase();
      if (!raw || !EMAIL_RX.test(raw) || raw.length > 200) {
        return res.status(400).json({ message: "Please enter a valid email address." });
      }
      const source = String(req.body?.source || "home").slice(0, 30);

      const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, raw));
      if (existing) {
        if (!existing.active) {
          await db.update(newsletterSubscribers).set({ active: true }).where(eq(newsletterSubscribers.id, existing.id));
        }
        return res.json({ success: true, message: "You're already subscribed — thanks!", alreadySubscribed: true });
      }

      await db.insert(newsletterSubscribers).values({ email: raw, ip: ip || null, source });
      sendNewsletterWelcome(raw).catch((err) => logger.warn({ err }, "Newsletter welcome email failed"));

      return res.json({ success: true, message: "Subscribed! Check your inbox for a welcome email." });
    } catch (err) {
      logger.error({ err }, "Newsletter subscribe error");
      return res.status(500).json({ message: "Something went wrong. Please try again." });
    }
  });

  // Admin: list subscribers (basic — uses existing admin auth pattern via header, kept simple)
  app.get("/api/newsletter/subscribers", async (req, res) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) return res.status(503).json({ message: "Admin not configured" });
    const adminHeader = req.headers.authorization?.replace("Bearer ", "");
    if (adminHeader !== expected) return res.status(401).json({ message: "Unauthorized" });
    const list = await db.select().from(newsletterSubscribers);
    return res.json({ subscribers: list, count: list.length });
  });
}
