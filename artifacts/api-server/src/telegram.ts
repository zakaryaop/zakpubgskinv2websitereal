import fs from "fs";
import FormData from "form-data";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VIPBOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.VIPBOT_ADMIN_CHAT_ID;

async function sendMsg(chatId: string | number, text: string, replyMarkup?: any): Promise<boolean> {
  if (!BOT_TOKEN) { return false; }
  try {
    const body: any = { chat_id: chatId, text, parse_mode: "Markdown" };
    if (replyMarkup) body.reply_markup = replyMarkup;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) {
      const plainRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: text.replace(/[*`_\\]/g, ""), reply_markup: replyMarkup }),
      });
      const plainData = await plainRes.json();
      return plainData.ok;
    }
    return true;
  } catch {
    return false;
  }
}

export async function sendPaymentRequest(data: {
  telegramId: string;
  username: string;
  plan: string;
  country: string;
  paymentMethod: string;
  memberId: number;
  screenshotPath?: string;
  giftCardCode?: string;
}) {
  if (!BOT_TOKEN || !CHAT_ID) return false;

  const planLabel = data.plan === "60-days" ? "VIP 60 Days" : "VIP 30 Days";
  let caption = `🎮 *NEW PAYMENT REQUEST*\n\n` +
    `👤 Telegram ID: \`${data.telegramId}\`\n` +
    `📦 Plan: *${planLabel}*\n` +
    `🌍 Country: ${data.country}\n` +
    `💳 Payment: ${data.paymentMethod}\n` +
    `🆔 Order: #${data.memberId}`;
  if (data.giftCardCode) {
    caption += `\n🎁 Gift Card: \`${data.giftCardCode}\``;
  }

  const markup = JSON.stringify({
    inline_keyboard: [[
      { text: "✅ Approve", callback_data: `vipapprove_${data.telegramId}` },
      { text: "❌ Reject", callback_data: `vipreject_${data.telegramId}` },
    ]],
  });

  try {
    if (data.screenshotPath && fs.existsSync(data.screenshotPath)) {
      try {
        const form = new FormData();
        form.append("chat_id", CHAT_ID);
        form.append("photo", fs.createReadStream(data.screenshotPath));
        form.append("caption", caption);
        form.append("parse_mode", "Markdown");
        form.append("reply_markup", markup);
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
          method: "POST",
          body: form as any,
          headers: form.getHeaders(),
        });
        const text = await res.text();
        try {
          const result = JSON.parse(text);
          if (result.ok) return true;
        } catch {}
      } catch {}
    }

    const msgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: caption, parse_mode: "Markdown", reply_markup: JSON.parse(markup) }),
    });
    const msgResult = await msgRes.json();
    if (msgResult.ok) return true;

    const plainRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT_ID, text: caption.replace(/[*`_]/g, ""), reply_markup: JSON.parse(markup) }),
    });
    const plainResult = await plainRes.json();
    return plainResult.ok;
  } catch {
    return false;
  }
}

export async function notifyUser(userChatId: string | null | undefined, text: string) {
  if (userChatId) await sendMsg(userChatId, text);
}

export async function notifyAdmin(text: string) {
  if (CHAT_ID) await sendMsg(CHAT_ID, text);
}

export async function generateGroupInviteLink(userId: string): Promise<string | null> {
  const groupId = process.env.VIP_GROUP_ID;
  if (!BOT_TOKEN || !groupId) return null;
  try {
    const expireDate = Math.floor(Date.now() / 1000) + 300;
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createChatInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: groupId, member_limit: 1, expire_date: expireDate, name: `VIP-${userId}` }),
    });
    const data = await res.json();
    return data.ok ? data.result.invite_link : null;
  } catch {
    return null;
  }
}

export async function sendExpiryNotification(chatId: string, plan: string, daysLeft: number) {
  const label = plan === "60-days" ? "VIP 60 Days" : "VIP 30 Days";
  const when = daysLeft <= 0 ? "expires TODAY" : `expires in ${daysLeft} day${daysLeft > 1 ? "s" : ""}`;
  await sendMsg(chatId, `⏰ Your *${label}* ${when}!\n\nRenew on the website.`);
}

export interface BotCallbacks {
  onApprove: (memberId: number) => Promise<boolean>;
  onReject: (memberId: number) => Promise<boolean>;
  getAllMembers: () => Promise<any[]>;
  getPendingMembers: () => Promise<any[]>;
  getMember: (id: number) => Promise<any | undefined>;
  getMemberByUsername: (username: string) => Promise<any | undefined>;
  deleteMember: (id: number) => Promise<boolean>;
  addMember: (username: string, password: string, telegramId: string, plan: string) => Promise<any>;
  resetPassword: (id: number, newPassword: string) => Promise<any | undefined>;
}

let pollingActive = false;
let lastUpdateId = 0;

export function startTelegramPolling(callbacks: BotCallbacks) {
  if (pollingActive) return;
  pollingActive = true;

  function isAdmin(chatId: string | number): boolean {
    return String(chatId) === String(CHAT_ID);
  }

  async function answerCb(id: string, text: string) {
    if (!BOT_TOKEN) return;
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: id, text }),
      });
    } catch {}
  }

  async function removeButtons(chatId: string | number, messageId: number) {
    if (!BOT_TOKEN) return;
    try {
      await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
      });
    } catch {}
  }

  async function poll() {
    if (!BOT_TOKEN) return;
    try {
      const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30&allowed_updates=["callback_query","message"]`;
      const response = await fetch(url, { signal: AbortSignal.timeout(35000) });
      const data = await response.json();

      if (data.ok && data.result) {
        for (const update of data.result) {
          lastUpdateId = update.update_id;

          if (update.callback_query) {
            const cbd = update.callback_query.data;
            const cid = String(update.callback_query.message?.chat?.id);
            const mid = update.callback_query.message?.message_id;

            if (cbd.startsWith("approve_")) {
              const ok = await callbacks.onApprove(parseInt(cbd.replace("approve_", "")));
              await answerCb(update.callback_query.id, ok ? "✅ Approved!" : "⚠️ Already done");
              if (cid && mid) await removeButtons(cid, mid);
            } else if (cbd.startsWith("reject_")) {
              const ok = await callbacks.onReject(parseInt(cbd.replace("reject_", "")));
              await answerCb(update.callback_query.id, ok ? "❌ Rejected!" : "⚠️ Already done");
              if (cid && mid) await removeButtons(cid, mid);
            } else {
              await answerCb(update.callback_query.id, "⛔ Admin only");
            }
          }

          if (update.message?.text) {
            const text = update.message.text.trim();
            const chatId = String(update.message.chat.id);

            if (isAdmin(chatId)) {
              if (text === "/start" || text === "/menu" || text === "/dashboard" || text === "/panel") {
                await sendMsg(chatId, "🎮 *ZakPubgSkin Admin Panel*\n\nChoose an option:");
              }
            } else {
              await sendMsg(chatId, "👋 This bot is for admin use only.\n\nBuy VIP on the website, then login with your username & password.");
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "TimeoutError" && err.name !== "AbortError") {
        console.error("Telegram polling error:", err);
      }
    }
    if (pollingActive) setTimeout(poll, 500);
  }

  poll();
}
