import type { Express } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { payments, products, games, vipMemberships, users } from "@workspace/db";
import crypto from "crypto";
import jwt from "jsonwebtoken";

const db = drizzle(process.env.DATABASE_URL!);
const JWT_SECRET = process.env.ADMIN_PASSWORD + "_jwt_zak_" + process.env.ADMIN_USERNAME;

// Live config readers — read from process.env each time so DB-loaded values are picked up
function nowKey()  { return process.env.NOWPAYMENTS_API_KEY || ""; }
function nowIpn()  { return process.env.NOWPAYMENTS_IPN_SECRET || ""; }
function botTok()  { return process.env.VIPBOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || ""; }
function vipGrp()  { return process.env.VIP_GROUP_ID || ""; }

function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try { jwt.verify(authHeader.split(" ")[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }
}

async function getUserAuth(req: any): Promise<number | null> {
  const token = (req.headers["x-auth-token"] as string) ||
    (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : null);
  if (!token) return null;
  try {
    const { userSessions } = await import("@workspace/db");
    const { and, gt } = await import("drizzle-orm");
    const [row] = await db.select().from(userSessions)
      .where(and(eq(userSessions.token, token), gt(userSessions.expiresAt, new Date())));
    return row?.userId ?? null;
  } catch { return null; }
}

async function generateGroupInvite(userId: string): Promise<string | null> {
  if (!vipGrp() || !botTok()) return null;
  try {
    const expireDate = Math.floor(Date.now() / 1000) + 86400;
    const res = await fetch(`https://api.telegram.org/bot${botTok()}/createChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: vipGrp(), member_limit: 1, expire_date: expireDate, name: `VIP-${userId}` }),
    });
    const data = await res.json();
    return data.ok ? data.result.invite_link : null;
  } catch { return null; }
}

async function sendTelegramMsg(chatId: string, text: string) {
  if (!botTok()) return;
  try {
    await fetch(`https://api.telegram.org/bot${botTok()}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
    });
  } catch {}
}

async function sendTelegramPhoto(chatId: string, photoBuffer: Buffer, caption: string, replyMarkup: object) {
  if (!botTok()) return;
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", new Blob([new Uint8Array(photoBuffer)], { type: "image/jpeg" }), "screenshot.jpg");
    form.append("caption", caption.slice(0, 1024));
    form.append("parse_mode", "Markdown");
    form.append("reply_markup", JSON.stringify(replyMarkup));
    await fetch(`https://api.telegram.org/bot${botTok()}/sendPhoto`, { method: "POST", body: form });
  } catch {}
}

