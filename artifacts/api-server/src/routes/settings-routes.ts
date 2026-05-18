import type { Express } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { siteSettings } from "@workspace/db";
import jwt from "jsonwebtoken";

const db = drizzle(process.env.DATABASE_URL!);

function getJwtSecret() {
  return (process.env.ADMIN_PASSWORD || "admin123") + "_jwt_zak_" + (process.env.ADMIN_USERNAME || "admin");
}

function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try { jwt.verify(authHeader.split(" ")[1], getJwtSecret()); next(); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }
}

async function ensureTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  } catch {}
}

export const CFG_MAP: Record<string, string> = {
  cfg_vipbot_token:           "VIPBOT_TOKEN",
  cfg_vipbot_admin_chat_id:   "VIPBOT_ADMIN_CHAT_ID",
  cfg_vip_group_id:           "VIP_GROUP_ID",
  cfg_nowpayments_api_key:    "NOWPAYMENTS_API_KEY",
  cfg_nowpayments_ipn_secret: "NOWPAYMENTS_IPN_SECRET",
  cfg_resend_api_key:         "RESEND_API_KEY",
  cfg_from_email:             "FROM_EMAIL",
  cfg_admin_username:         "ADMIN_USERNAME",
  cfg_admin_password:         "ADMIN_PASSWORD",
  cfg_webhook_base_url:       "WEBHOOK_BASE_URL",
};

export async function loadConfigFromDB() {
  try {
    await Promise.all(Object.entries(CFG_MAP).map(async ([dbKey, envKey]) => {
      try {
        const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, dbKey));
        if (row?.value) process.env[envKey] = row.value;
      } catch {}
    }));
  } catch {}
}

ensureTable().then(() => loadConfigFromDB()).catch(() => {});

export function registerSettingsRoutes(app: Express) {

  app.get("/api/settings/:key", async (req, res) => {
    if (req.params.key.startsWith("cfg_")) return res.status(403).json({ value: null });
    try {
      const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, req.params.key));
      return res.json({ value: row ? row.value : null });
    } catch {
      return res.json({ value: null });
    }
  });

  app.get("/api/admin/config", adminAuth, async (_req, res) => {
    try {
      const rows = await db.select().from(siteSettings);
      const result: Record<string, string> = {};
      for (const dbKey of Object.keys(CFG_MAP)) {
        const row = rows.find(r => r.key === dbKey);
        result[dbKey] = row?.value || "";
      }
      return res.json(result);
    } catch {
      return res.json({});
    }
  });

  app.put("/api/admin/settings/:key", adminAuth, async (req, res) => {
    try {
      const { value } = req.body;
      if (value === undefined) return res.status(400).json({ message: "value required" });
      const strVal = typeof value === "string" ? value : JSON.stringify(value);
      await db.execute(sql`
        INSERT INTO site_settings (key, value, updated_at)
        VALUES (${req.params.key}, ${strVal}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `);
      if (CFG_MAP[req.params.key] && strVal) {
        process.env[CFG_MAP[req.params.key]] = strVal;
      }
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Failed" });
    }
  });
}
