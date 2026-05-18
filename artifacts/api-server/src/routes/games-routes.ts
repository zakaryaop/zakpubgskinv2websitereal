import type { Express } from "express";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, asc } from "drizzle-orm";
import { games, products } from "@workspace/db";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const db = drizzle(process.env.DATABASE_URL!);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const JWT_SECRET = process.env.ADMIN_PASSWORD + "_jwt_zak_" + process.env.ADMIN_USERNAME;

function adminAuth(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try { jwt.verify(authHeader.split(" ")[1], JWT_SECRET); next(); }
  catch { return res.status(401).json({ message: "Unauthorized" }); }
}

const DEFAULT_GAMES = [
  { slug: "pubg-mobile", name: "PUBG Mobile", description: "Global version — the original battle royale experience", color: "#22d3ee", sortOrder: 1 },
  { slug: "pubg-kr", name: "PUBG KR", description: "Korean server — exclusive features and early updates", color: "#a3e635", sortOrder: 2 },
  { slug: "bgmi", name: "BGMI", description: "Battlegrounds Mobile India — region exclusive", color: "#f97316", sortOrder: 3 },
  { slug: "pubg-vng", name: "PUBG VNG", description: "Vietnamese version with unique content", color: "#d946ef", sortOrder: 4 },
  { slug: "free-fire", name: "Free Fire", description: "Garena Free Fire — fast-paced battle royale", color: "#eab308", sortOrder: 5 },
  { slug: "cod-mobile", name: "COD Mobile", description: "Call of Duty Mobile — elite FPS action", color: "#ef4444", sortOrder: 6 },
];

export async function seedGamesIfEmpty() {
  try {
    const existing = await db.select().from(games).limit(1);
    if (existing.length === 0) {
      for (const g of DEFAULT_GAMES) {
        await db.insert(games).values(g).onConflictDoNothing();
      }
      console.log("Default games seeded");
    }
  } catch (err) {
    console.error("Failed to seed games:", err);
  }
}

export function registerGamesRoutes(app: Express) {
  // ── Public ────────────────────────────────────────────────────────────────

  app.get("/api/games", async (_req, res) => {
    try {
      const list = await db.select().from(games).where(eq(games.active, true)).orderBy(asc(games.sortOrder));
      return res.json({ games: list });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/games/:slug", async (req, res) => {
    try {
      const [game] = await db.select().from(games).where(eq(games.slug, req.params.slug));
      if (!game) return res.status(404).json({ message: "Game not found" });
      return res.json({ game });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.get("/api/games/:slug/products", async (req, res) => {
    try {
      const [game] = await db.select().from(games).where(eq(games.slug, req.params.slug));
      if (!game) return res.status(404).json({ message: "Game not found" });
      const list = await db.select().from(products)
        .where(eq(products.gameId, game.id))
        .orderBy(asc(products.sortOrder));
      const active = list.filter(p => p.active);
      return res.json({ game, products: active });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  // ── Admin CRUD ────────────────────────────────────────────────────────────

  app.get("/api/admin/games", adminAuth, async (_req, res) => {
    try {
      const list = await db.select().from(games).orderBy(asc(games.sortOrder));
      return res.json({ games: list });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/games", adminAuth, async (req, res) => {
    try {
      const { slug, name, description, logoUrl, bannerUrl, color, sortOrder } = req.body;
      if (!slug || !name) return res.status(400).json({ message: "slug and name required" });
      const [game] = await db.insert(games).values({
        slug: slug.toLowerCase().replace(/\s+/g, "-"),
        name, description, logoUrl, bannerUrl,
        color: color || "#22d3ee",
        sortOrder: sortOrder || 0,
      }).returning();
      return res.json({ game });
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ message: "Slug already exists" });
      return res.status(500).json({ message: "Server error" });
    }
  });

  app.put("/api/admin/games/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { name, description, logoUrl, bannerUrl, color, sortOrder, active } = req.body;
      const [updated] = await db.update(games).set({
        name, description, logoUrl, bannerUrl, color,
        sortOrder: sortOrder ?? undefined,
        active: active ?? undefined,
      }).where(eq(games.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Game not found" });
      return res.json({ game: updated });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/admin/games/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(games).where(eq(games.id, id));
      return res.json({ success: true });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  // ── Products Admin CRUD ───────────────────────────────────────────────────

  app.get("/api/admin/products", adminAuth, async (_req, res) => {
    try {
      const list = await db.select().from(products).orderBy(asc(products.gameId), asc(products.sortOrder));
      return res.json({ products: list });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.post("/api/admin/products", adminAuth, async (req, res) => {
    try {
      const { gameId, title, subtitle, description, priceUsd, durationDays, bannerUrl, videoUrl, features, galleryImages, galleryVideos, variants, sortOrder } = req.body;
      if (!gameId || !title) return res.status(400).json({ message: "gameId and title required" });
      const [product] = await db.insert(products).values({
        gameId: parseInt(gameId),
        title, subtitle, description,
        priceUsd: String(priceUsd || "14.99"),
        durationDays: parseInt(durationDays || 30),
        bannerUrl, videoUrl,
        features: typeof features === "string" ? features : JSON.stringify(features || []),
        galleryImages: typeof galleryImages === "string" ? galleryImages : JSON.stringify(galleryImages || []),
        galleryVideos: typeof galleryVideos === "string" ? galleryVideos : JSON.stringify(galleryVideos || []),
        variants: typeof variants === "string" ? variants : JSON.stringify(variants || []),
        sortOrder: sortOrder || 0,
      }).returning();
      return res.json({ product });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.put("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { title, subtitle, description, priceUsd, durationDays, bannerUrl, videoUrl, features, galleryImages, galleryVideos, variants, sortOrder, active, gameId } = req.body;
      const [updated] = await db.update(products).set({
        title, subtitle, description,
        priceUsd: priceUsd ? String(priceUsd) : undefined,
        durationDays: durationDays ? parseInt(durationDays) : undefined,
        bannerUrl, videoUrl,
        features: features !== undefined ? (typeof features === "string" ? features : JSON.stringify(features)) : undefined,
        galleryImages: galleryImages !== undefined ? (typeof galleryImages === "string" ? galleryImages : JSON.stringify(galleryImages)) : undefined,
        galleryVideos: galleryVideos !== undefined ? (typeof galleryVideos === "string" ? galleryVideos : JSON.stringify(galleryVideos)) : undefined,
        variants: variants !== undefined ? (typeof variants === "string" ? variants : JSON.stringify(variants)) : undefined,
        sortOrder: sortOrder ?? undefined,
        active: active ?? undefined,
        gameId: gameId ? parseInt(gameId) : undefined,
      }).where(eq(products.id, id)).returning();
      if (!updated) return res.status(404).json({ message: "Product not found" });
      return res.json({ product: updated });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });

  app.delete("/api/admin/products/:id", adminAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await db.delete(products).where(eq(products.id, id));
      return res.json({ success: true });
    } catch { return res.status(500).json({ message: "Server error" }); }
  });
}
