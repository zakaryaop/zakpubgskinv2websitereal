import { drizzle } from "drizzle-orm/node-postgres";
import { vipBotUsers, members, payments, products, vipMemberships, users } from "@workspace/db";
import { eq, desc, and, lt } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL!);

const BOT_TOKEN = process.env.VIPBOT_TOKEN;
const ADMIN_CHAT_ID = process.env.VIPBOT_ADMIN_CHAT_ID;
const VIP_GROUP_ID = process.env.VIP_GROUP_ID;

const PLANS: Record<string, { label: string; price: string; days: number }> = {
  "30days":  { label: "VIP 30 Days", price: "$14.99", days: 30 },
  "30-days": { label: "VIP 30 Days", price: "$14.99", days: 30 },
  "60days":  { label: "VIP 60 Days", price: "$24.99", days: 60 },
  "60-days": { label: "VIP 60 Days", price: "$24.99", days: 60 },
};

async function apiCall(method: string, body: Record<string, any>): Promise<any> {
  if (!BOT_TOKEN) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) return null;
    return data.result;
  } catch {
    return null;
  }
}

async function sendMsg(chatId: string | number, text: string, extra: Record<string, any> = {}): Promise<any> {
  return apiCall("sendMessage", { chat_id: chatId, text, parse_mode: "Markdown", ...extra });
}

async function generateGroupInvite(userId: string): Promise<string | null> {
  if (!VIP_GROUP_ID) return null;
  const expireDate = Math.floor(Date.now() / 1000) + 86400;
  const result = await apiCall("createChatInviteLink", {
    chat_id: VIP_GROUP_ID,
    member_limit: 1,
    expire_date: expireDate,
    name: `VIP-${userId}`,
  });
  return result?.invite_link || null;
}

export async function sendOrderAlert(data: {
  telegramId: string;
  plan: string;
  country: string;
  paymentMethod: string;
  orderId: number;
  screenshotPath?: string;
  giftCardCode?: string;
}) {
  if (!ADMIN_CHAT_ID) return false;
  const planLabel = PLANS[data.plan]?.label || data.plan;
  let text = `💰 *NEW PAYMENT REQUEST*\n\n` +
    `👤 Telegram ID: \`${data.telegramId}\`\n` +
    `📦 Plan: ${planLabel}\n` +
    `🌍 Country: ${data.country}\n` +
    `💳 Method: ${data.paymentMethod}\n` +
    `🆔 Order: #${data.orderId}`;
  if (data.giftCardCode) {
    text += `\n🎁 Gift Card: \`${data.giftCardCode}\``;
  }
  return sendMsg(ADMIN_CHAT_ID, text, {
    reply_markup: {
      inline_keyboard: [[
        { text: "✅ Approve", callback_data: `vipapprove_${data.telegramId}` },
        { text: "❌ Reject",  callback_data: `vipreject_${data.telegramId}` },
      ]],
    },
  });
}

export async function checkExpiredVipUsers() {
  if (!process.env.DATABASE_URL) return;
  try {
    const now = new Date();
    const expired = await db
      .select()
      .from(vipBotUsers)
      .where(and(eq(vipBotUsers.status, "active"), lt(vipBotUsers.expiryDate, now)));

    for (const user of expired) {
      await db.update(vipBotUsers).set({ status: "expired" }).where(eq(vipBotUsers.id, user.id));
      if (user.telegramId && ADMIN_CHAT_ID) {
        const plan = PLANS[user.plan || ""]?.label || user.plan || "VIP";
        const ref = user.telegramUsername ? `@${user.telegramUsername}` : user.telegramName || user.telegramId;
        await sendMsg(ADMIN_CHAT_ID, `⏰ Expired: ${ref} — ${plan}`);
      }
    }
  } catch {}
}

let pollingOffset = 0;
let pollingActive = false;

