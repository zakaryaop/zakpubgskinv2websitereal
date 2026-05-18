import pubgGlobalImg from "@assets/image_1778074690882.png";

export const PUBG_GLOBAL_IMAGE = pubgGlobalImg;

type GameLike = { slug?: string | null; name?: string | null; bannerUrl?: string | null; logoUrl?: string | null };

const SLUG_BANNERS: Record<string, string> = {
  "pubg-mobile": "/games/pubg-mobile-v2.jpg",
  "pubg-kr": "/games/pubg-kr-v2.jpg",
  "bgmi": "/games/bgmi-v2.jpg",
  "pubg-vng": "/games/pubg-vng-v2.jpg",
};

const SLUG_ICONS: Record<string, string> = {
  "pubg-mobile": "/games/pubg-mobile-v2.jpg",
  "pubg-kr": "/games/pubg-kr-v2.jpg",
  "bgmi": "/games/bgmi-v2.jpg",
  "pubg-vng": "/games/pubg-vng-v2.jpg",
};

export function isGlobalGame(g?: GameLike | null): boolean {
  if (!g) return false;
  const s = (g.slug || "").toLowerCase();
  const n = (g.name || "").toLowerCase();
  if (s.includes("global") || n.includes("global")) return true;
  const isRegional = /(kr|vng|vn|bgmi|tw|kor|india|vietnam|korean)/.test(s) || /(korean|vietnam|india|bgmi|taiwan)/.test(n);
  return !isRegional && (s.includes("pubg") || n.includes("pubg"));
}

export function getGameBanner(g?: GameLike | null, fallback?: string | null): string {
  if (g?.bannerUrl) return g.bannerUrl;
  const slug = (g?.slug || "").toLowerCase();
  if (SLUG_BANNERS[slug]) return SLUG_BANNERS[slug];
  if (isGlobalGame(g)) return pubgGlobalImg;
  return fallback || "";
}

export function hasBanner(g?: GameLike | null): boolean {
  if (!g) return false;
  if (g.bannerUrl) return true;
  const slug = (g.slug || "").toLowerCase();
  return !!SLUG_BANNERS[slug] || isGlobalGame(g);
}

export function getGameIcon(g?: GameLike | null): string {
  const slug = (g?.slug || "").toLowerCase();
  return SLUG_ICONS[slug] || "";
}

export function hasIcon(g?: GameLike | null): boolean {
  if (!g) return false;
  const slug = (g?.slug || "").toLowerCase();
  return !!SLUG_ICONS[slug];
}

export function getGameLogo(g?: GameLike | null): string {
  if (g?.logoUrl) return g.logoUrl;
  if (isGlobalGame(g)) return pubgGlobalImg;
  return "";
}
