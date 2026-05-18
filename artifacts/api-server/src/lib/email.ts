import { Resend } from "resend";
import { logger } from "./logger";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@zakpubgskin.store";
const APP_NAME = "ZakPubgSkin";

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

function publicBaseUrl(): string {
  const explicit = process.env.WEBHOOK_BASE_URL || process.env.APP_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const domains = process.env.REPLIT_DOMAINS;
  if (domains) return `https://${domains.split(",")[0]?.trim()}`;
  return "https://zakpubgskin.store";
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    logger.warn("Resend not configured (missing RESEND_API_KEY)");
    return false;
  }
  try {
    const { error } = await resend.emails.send({
      from: `${APP_NAME} <${FROM_EMAIL}>`,
      to: [to],
      subject,
      html,
    });
    if (error) {
      logger.error({ err: error }, "Resend send error");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, "Email send exception");
    return false;
  }
}

function shell(title: string, inner: string): string {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#0b0b14;font-family:system-ui,-apple-system,sans-serif;color:#e5e7eb">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="display:inline-block;padding:10px 18px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#a855f7);font-weight:900;letter-spacing:2px;color:#fff;font-size:14px">${APP_NAME.toUpperCase()}</div>
    </div>
    <div style="background:#13131f;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px">
      <h1 style="margin:0 0 16px;font-size:22px;color:#fff">${title}</h1>
      ${inner}
    </div>
    <p style="text-align:center;font-size:11px;color:#64748b;margin-top:20px">Sent by ${APP_NAME} · If you didn't request this, ignore this email.</p>
  </div></body></html>`;
}

export async function sendPasswordResetEmail(to: string, code: string, identifier: string): Promise<boolean> {
  const inner = `
    <p style="margin:0 0 12px;color:#cbd5e1">Use this 6-digit code to reset your password:</p>
    <div style="margin:18px 0;text-align:center">
      <div style="display:inline-block;padding:14px 28px;border-radius:12px;background:#0b0b14;border:1px solid rgba(168,85,247,0.4);font-family:'Courier New',monospace;font-size:32px;letter-spacing:10px;color:#fff;font-weight:900">${code}</div>
    </div>
    <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Account: <strong style="color:#fff">${identifier}</strong></p>
    <p style="margin:0;font-size:13px;color:#94a3b8">This code expires in <strong>15 minutes</strong>.</p>
    <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.06)">
      <a href="${publicBaseUrl()}/reset-password?id=${encodeURIComponent(identifier)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:linear-gradient(135deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;font-weight:700;font-size:13px">Open Reset Page →</a>
    </div>`;
  return send(to, `Your ${APP_NAME} password reset code`, shell("Reset your password", inner));
}

export async function sendEmailVerification(to: string, token: string, username: string): Promise<boolean> {
  const url = `${publicBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const inner = `
    <p style="margin:0 0 12px;color:#cbd5e1">Hi <strong style="color:#fff">${username}</strong>, please confirm your email address to activate your account.</p>
    <div style="margin:22px 0;text-align:center">
      <a href="${url}" style="display:inline-block;padding:14px 26px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#a855f7);color:#fff;text-decoration:none;font-weight:900;font-size:14px;letter-spacing:1px">Verify Email Address</a>
    </div>
    <p style="margin:0;font-size:12px;color:#64748b">Or copy this link: <a href="${url}" style="color:#a78bfa;word-break:break-all">${url}</a></p>
    <p style="margin:14px 0 0;font-size:12px;color:#64748b">Link expires in 24 hours.</p>`;
  return send(to, `Verify your ${APP_NAME} email`, shell("Welcome — verify your email", inner));
}

export async function sendUsernameReminder(to: string, username: string): Promise<boolean> {
  const inner = `
    <p style="margin:0 0 12px;color:#cbd5e1">Your ${APP_NAME} username is:</p>
    <div style="margin:18px 0;text-align:center">
      <div style="display:inline-block;padding:14px 28px;border-radius:12px;background:#0b0b14;border:1px solid rgba(34,211,238,0.4);font-size:22px;color:#fff;font-weight:900">${username}</div>
    </div>
    <p style="margin:0;font-size:13px;color:#94a3b8">You can use this username to sign in.</p>`;
  return send(to, `Your ${APP_NAME} username`, shell("Username reminder", inner));
}

export async function sendNewsletterWelcome(to: string): Promise<boolean> {
  const inner = `
    <p style="margin:0 0 12px;color:#cbd5e1">Thanks for subscribing to <strong style="color:#fff">${APP_NAME}</strong>!</p>
    <p style="margin:0 0 16px;color:#cbd5e1">You'll be the first to know about:</p>
    <ul style="margin:0 0 18px;padding-left:20px;color:#cbd5e1;font-size:13px;line-height:1.7">
      <li>🎮 New VIP packages & game launches</li>
      <li>💰 Exclusive discounts & promo codes</li>
      <li>⚡ Early access to limited-time offers</li>
      <li>🔥 Updates on PUBG, Free Fire & more</li>
    </ul>
    <div style="margin:22px 0;text-align:center">
      <a href="${publicBaseUrl()}" style="display:inline-block;padding:12px 24px;border-radius:12px;background:linear-gradient(135deg,#22d3ee,#a855f7);color:#fff;text-decoration:none;font-weight:900;font-size:13px;letter-spacing:1px">Browse Games →</a>
    </div>
    <p style="margin:0;font-size:11px;color:#64748b">You can unsubscribe anytime by replying to this email.</p>`;
  return send(to, `Welcome to ${APP_NAME} — you're in!`, shell("You're subscribed!", inner));
}

export function isEmailConfigured(): boolean {
  return Boolean(RESEND_API_KEY);
}