async function handleApprove(adminChatId: string, targetUserId: string, cbId: string, messageId: number) {
  await apiCall("answerCallbackQuery", { callback_query_id: cbId, text: "Processing..." });

  const [user] = await db.select().from(vipBotUsers).where(eq(vipBotUsers.telegramId, targetUserId));
  if (!user) {
    await sendMsg(adminChatId, "❌ User not found.");
    return;
  }

  const plan = user.plan || "30days";
  const planInfo = PLANS[plan] || PLANS["30days"];
  const expiryDate = new Date(Date.now() + planInfo.days * 86400000);
  const inviteLink = await generateGroupInvite(targetUserId);

  await db.update(vipBotUsers).set({
    status: "active",
    expiryDate,
    inviteLink: inviteLink || undefined,
    invitedToGroup: !!inviteLink,
    approvedAt: new Date(),
  }).where(eq(vipBotUsers.telegramId, targetUserId));

  await db.update(members).set({ status: "active", expiryDate }).where(eq(members.telegramId, targetUserId)).catch(() => {});

  const expStr = expiryDate.toLocaleDateString("en-GB");
  const userRef = user.telegramUsername ? `@${user.telegramUsername}` : user.telegramName || targetUserId;

  let notified = false;
  if (inviteLink) {
    const sent = await apiCall("sendMessage", {
      chat_id: targetUserId,
      parse_mode: "HTML",
      text: `🎉 <b>Welcome to ZakPubgSkin VIP!</b>\n\n✅ <b>Your VIP is Active</b>\n📦 Plan: <b>${planInfo.label}</b>\n📅 Valid Until: <b>${expStr}</b>\n\n🔗 <b>Join Your Exclusive VIP Group:</b>\n${inviteLink}\n\n⚠️ <b>Important:</b> This link is for you only.\n• Valid for 24 hours\n• 1 use only — do not share\n\n🎮 <b>Enjoy your premium PUBG experience!</b>`,
    });
    notified = !!sent;
  }

  if (!notified) {
    const cleanId = targetUserId.replace(/^@/, "");
    const deepLink = `https://t.me/Zaksite_bot?start=vip_${cleanId}`;
    await sendMsg(adminChatId,
      `⚠️ *${userRef}* hasn't started the bot yet.\n\n📲 *Send them this magic link:*\n${deepLink}\n\n` +
      (inviteLink ? `🔗 Or share the invite link directly:\n${inviteLink}` : `❌ Could not generate invite link.`)
    );
  }

  const doneText = `✅ APPROVED — ${userRef}\n📦 ${planInfo.label} until ${expStr}`;
  const edited = await apiCall("editMessageCaption", {
    chat_id: adminChatId, message_id: messageId, caption: doneText, reply_markup: { inline_keyboard: [] },
  });
  if (!edited) {
    await apiCall("editMessageText", {
      chat_id: adminChatId, message_id: messageId, text: doneText, reply_markup: { inline_keyboard: [] },
    });
  }

  await sendMsg(adminChatId, `✅ *Approved:* ${userRef} — ${planInfo.label} until *${expStr}*`);
}

async function handleReject(adminChatId: string, targetUserId: string, cbId: string, messageId: number) {
  await apiCall("answerCallbackQuery", { callback_query_id: cbId, text: "Rejected." });
  await db.update(vipBotUsers).set({ status: "rejected" }).where(eq(vipBotUsers.telegramId, targetUserId));
  const [user] = await db.select().from(vipBotUsers).where(eq(vipBotUsers.telegramId, targetUserId));
  const userRef = user?.telegramUsername ? `@${user.telegramUsername}` : user?.telegramName || targetUserId;

  await sendMsg(targetUserId,
    `❌ *Payment Rejected*\n\nYour payment screenshot could not be verified.\n\nPlease try again with a clear screenshot or contact @zakarya_op for help.`,
    { reply_markup: { inline_keyboard: [[{ text: "🔄 Try Again", callback_data: "buy" }]] } }
  );

  const rejectText = `❌ REJECTED — ${userRef}`;
  const edited = await apiCall("editMessageCaption", {
    chat_id: adminChatId, message_id: messageId, caption: rejectText, reply_markup: { inline_keyboard: [] },
  });
  if (!edited) {
    await apiCall("editMessageText", {
      chat_id: adminChatId, message_id: messageId, text: rejectText, reply_markup: { inline_keyboard: [] },
    });
  }

  await sendMsg(adminChatId, `❌ Rejected: ${userRef}`);
}

