import { drizzle } from "drizzle-orm/node-postgres";
import { eq, or, desc, and, gte, lte, count } from "drizzle-orm";
import {
  members,
  admins,
  loginAttempts,
  secureDownloads,
  sessions,
  type InsertMember,
  type Member,
  type Admin,
} from "@workspace/db";
import crypto from "crypto";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const db = drizzle(process.env.DATABASE_URL);

function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function generateLoginKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let key = "VIP-";
  for (let i = 0; i < 4; i++) {
    if (i > 0) key += "-";
    for (let j = 0; j < 4; j++) {
      key += chars[Math.floor(Math.random() * chars.length)];
    }
  }
  return key;
}

export interface IStorage {
  createMember(data: InsertMember): Promise<Member>;
  getMember(id: number): Promise<Member | undefined>;
  getMemberByTelegramId(telegramId: string): Promise<Member | undefined>;
  getActiveMemberByTelegramId(telegramId: string): Promise<Member | undefined>;
  getAllPendingMembers(): Promise<Member[]>;
  getAllActiveMembers(): Promise<Member[]>;
  getAllMembers(): Promise<Member[]>;
  approveMember(id: number): Promise<Member | undefined>;
  rejectMember(id: number): Promise<Member | undefined>;
  getAdmin(username: string): Promise<Admin | undefined>;
  createAdmin(username: string, password: string): Promise<Admin>;
  getMemberByReferralCode(code: string): Promise<Member | undefined>;
  getReferralCount(telegramId: string): Promise<number>;
  getExpiringMembers(withinDays: number): Promise<Member[]>;
  markExpiryNotified(id: number): Promise<void>;
  getMemberByUsername(username: string): Promise<Member | undefined>;
  deleteMember(id: number): Promise<boolean>;
  updateMemberPassword(id: number, passwordHash: string): Promise<Member | undefined>;
  setLoginKey(id: number, loginKey: string): Promise<Member | undefined>;
  getMemberByLoginKey(loginKey: string): Promise<Member | undefined>;
  getMemberByTelegramChatId(chatId: string): Promise<Member | undefined>;
  setTelegramChatId(telegramId: string, chatId: string): Promise<void>;
  createSession(memberId: number, deviceId: string, ip: string): Promise<string>;
  validateSession(token: string): Promise<{ memberId: number; deviceId: string } | null>;
  deleteSession(token: string): Promise<void>;
  deleteSessionsByMemberId(memberId: number): Promise<void>;
  cleanupExpiredSessions(): Promise<void>;
  bindDevice(memberId: number, deviceId: string, ip: string): Promise<void>;
  blockMember(memberId: number): Promise<void>;
  unblockMember(memberId: number): Promise<void>;
  logLoginAttempt(telegramId: string, ip: string, deviceId: string | null, success: boolean, reason?: string): Promise<void>;
  getRecentFailedAttempts(telegramId: string, withinMinutes: number): Promise<number>;
  getDistinctLoginIPs(telegramId: string, withinHours: number): Promise<string[]>;
  createSecureDownload(memberId: number, fileName: string): Promise<string>;
  validateSecureDownload(token: string): Promise<{ memberId: number; fileName: string } | null>;
}

