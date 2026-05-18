import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { z } from "zod";

// ─── VIP Member System ────────────────────────────────────────────────────────
export const members = pgTable("members", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  telegramId: text("telegram_id").notNull(),
  plan: text("plan").notNull(),
  country: text("country").notNull(),
  paymentMethod: text("payment_method").notNull(),
  screenshotUrl: text("screenshot_url"),
  status: text("status").notNull().default("pending"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  referralCode: text("referral_code").unique(),
  referredBy: text("referred_by"),
  expiryNotified: boolean("expiry_notified").default(false),
  telegramChatId: text("telegram_chat_id"),
  giftCardCode: text("gift_card_code"),
  boundDeviceId: text("bound_device_id"),
  lastLoginIp: text("last_login_ip"),
  lastLoginAt: timestamp("last_login_at"),
  blocked: boolean("blocked").default(false),
  loginKey: text("login_key").unique(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  telegramId: text("telegram_id").notNull(),
  ip: text("ip").notNull(),
  deviceId: text("device_id"),
  success: boolean("success").notNull().default(false),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const secureDownloads = pgTable("secure_downloads", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").notNull().unique(),
  memberId: integer("member_id").notNull(),
  fileName: text("file_name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
});

export const sessions = pgTable("sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").notNull().unique(),
  memberId: integer("member_id").notNull(),
  deviceId: text("device_id").notNull(),
  ip: text("ip"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const admins = pgTable("admins", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

// ─── User Auth System ─────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash"),
  telegramId: text("telegram_id"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  emailVerified: boolean("email_verified").default(false),
  emailVerifyToken: text("email_verify_token"),
  emailVerifyExpiry: timestamp("email_verify_expiry"),
  resetCode: text("reset_code"),
  resetCodeExpiry: timestamp("reset_code_expiry"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSessions = pgTable("user_sessions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  token: text("token").notNull().unique(),
  userId: integer("user_id").notNull(),
  ip: text("ip"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

// ─── VIP Bot ──────────────────────────────────────────────────────────────────
export const vipBotUsers = pgTable("vip_bot_users", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  telegramId: text("telegram_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  telegramName: text("telegram_name"),
  plan: text("plan"),
  paymentMethod: text("payment_method"),
  screenshotFileId: text("screenshot_file_id"),
  status: text("status").notNull().default("pending"),
  expiryDate: timestamp("expiry_date"),
  inviteLink: text("invite_link"),
  invitedToGroup: boolean("invited_to_group").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  approvedAt: timestamp("approved_at"),
});

// ─── Game Catalog ─────────────────────────────────────────────────────────────
export const games = pgTable("games", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  color: text("color").default("#22d3ee"),
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  gameId: integer("game_id").notNull(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  description: text("description"),
  priceUsd: text("price_usd").notNull().default("14.99"),
  durationDays: integer("duration_days").notNull().default(30),
  bannerUrl: text("banner_url"),
  videoUrl: text("video_url"),
  features: text("features"), // JSON array string
  galleryImages: text("gallery_images"), // JSON array of image URLs
  galleryVideos: text("gallery_videos"), // JSON array of video URLs
  variants: text("variants"), // JSON array of {days, price} pairs
  downloadLink: text("download_link"), // VIP file download URL for this product
  sortOrder: integer("sort_order").default(0),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Payments (NOWPayments) ───────────────────────────────────────────────────
export const payments = pgTable("payments", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  nowpaymentsId: text("nowpayments_id").unique(),
  payAddress: text("pay_address"),
  payAmount: text("pay_amount"),
  payCurrency: text("pay_currency"),
  priceAmount: text("price_amount"),
  priceCurrency: text("price_currency").default("USD"),
  durationDays: integer("duration_days"),
  status: text("status").default("waiting"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const vipMemberships = pgTable("vip_memberships", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  gameId: integer("game_id").notNull(),
  paymentId: integer("payment_id").unique(),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at"),
  telegramInviteLink: text("telegram_invite_link"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ─── Zod Schemas ─────────────────────────────────────────────────────────────
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain uppercase letter")
  .regex(/[a-z]/, "Must contain lowercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const signupSchema = z.object({
  email: z.string().email("Invalid email address").max(120),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(24, "Username too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers and underscores"),
  password: passwordSchema,
  telegramId: z.string().max(40).optional().or(z.literal("")),
});

export const signinSchema = z.object({
  identifier: z.string().min(3, "Enter your username or email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3, "Enter your email or username"),
});

export const resetPasswordSchema = z.object({
  identifier: z.string().min(3),
  code: z.string().length(6, "Code must be 6 digits"),
  password: passwordSchema,
});

export const forgotUsernameSchema = z.object({
  email: z.string().email("Invalid email"),
});

export const insertMemberSchema = z.object({
  username: z.string().nullable().optional(),
  passwordHash: z.string().nullable().optional(),
  telegramId: z.string(),
  plan: z.string(),
  country: z.string(),
  paymentMethod: z.string(),
  screenshotUrl: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  telegramChatId: z.string().nullable().optional(),
  giftCardCode: z.string().nullable().optional(),
  boundDeviceId: z.string().nullable().optional(),
  lastLoginIp: z.string().nullable().optional(),
  lastLoginAt: z.date().nullable().optional(),
  blocked: z.boolean().nullable().optional(),
  loginKey: z.string().nullable().optional(),
});

export const paymentSubmitSchema = z.object({
  telegramId: z.string().min(2),
  plan: z.enum(["30-days", "60-days"]),
  country: z.string().min(1),
  paymentMethod: z.string().min(1),
  giftCardCode: z.string().optional(),
  referralCode: z.string().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────
export type VipBotUser = typeof vipBotUsers.$inferSelect;
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof members.$inferSelect;
export type Admin = typeof admins.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Game = typeof games.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type VipMembership = typeof vipMemberships.$inferSelect;

// ─── Site Settings (key-value store for admin-managed config) ─────────────────
export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type SiteSetting = typeof siteSettings.$inferSelect;

export const newsletterSubscribers = pgTable("newsletter_subscribers", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").notNull().unique(),
  ip: text("ip"),
  source: text("source").default("home"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