// Clear any existing webhook so long-polling in vipbot.ts works cleanly
(async () => {
  if (!botTok()) return;
  try {
    await fetch(`https://api.telegram.org/bot${botTok()}/deleteWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ drop_pending_updates: false }),
    });
  } catch {}
})();

async function activateVip(paymentId: number) {
  try {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) return;
    const [product] = await db.select().from(products).where(eq(products.id, payment.productId));
    if (!product) return;

    const paidDays = payment.durationDays && payment.durationDays > 0
      ? payment.durationDays
      : product.durationDays;
    const expiresAt = new Date(Date.now() + paidDays * 86400000);
    const inviteLink = await generateGroupInvite(String(payment.userId));

    const [membership] = await db.select().from(vipMemberships).where(eq(vipMemberships.paymentId, paymentId));
    if (membership) {
      await db.update(vipMemberships).set({
        status: "active",
        expiresAt,
        telegramInviteLink: inviteLink || undefined,
      }).where(eq(vipMemberships.id, membership.id));
    } else {
      await db.insert(vipMemberships).values({
        userId: payment.userId,
        productId: payment.productId,
        gameId: product.gameId,
        paymentId,
        status: "active",
        expiresAt,
        telegramInviteLink: inviteLink || undefined,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payment.userId));
    if (user?.telegramId && inviteLink) {
      await sendTelegramMsg(user.telegramId,
        `🎉 *Your VIP is Active!*\n\n✅ Payment confirmed\n📦 ${product.title}\n📅 Valid for ${paidDays} days\n\n🔗 *Join VIP Group:*\n${inviteLink}\n\n_Link expires in 24h — 1 use only_`
      );
    }

    console.log(`VIP activated for user ${payment.userId}, payment ${paymentId}`);
  } catch (err) {
    console.error("VIP activation error:", err);
  }
}

export function registerPaymentsRoutes(app: Express) {

  // ── Min amounts for all supported coins (USD equivalent) ─────────────────
  app.get("/api/payments/min-amounts", async (_req, res) => {
    const CURRENCIES = ["usdttrc20","btc","bnbbsc","usdterc20","trx","ltc","eth","xmr","doge"];
    if (!nowKey()) return res.json({ mins: {} });
    try {
      const results = await Promise.allSettled(
        CURRENCIES.map(async (cur) => {
          const r = await fetch(
            `https://api.nowpayments.io/v1/min-amount?currency_from=usd&currency_to=${cur}&fiat_equivalent=usd`,
            { headers: { "x-api-key": nowKey() } }
          );
          if (!r.ok) return { cur, min: 0 };
          const d = await r.json();
          const minUsd = parseFloat(d.fiat_equivalent ?? d.min_amount ?? "0");
          return { cur, min: isNaN(minUsd) ? 0 : minUsd };
        })
      );
      const mins: Record<string, number> = {};
      for (const r of results) {
        if (r.status === "fulfilled") mins[r.value.cur] = r.value.min;
      }
      return res.json({ mins });
    } catch {
      return res.json({ mins: {} });
    }
  });

  // ── Create payment invoice ────────────────────────────────────────────────
  app.post("/api/payments/create", async (req, res) => {
    try {
      const userId = await getUserAuth(req);
      if (!userId) return res.status(401).json({ message: "Login required" });

      const { productId, payCurrency, durationDays: reqDays, priceUsd: reqPrice } = req.body;
      if (!productId) return res.status(400).json({ message: "productId required" });

      const [product] = await db.select().from(products).where(eq(products.id, parseInt(productId)));
      if (!product || !product.active) return res.status(404).json({ message: "Product not found" });

      let finalPrice = String(product.priceUsd);
      let finalDays = product.durationDays;
      if (reqDays || reqPrice) {
        let tiers: Array<{ days: number; price: string }> = [];
        try {
          const parsed = JSON.parse(product.variants || "[]");
          if (Array.isArray(parsed)) {
            tiers = parsed
              .map((v: any) => ({ days: parseInt(String(v.days)) || 0, price: String(v.price ?? "") }))
              .filter((v) => v.days > 0 && v.price.length > 0);
          }
        } catch {}
        const wantDays = parseInt(String(reqDays)) || 0;
        const match = tiers.find((t) => t.days === wantDays);
        if (match) {
          finalPrice = match.price;
          finalDays = match.days;
        }
      }

      if (!nowKey()) {
        return res.status(503).json({ message: "Payment system not configured. Please add NOWPAYMENTS_API_KEY." });
      }

      const currency = payCurrency || "usdttrc20";

      const nowRes = await fetch("https://api.nowpayments.io/v1/payment", {
        method: "POST",
        headers: {
          "x-api-key": nowKey(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          price_amount: parseFloat(finalPrice),
          price_currency: "usd",
          pay_currency: currency,
          ipn_callback_url: `${process.env.WEBHOOK_BASE_URL || "https://zakpubgskin.store"}/api/payments/webhook`,
          order_description: `VIP: ${product.title}`,
          is_fixed_rate: false,
          is_fee_paid_by_user: false,
        }),
      });

      if (!nowRes.ok) {
        const errText = await nowRes.text();
        console.error("NOWPayments error:", errText);
        try {
          const errJson = JSON.parse(errText);
          if (errJson?.code === "AMOUNT_MINIMAL_ERROR" || errText.includes("AMOUNT_MINIMAL")) {
            const coinLabel = currency.toUpperCase().replace("TRC20","TRC-20").replace("BSC","BSC");
            return res.status(400).json({
              message: `Amount too low for ${coinLabel}. Please choose a higher-value plan or try a different coin (e.g. TRX or LTC).`,
              code: "AMOUNT_TOO_LOW",
            });
          }
        } catch {}
        return res.status(502).json({ message: "Payment provider error. Please try again." });
      }

      const nowData = await nowRes.json();

      const [payment] = await db.insert(payments).values({
        userId,
        productId: product.id,
        nowpaymentsId: String(nowData.payment_id),
        payAddress: nowData.pay_address,
        payAmount: String(nowData.pay_amount),
        payCurrency: nowData.pay_currency,
        priceAmount: String(finalPrice),
        priceCurrency: "USD",
        durationDays: finalDays,
        status: nowData.payment_status || "waiting",
      }).returning();

      await db.insert(vipMemberships).values({
        userId,
        productId: product.id,
        gameId: product.gameId,
        paymentId: payment.id,
        status: "pending",
      }).onConflictDoNothing();

      return res.json({
        paymentId: payment.id,
        nowpaymentsId: nowData.payment_id,
        payAddress: nowData.pay_address,
        payAmount: nowData.pay_amount,
        payCurrency: nowData.pay_currency,
        priceAmount: finalPrice,
        durationDays: finalDays,
        status: nowData.payment_status,
        expiresAt: nowData.expiration_estimate_date,
      });
    } catch (err) {
      console.error("Create payment error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ── Check payment status ──────────────────────────────────────────────────
  app.get("/api/payments/:id/status", async (req, res) => {
    try {
      const userId = await getUserAuth(req);
      if (!userId) return res.status(401).json({ message: "Login required" });

      const paymentId = parseInt(req.params.id);
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      if (!payment || payment.userId !== userId) return res.status(404).json({ message: "Payment not found" });

      if (nowKey() && payment.nowpaymentsId && !["finished", "failed", "expired"].includes(payment.status || "")) {
        const nowRes = await fetch(`https://api.nowpayments.io/v1/payment/${payment.nowpaymentsId}`, {
          headers: { "x-api-key": nowKey() },
        });
        if (nowRes.ok) {
          const nowData = await nowRes.json();
          if (nowData.payment_status !== payment.status) {
            await db.update(payments).set({ status: nowData.payment_status }).where(eq(payments.id, payment.id));
            payment.status = nowData.payment_status;

            if (["confirmed", "finished"].includes(nowData.payment_status)) {
              await activateVip(payment.id);
            }
          }
        }
      }

      const [membership] = await db.select().from(vipMemberships).where(eq(vipMemberships.paymentId, paymentId));

      return res.json({
        status: payment.status,
        payAddress: payment.payAddress,
        payAmount: payment.payAmount,
        payCurrency: payment.payCurrency,
        priceAmount: payment.priceAmount,
        inviteLink: membership?.telegramInviteLink || null,
        expiresAt: membership?.expiresAt || null,
        membershipStatus: membership?.status || null,
      });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  // ── NOWPayments webhook ───────────────────────────────────────────────────
  app.post("/api/payments/webhook", async (req, res) => {
    try {
      if (nowIpn()) {
        const hmac = crypto.createHmac("sha512", nowIpn());
        const sorted = JSON.parse(JSON.stringify(req.body), (_, v) =>
          v && typeof v === "object" && !Array.isArray(v)
            ? Object.keys(v).sort().reduce((r: any, k) => { r[k] = v[k]; return r; }, {})
            : v
        );
        hmac.update(JSON.stringify(sorted));
        const signature = hmac.digest("hex");
        if (signature !== req.headers["x-nowpayments-sig"]) {
          return res.status(401).json({ message: "Invalid signature" });
        }
      }

      const { payment_id, payment_status } = req.body;
      if (!payment_id) return res.status(400).json({ message: "Missing payment_id" });

      const [payment] = await db.select().from(payments).where(eq(payments.nowpaymentsId, String(payment_id)));
      if (!payment) return res.status(404).json({ message: "Payment not found" });

      await db.update(payments).set({ status: payment_status }).where(eq(payments.id, payment.id));

      if (["confirmed", "finished"].includes(payment_status)) {
        await activateVip(payment.id);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("Webhook error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  });

  // ── User memberships ──────────────────────────────────────────────────────
  app.get("/api/my/memberships", async (req, res) => {
    try {
      const userId = await getUserAuth(req);
      if (!userId) return res.status(401).json({ message: "Login required" });
      const rows = await db.select().from(vipMemberships).where(eq(vipMemberships.userId, userId));
      const enriched = await Promise.all(rows.map(async m => {
        let productTitle: string | null = null;
        let durationDays: number | null = null;
        let downloadLink: string | null = null;
        try {
          const [pay] = await db.select().from(payments).where(eq(payments.id, m.paymentId));
          if (pay) durationDays = pay.durationDays ?? null;
          const [prod] = await db.select().from(products).where(eq(products.id, m.productId));
          if (prod) { productTitle = prod.title ?? null; downloadLink = prod.downloadLink ?? null; }
        } catch {}
        return { ...m, productTitle, durationDays, downloadLink };
      }));
      return res.json({ memberships: enriched });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  // ── Admin: view payments ──────────────────────────────────────────────────
  app.get("/api/admin/payments", adminAuth, async (_req, res) => {
    try {
      const list = await db.select().from(payments).orderBy();
      return res.json({ payments: list });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  // ── Telegram callback webhook (inline Approve / Reject buttons) ───────────
  app.post("/api/telegram/webhook", async (req, res) => {
    res.json({ ok: true });
    try {
      const cq = req.body?.callback_query;
      if (!cq) return;
      const [action, idStr] = (cq.data || "").split("_");
      const paymentId = parseInt(idStr);
      if (!paymentId || !["approve", "reject"].includes(action)) return;

      if (action === "approve") {
        await db.update(payments).set({ status: "finished" }).where(eq(payments.id, paymentId));
        await activateVip(paymentId);
      } else {
        await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
      }

      const resultText = action === "approve" ? "✅ VIP Activated!" : "❌ Rejected";
      if (botTok()) {
        await fetch(`https://api.telegram.org/bot${botTok()}/answerCallbackQuery`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callback_query_id: cq.id, text: resultText, show_alert: false }),
        });
        if (cq.message?.chat?.id && cq.message?.message_id) {
          await fetch(`https://api.telegram.org/bot${botTok()}/editMessageCaption`, {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: cq.message.chat.id,
              message_id: cq.message.message_id,
              caption: `${cq.message.caption || ""}\n\n${resultText}`,
              parse_mode: "Markdown",
              reply_markup: JSON.stringify({ inline_keyboard: [] }),
            }),
          }).catch(() => {});
        }
      }
    } catch (err) { console.error("Telegram webhook error:", err); }
  });

  // ── Manual payment status polling ─────────────────────────────────────────
  app.get("/api/payments/manual/:id/status", async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
      if (!payment) return res.status(404).json({ message: "Not found" });
      let inviteLink: string | null = null;
      if (payment.status === "finished") {
        const [vip] = await db.select().from(vipMemberships).where(eq(vipMemberships.paymentId, paymentId));
        inviteLink = vip?.telegramInviteLink ?? null;
      }
      return res.json({ status: payment.status, inviteLink });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Server error" });
    }
  });

  // ── Manual payment — create ───────────────────────────────────────────────
  app.post("/api/payments/manual/create", async (req, res) => {
    try {
      const userId = await getUserAuth(req);
      const { productId, methodId, senderName, senderPhone, txReference, screenshotBase64, durationDays, priceUsd } = req.body;
      if (!productId || !txReference) return res.status(400).json({ message: "productId and txReference are required" });

      const [product] = await db.select().from(products).where(eq(products.id, Number(productId)));
      if (!product) return res.status(404).json({ message: "Product not found" });

      const priceFinal = priceUsd ?? product.priceUsd ?? "0";
      const daysFinal  = durationDays ?? product.durationDays ?? 30;
      const notesJson  = JSON.stringify({ methodId, senderName, senderPhone, txReference });

      const [payment] = await db.insert(payments).values({
        userId:        userId ?? 0,
        productId:     Number(productId),
        nowpaymentsId: `manual_${Date.now()}`,
        payCurrency:   `pk_${methodId || "manual"}`,
        payAmount:     priceFinal,
        priceAmount:   priceFinal,
        priceCurrency: "usd",
        status:        "manual_pending",
        durationDays:  Number(daysFinal),
        payAddress:    txReference,
        notes:         notesJson,
      }).returning();

      const adminChatId = process.env.VIPBOT_ADMIN_CHAT_ID;
      if (adminChatId && botTok()) {
        const methodLabel = methodId === "jazz" ? "JazzCash"
          : methodId === "easypaisa" ? "Easypaisa"
          : methodId === "nayapay"   ? "NayaPay"
          : methodId === "meezan"    ? "Meezan Bank"
          : methodId === "binance"   ? "Binance Pay"
          : "Manual";

        const caption = `🇵🇰 *New Manual Payment*\n\n` +
          `💳 *Method:* ${methodLabel}\n` +
          `✈️ *TG Username:* @${senderName || "unknown"}\n` +
          `📦 *Product:* ${product.title}\n` +
          `💵 *Amount:* $${priceFinal}\n` +
          `🔖 *TX Ref:* \`${txReference}\`\n` +
          `🆔 *Payment ID:* #${payment.id}`;

        const replyMarkup = {
          inline_keyboard: [[
            { text: "✅ Approve", callback_data: `approve_${payment.id}` },
            { text: "❌ Reject",  callback_data: `reject_${payment.id}`  },
          ]],
        };

        if (screenshotBase64) {
          const base64Data = screenshotBase64.replace(/^data:image\/\w+;base64,/, "");
          const imgBuffer  = Buffer.from(base64Data, "base64");
          await sendTelegramPhoto(adminChatId, imgBuffer, caption, replyMarkup);
        } else {
          await sendTelegramMsg(adminChatId, caption + "\n\n_(No screenshot)_");
        }
      }

      return res.json({ ok: true, paymentId: payment.id });
    } catch (err: any) {
      console.error("Manual payment error:", err);
      return res.status(500).json({ message: err?.message || "Server error" });
    }
  });

  // ── Admin: approve manual payment ─────────────────────────────────────────
  app.post("/api/admin/payments/manual/:id/approve", adminAuth, async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      await db.update(payments).set({ status: "finished" }).where(eq(payments.id, paymentId));
      await activateVip(paymentId);
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Server error" });
    }
  });

  // ── Admin: reject manual payment ──────────────────────────────────────────
  app.post("/api/admin/payments/manual/:id/reject", adminAuth, async (req, res) => {
    try {
      const paymentId = Number(req.params.id);
      await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({ message: err?.message || "Server error" });
    }
  });
}