export class DatabaseStorage implements IStorage {
  async createMember(data: InsertMember): Promise<Member> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const referralCode = generateReferralCode();
        const [member] = await db.insert(members).values({ ...data, referralCode }).returning();
        return member;
      } catch (err: any) {
        if (err?.code === "23505" && err?.constraint?.includes("referral") && attempt < 4) {
          continue;
        }
        throw err;
      }
    }
    throw new Error("Failed to generate unique referral code after 5 attempts");
  }

  async getMember(id: number): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.id, id));
    return member;
  }

  async getMemberByTelegramId(telegramId: string): Promise<Member | undefined> {
    const results = await db
      .select()
      .from(members)
      .where(eq(members.telegramId, telegramId))
      .orderBy(desc(members.createdAt));
    const active = results.find((m) => m.status === "active");
    if (active) return active;
    const pending = results.find((m) => m.status === "pending");
    if (pending) return pending;
    return results[0];
  }

  async getActiveMemberByTelegramId(telegramId: string): Promise<Member | undefined> {
    const results = await db
      .select()
      .from(members)
      .where(eq(members.telegramId, telegramId));
    return results.find((m) => m.status === "active" || m.status === "pending");
  }

  async getAllPendingMembers(): Promise<Member[]> {
    return db.select().from(members).where(eq(members.status, "pending")).orderBy(desc(members.createdAt));
  }

  async getAllActiveMembers(): Promise<Member[]> {
    return db.select().from(members).where(eq(members.status, "active")).orderBy(desc(members.createdAt));
  }

  async getAllMembers(): Promise<Member[]> {
    return db.select().from(members).orderBy(desc(members.createdAt));
  }

  async approveMember(id: number): Promise<Member | undefined> {
    const [existing] = await db.select().from(members).where(eq(members.id, id));
    if (!existing) return undefined;

    const days = existing.plan === "60-days" ? 60 : 30;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    const loginKey = generateLoginKey();
    const [updated] = await db
      .update(members)
      .set({ status: "active", expiryDate, loginKey })
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async rejectMember(id: number): Promise<Member | undefined> {
    const [updated] = await db
      .update(members)
      .set({ status: "rejected" })
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async getAdmin(username: string): Promise<Admin | undefined> {
    const [admin] = await db.select().from(admins).where(eq(admins.username, username));
    return admin;
  }

  async createAdmin(username: string, password: string): Promise<Admin> {
    const [admin] = await db.insert(admins).values({ username, password }).returning();
    return admin;
  }

  async getMemberByReferralCode(code: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.referralCode, code));
    return member;
  }

  async getReferralCount(telegramId: string): Promise<number> {
    const results = await db
      .select()
      .from(members)
      .where(eq(members.referredBy, telegramId));
    return results.length;
  }

  async getExpiringMembers(withinDays: number): Promise<Member[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + withinDays);

    return db
      .select()
      .from(members)
      .where(
        and(
          eq(members.status, "active"),
          eq(members.expiryNotified, false),
          gte(members.expiryDate, yesterday),
          lte(members.expiryDate, futureDate)
        )
      );
  }

  async markExpiryNotified(id: number): Promise<void> {
    await db.update(members).set({ expiryNotified: true }).where(eq(members.id, id));
  }

  async getMemberByUsername(username: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.username, username));
    return member;
  }

  async deleteMember(id: number): Promise<boolean> {
    await db.delete(sessions).where(eq(sessions.memberId, id));
    const result = await db.delete(members).where(eq(members.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async updateMemberPassword(id: number, passwordHash: string): Promise<Member | undefined> {
    const [updated] = await db
      .update(members)
      .set({ passwordHash })
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async setLoginKey(id: number, loginKey: string): Promise<Member | undefined> {
    const [updated] = await db
      .update(members)
      .set({ loginKey })
      .where(eq(members.id, id))
      .returning();
    return updated;
  }

  async getMemberByLoginKey(loginKey: string): Promise<Member | undefined> {
    const [member] = await db.select().from(members).where(eq(members.loginKey, loginKey));
    return member;
  }

  async getMemberByTelegramChatId(chatId: string): Promise<Member | undefined> {
    const results = await db
      .select()
      .from(members)
      .where(eq(members.telegramChatId, chatId))
      .orderBy(desc(members.createdAt));
    const active = results.find((m) => m.status === "active");
    if (active) return active;
    const pending = results.find((m) => m.status === "pending");
    if (pending) return pending;
    return results[0];
  }

  async setTelegramChatId(telegramId: string, chatId: string): Promise<void> {
    await db
      .update(members)
      .set({ telegramChatId: chatId })
      .where(eq(members.telegramId, telegramId));
  }

  async bindDevice(memberId: number, deviceId: string, ip: string): Promise<void> {
    await db.update(members).set({
      boundDeviceId: deviceId,
      lastLoginIp: ip,
      lastLoginAt: new Date(),
    }).where(eq(members.id, memberId));
  }

  async blockMember(memberId: number): Promise<void> {
    await db.update(members).set({ blocked: true }).where(eq(members.id, memberId));
  }

  async unblockMember(memberId: number): Promise<void> {
    await db.update(members).set({ blocked: false }).where(eq(members.id, memberId));
  }

  async logLoginAttempt(telegramId: string, ip: string, deviceId: string | null, success: boolean, reason?: string): Promise<void> {
    await db.insert(loginAttempts).values({ telegramId, ip, deviceId, success, reason });
  }

  async getRecentFailedAttempts(telegramId: string, withinMinutes: number): Promise<number> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    const results = await db.select({ cnt: count() }).from(loginAttempts).where(
      and(
        eq(loginAttempts.telegramId, telegramId),
        eq(loginAttempts.success, false),
        gte(loginAttempts.createdAt, since)
      )
    );
    return results[0]?.cnt || 0;
  }

  async getDistinctLoginIPs(telegramId: string, withinHours: number): Promise<string[]> {
    const since = new Date(Date.now() - withinHours * 60 * 60 * 1000);
    const results = await db.select({ ip: loginAttempts.ip }).from(loginAttempts).where(
      and(
        eq(loginAttempts.telegramId, telegramId),
        gte(loginAttempts.createdAt, since)
      )
    );
    return [...new Set(results.map((r) => r.ip))];
  }

  async createSecureDownload(memberId: number, fileName: string): Promise<string> {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(secureDownloads).values({ token, memberId, fileName, expiresAt });
    return token;
  }

  async validateSecureDownload(token: string): Promise<{ memberId: number; fileName: string } | null> {
    const [dl] = await db.select().from(secureDownloads).where(eq(secureDownloads.token, token));
    if (!dl) return null;
    if (dl.used) return null;
    if (new Date(dl.expiresAt).getTime() < Date.now()) return null;
    await db.update(secureDownloads).set({ used: true }).where(eq(secureDownloads.id, dl.id));
    return { memberId: dl.memberId, fileName: dl.fileName };
  }

  async createSession(memberId: number, deviceId: string, ip: string): Promise<string> {
    await db.delete(sessions).where(eq(sessions.memberId, memberId));
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(sessions).values({ token, memberId, deviceId, ip, expiresAt });
    return token;
  }

  async validateSession(token: string): Promise<{ memberId: number; deviceId: string } | null> {
    const [session] = await db.select().from(sessions).where(eq(sessions.token, token));
    if (!session) return null;
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      await db.delete(sessions).where(eq(sessions.id, session.id));
      return null;
    }
    return { memberId: session.memberId, deviceId: session.deviceId };
  }

  async deleteSession(token: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.token, token));
  }

  async deleteSessionsByMemberId(memberId: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.memberId, memberId));
  }

  async cleanupExpiredSessions(): Promise<void> {
    await db.delete(sessions).where(lte(sessions.expiresAt, new Date()));
  }
}

export const storage = new DatabaseStorage();