async function handleManualApprove(adminChatId: string, paymentId: number, cbId: string, messageId: number) {
  await apiCall("answerCallbackQuery", { callback_query_id: cbId, text: "✅ Approving..." });
  try {
    const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId));
    if (!payment) { await apiCall("answerCallbackQuery", { callback_query_id: cbId, text: "⚠️ Payment not found" }); return; }

    await db.update(payments).set({ status: "finished" }).where(eq(payments.id, paymentId));

    const [product] = await db.select().from(products).where(eq(products.id, payment.productId));
    const paidDays = payment.durationDays && payment.durationDays > 0 ? payment.durationDays : (product?.durationDays ?? 30);
    const expiresAt = new Date(Date.now() + paidDays * 86400000);

    let inviteLink: string | null = null;
    if (VIP_GROUP_ID) {
      const expireDate = Math.floor(Date.now() / 1000) + 86400;
      const r = await apiCall("createChatInviteLink", { chat_id: VIP_GROUP_ID, member_limit: 1, expire_date: expireDate, name: `VIP-${payment.userId}` });
      inviteLink = r?.invite_link || null;
    }

    const [existing] = await db.select().from(vipMemberships).where(eq(vipMemberships.paymentId, paymentId));
    if (existing) {
      await db.update(vipMemberships).set({ status: "active", expiresAt, telegramInviteLink: inviteLink || undefined }).where(eq(vipMemberships.id, existing.id));
    } else {
      await db.insert(vipMemberships).values({
        userId: payment.userId, productId: payment.productId, gameId: product?.gameId ?? 0,
        paymentId, status: "active", expiresAt, telegramInviteLink: inviteLink || undefined,
      });
    }

    const [user] = await db.select().from(users).where(eq(users.id, payment.userId));
    if (user?.telegramId && inviteLink) {
      await sendMsg(user.telegramId,
        `🎉 *Your VIP is Active!*\n\n✅ Payment approved\n📦 ${product?.title || "VIP"}\n📅 Valid for ${paidDays} days\n\n🔗 *Join VIP Group:*\n${inviteLink}\n\n_Link expires in 24h — 1 use only_`
      );
    }

    const doneText = `✅ APPROVED — Payment #${paymentId}\n📦 ${product?.title || "VIP"} · ${paidDays}d`;
    const edited = await apiCall("editMessageCaption", { chat_id: adminChatId, message_id: messageId, caption: doneText, reply_markup: { inline_keyboard: [] } });
    if (!edited) await apiCall("editMessageText", { chat_id: adminChatId, message_id: messageId, text: doneText, reply_markup: { inline_keyboard: [] } });
  } catch (err) { console.error("handleManualApprove error:", err); }
}

async function handleManualReject(adminChatId: string, paymentId: number, cbId: string, messageId: number) {
  await apiCall("answerCallbackQuery", { callback_query_id: cbId, text: "❌ Rejected" });
  try {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
    const rejectText = `❌ REJECTED — Payment #${paymentId}`;
    const edited = await apiCall("editMessageCaption", { chat_id: adminChatId, message_id: messageId, caption: rejectText, reply_markup: { inline_keyboard: [] } });
    if (!edited) await apiCall("editMessageText", { chat_id: adminChatId, message_id: messageId, text: rejectText, reply_markup: { inline_keyboard: [] } });
  } catch (err) { console.error("handleManualReject error:", err); }
}

export function startVipBotPolling() {
  if (pollingActive || !BOT_TOKEN) return;
  pollingActive = true;

  async function poll() {
    if (!BOT_TOKEN) return;
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${pollingOffset + 1}&timeout=30&allowed_updates=["callback_query","message"]`;
      const response = await fetch(url, { signal: AbortSignal.timeout(35000) });
      const data = await response.json();

      if (data.ok && data.result) {
        for (const update of data.result) {
          pollingOffset = update.update_id;

          if (update.callback_query) {
            const cbd = update.callback_query.data as string;
            const cid = String(update.callback_query.message?.chat?.id);
            const mid = update.callback_query.message?.message_id;

            if (cbd.startsWith("vipapprove_")) {
              const targetId = cbd.replace("vipapprove_", "");
              await handleApprove(cid, targetId, update.callback_query.id, mid);
            } else if (cbd.startsWith("vipreject_")) {
              const targetId = cbd.replace("vipreject_", "");
              await handleReject(cid, targetId, update.callback_query.id, mid);
            } else if (cbd.startsWith("approve_")) {
              const paymentId = parseInt(cbd.replace("approve_", ""));
              if (paymentId) await handleManualApprove(cid, paymentId, update.callback_query.id, mid);
            } else if (cbd.startsWith("reject_")) {
              const paymentId = parseInt(cbd.replace("reject_", ""));
              if (paymentId) await handleManualReject(cid, paymentId, update.callback_query.id, mid);
            } else {
              await apiCall("answerCallbackQuery", { callback_query_id: update.callback_query.id, text: "" });
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "TimeoutError" && err.name !== "AbortError") {
        console.error("VipBot polling error:", err);
      }
    }
    if (pollingActive) setTimeout(poll, 500);
  }

  poll();
  console.log("VIP bot polling started");
}
