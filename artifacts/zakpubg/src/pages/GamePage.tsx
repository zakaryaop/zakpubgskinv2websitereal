import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Gamepad2, Package, Star, Search, X, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Send, SlidersHorizontal } from "lucide-react";
import { getGameProducts, getSetting } from "../lib/api";
import { getGameBanner, getGameIcon, hasIcon, hasBanner, isGlobalGame } from "../lib/gameImage";
import SiteFooter from "../components/SiteFooter";
import BrandLogo from "../components/BrandLogo";

type Game = { id: number; slug: string; name: string; description?: string | null; logoUrl?: string | null; bannerUrl?: string | null; color?: string | null; };
type Product = { id: number; gameId: number; title: string; subtitle?: string | null; description?: string | null; priceUsd?: string | null; durationDays?: number | null; bannerUrl?: string | null; videoUrl?: string | null; features?: string | null; variants?: string | null; sortOrder?: number | null; };

function lowestTier(p: Product): { price: number; days: number } {
  const base = Number(p.priceUsd || 0) || 0;
  const days = Number(p.durationDays || 30) || 30;
  if (p.variants) {
    try {
      const arr = JSON.parse(p.variants);
      if (Array.isArray(arr) && arr.length > 0) {
        const tiers = arr
          .map((v: any) => ({ days: parseInt(String(v.days)) || 0, price: parseFloat(String(v.price)) || 0 }))
          .filter((v) => v.days > 0 && v.price > 0)
          .sort((a, b) => a.price - b.price);
        if (tiers[0]) return tiers[0];
      }
    } catch {}
  }
  return { price: base, days };
}

const PUBG_VARIANTS = ["bgmi", "pubg-kr", "pubg-vng"];
const GLOBAL_SLUG = "pubg-mobile";

const DEFAULT_GAME_BANNERS = [
  "/banners/banner1.jpg",
  "/banners/banner2.jpg",
  "/banners/banner3.jpg",
  "/banners/banner4.jpg",
  "/banners/banner5.jpg",
  "/banners/banner6.jpg",
  "/banners/banner7.jpg",
  "/banners/banner8.jpg",
];

function tryLocalBanners(slug: string): string[] {
  try {
    const raw = localStorage.getItem(`zakpubg_game_banners_${slug}`);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p) && p.length) return p; }
  } catch {}
  return [];
}

function GameCarousel({ slug, game }: { slug: string; game: Game | null }) {
  const [banners, setBanners] = useState<string[]>(() => {
    const own = tryLocalBanners(slug);
    if (own.length) return own;
    if (PUBG_VARIANTS.includes(slug)) return tryLocalBanners(GLOBAL_SLUG);
    return [];
  });
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<number | null>(null);
  const color = game?.color || "#a855f7";

  const resetTimer = (newIdx: number, total: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (total <= 1) return;
    timerRef.current = window.setInterval(() => setIdx(i => (i + 1) % total), 4500);
    setIdx(newIdx);
  };

  // Load from API on mount
  useEffect(() => {
    const loadFromApi = async () => {
      // Try own slug first
      const val = await getSetting(`game_banners_${slug}`);
      if (val) {
        try { const p = JSON.parse(val); if (Array.isArray(p) && p.length) { localStorage.setItem(`zakpubg_game_banners_${slug}`, val); setBanners(p); return; } } catch {}
      }
      // Try global slug for PUBG variants
      if (PUBG_VARIANTS.includes(slug)) {
        const gval = await getSetting(`game_banners_${GLOBAL_SLUG}`);
        if (gval) {
          try { const p = JSON.parse(gval); if (Array.isArray(p) && p.length) { setBanners(p); return; } } catch {}
        }
      }
      // Fallback: game bannerUrl or default banners
      if (banners.length === 0) {
        if (game?.bannerUrl) setBanners([game.bannerUrl]);
        else setBanners(DEFAULT_GAME_BANNERS);
      }
    };
    loadFromApi();
  }, [slug, game]);

  // Fallback: use default banners if still empty
  useEffect(() => {
    if (banners.length === 0) {
      setBanners(game?.bannerUrl ? [game.bannerUrl] : DEFAULT_GAME_BANNERS);
    }
  }, [game]);

  useEffect(() => {
    const handle = () => { const fresh = tryLocalBanners(slug); if (fresh.length) { setBanners(fresh); setIdx(0); } };
    window.addEventListener(`zakpubg_game_banners_updated_${slug}`, handle);
    const globalHandle = () => { const fresh = tryLocalBanners(GLOBAL_SLUG); if (fresh.length) { setBanners(fresh); setIdx(0); } };
    if (PUBG_VARIANTS.includes(slug)) {
      window.addEventListener(`zakpubg_game_banners_updated_${GLOBAL_SLUG}`, globalHandle);
    }
    return () => {
      window.removeEventListener(`zakpubg_game_banners_updated_${slug}`, handle);
      if (PUBG_VARIANTS.includes(slug)) {
        window.removeEventListener(`zakpubg_game_banners_updated_${GLOBAL_SLUG}`, globalHandle);
      }
    };
  }, [slug]);

  useEffect(() => {
    if (banners.length <= 1) return;
    timerRef.current = window.setInterval(() => setIdx(i => (i + 1) % banners.length), 4500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [banners.length]);

  return (
    <div className="relative w-full rounded-2xl sm:rounded-3xl bg-[#130d28] ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.35)] overflow-hidden">
      <div className="relative w-full overflow-hidden" style={{ paddingBottom: "50%" }}>
        {banners.length > 0 ? (
          banners.map((src, i) => (
            <div key={src + i} className={`absolute inset-0 transition-opacity duration-700 ${i === idx ? "opacity-100 z-10" : "opacity-0 z-0"}`}>
              <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover object-center" style={{ display: "block" }} />
            </div>
          ))
        ) : (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}30 0%, #0e0820 100%)` }}>
            {hasIcon(game) && (
              <img src={getGameIcon(game)} alt="" className="absolute inset-0 w-full h-full object-cover object-center opacity-60" />
            )}
          </div>
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-30">
            {banners.map((_, i) => (
              <button key={i} onClick={() => resetTimer(i, banners.length)}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ width: i === idx ? 20 : 6, background: i === idx ? "#a855f7" : "rgba(255,255,255,0.35)" }} />
            ))}
          </div>
        )}

        {banners.length > 1 && (
          <>
            <button onClick={() => resetTimer((idx - 1 + banners.length) % banners.length, banners.length)}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white z-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => resetTimer((idx + 1) % banners.length, banners.length)}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 border border-white/20 flex items-center justify-center text-white z-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function GamePage() {
  const params = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [game, setGame] = useState<Game | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"featured" | "low" | "high">("featured");
  const [filterOpen, setFilterOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!params.slug) return;
    setLoading(true);
    getGameProducts(params.slug)
      .then(d => { setGame(d.game); setProducts(d.products || []); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug]);

  function handleBuy(p: Product) {
    if (!params.slug) return;
    navigate(`/games/${params.slug}/products/${p.id}`);
  }

  const filtered = useMemo(() => {
    let list = products;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(p => p.title.toLowerCase().includes(q) || (p.subtitle || "").toLowerCase().includes(q));
    }
    if (sort === "low") list = [...list].sort((a, b) => lowestTier(a).price - lowestTier(b).price);
    if (sort === "high") list = [...list].sort((a, b) => lowestTier(b).price - lowestTier(a).price);
    return list;
  }, [products, query, sort]);

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center text-center p-4">
        <div>
          <Gamepad2 className="w-16 h-16 mx-auto mb-4 text-slate-600" strokeWidth={1.5} />
          <h1 className="text-2xl font-black text-white mb-2">Game not found</h1>
          <p className="text-slate-500 mb-6">This game doesn't exist or has been removed.</p>
          <button onClick={() => navigate("/")} className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 font-bold text-sm">Back to Home</button>
        </div>
      </div>
    );
  }

  const color = game?.color || "#22d3ee";

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080810]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate("/")}
              aria-label="Back to Home"
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 ${scrolled ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none w-0 -ml-2 border-0"}`}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0 min-w-0" aria-label="ZakPubgSkin home">
              <BrandLogo size={26} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              <span className="font-black text-[15px] tracking-tight leading-none truncate">
                <span className="text-white">ZAK</span><span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span><span className="text-white">SKIN</span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <a
              href="https://t.me/zakpubgskin"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 to-cyan-500/15 border border-sky-400/30 text-sky-300 text-xs font-bold hover:from-sky-500/25 hover:to-cyan-500/25 hover:text-white transition-all"
              aria-label="Live Support on Telegram"
            >
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Support</span>
            </a>
          </div>
        </div>
      </nav>

      <div className="pt-14">
        {/* Back to home */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-3 pb-2">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </button>
        </div>

        {/* Game Banner Carousel */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5">
          <GameCarousel slug={params.slug!} game={game} />

          {/* Inline search */}
          {searchOpen && (
            <div className="mt-3 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                aria-label="Search products"
                placeholder="Search products…"
                className="w-full bg-[#1a0f38] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors"
              />
            </div>
          )}
        </div>

        {/* Section header — count + VIP sort pills */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-3 pb-2">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.06]">
            <div className="min-w-0">
              <h2 className="text-base sm:text-xl font-black text-white tracking-tight leading-none truncate">All Packages</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 mt-0.5">
                {loading ? "Loading…" : `${filtered.length} ${filtered.length === 1 ? "product" : "products"}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Search button */}
              <button
                onClick={() => { setSearchOpen(o => { if (o) setQuery(""); return !o; }); }}
                aria-label={searchOpen ? "Close search" : "Search products"}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all border ${searchOpen ? "bg-violet-600 text-white border-violet-500" : "bg-[#1a0f38] text-slate-200 border-white/10 hover:border-violet-400/40"}`}
              >
                {searchOpen ? <X className="w-3.5 h-3.5" /> : <Search className="w-3.5 h-3.5" />}
                {searchOpen ? "Close" : "Search"}
              </button>
              {/* Filter button + popup */}
              <div className="relative">
              <button
                onClick={() => setFilterOpen(o => !o)}
                aria-expanded={filterOpen}
                aria-haspopup="menu"
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider transition-all border ${
                  sort !== "featured"
                    ? "bg-gradient-to-r from-amber-400 to-fuchsia-500 text-white border-transparent shadow-md"
                    : "bg-[#12121c] text-slate-200 border-white/10 hover:border-amber-400/40"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={2.6} />
                Filter
                {sort !== "featured" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} aria-hidden />
                  <div
                    role="menu"
                    aria-label="Sort products"
                    className="absolute right-0 mt-2 w-52 rounded-xl bg-[#12121c] border border-white/10 shadow-2xl shadow-black/60 backdrop-blur-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-1"
                  >
                    <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-white/5">Sort by</div>
                    {([
                      { v: "featured", label: "Featured", icon: "★" },
                      { v: "low", label: "Price: Low to High", icon: "↓" },
                      { v: "high", label: "Price: High to Low", icon: "↑" },
                    ] as const).map(({ v, label, icon }) => {
                      const active = sort === v;
                      return (
                        <button
                          key={v}
                          role="menuitemradio"
                          aria-checked={active}
                          onClick={() => { setSort(v); setFilterOpen(false); }}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[12px] font-semibold text-left transition-colors ${
                            active ? "bg-gradient-to-r from-amber-500/15 to-fuchsia-500/15 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <span className={`w-5 text-center ${active ? "text-amber-400" : "text-slate-500"}`}>{icon}</span>
                          <span className="flex-1">{label}</span>
                          {active && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Products grid */}
        <div className="max-w-7xl mx-auto px-3 sm:px-5 pt-3 pb-6">
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-56 rounded-2xl bg-slate-800/30 animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-14 h-14 mx-auto mb-4 text-slate-600" strokeWidth={1.5} />
              <h2 className="text-xl font-black text-white mb-2">{query ? "No matches" : "No packages available"}</h2>
              <p className="text-slate-500 text-sm">{query ? "Try a different search." : "Check back soon or contact support."}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              {filtered.map((p, idx) => {
                const seed = (p.id || idx) + 1;
                const rating = (4.6 + ((seed * 7) % 4) / 10).toFixed(1);
                const reviews = 800 + ((seed * 137) % 4000);
                return (
                  <div
                    key={p.id}
                    onClick={() => handleBuy(p)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleBuy(p); } }}
                    className="group flex flex-col rounded-2xl bg-[#12121c] ring-1 ring-inset ring-white/[0.06] hover:ring-violet-400/40 overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[0_20px_40px_-12px_rgba(168,85,247,0.35)] cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-400/60"
                  >
                    <div className="relative aspect-square overflow-hidden bg-slate-900">
                      {p.bannerUrl || game?.bannerUrl || isGlobalGame(game) ? (
                        <img src={p.bannerUrl || getGameBanner(game)} alt={p.title}
                          className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${color}30, #0f172a)` }}>
                          <Package className="w-10 h-10 text-white/20" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#12121c]/80 via-transparent to-transparent" />
                      {/* Red SALE corner ribbon — shown on every card */}
                      <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider text-white shadow-[0_4px_14px_-2px_rgba(244,63,94,0.7)] bg-gradient-to-r from-rose-600 to-red-500 ring-1 ring-inset ring-white/20">
                        <span className="relative flex w-1.5 h-1.5">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white" />
                        </span>
                        Sale
                      </span>
                    </div>

                    <div className="p-2.5 flex flex-col gap-1">
                      <h3 className="font-bold text-white text-xs sm:text-sm leading-tight line-clamp-1">{p.title}</h3>
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-400 font-bold">
                        <Star className="w-3 h-3 fill-amber-400" strokeWidth={0} />
                        {rating} <span className="text-slate-500 font-normal">({reviews >= 1000 ? `${(reviews/1000).toFixed(1)}k` : reviews})</span>
                      </span>
                      <div className="mt-1 flex items-center justify-between gap-1.5 min-w-0">
                        <div className="flex items-baseline gap-0.5 min-w-0 flex-1">
                          {(() => {
                            const lt = lowestTier(p);
                            return (
                              <>
                                <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold mr-0.5 hidden sm:inline">From</span>
                                <span className="text-sm sm:text-lg font-black text-white truncate">${lt.price.toFixed(2)}</span>
                                <span className="text-[9px] text-slate-400 ml-0.5 shrink-0">/{lt.days}d</span>
                              </>
                            );
                          })()}
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleBuy(p); }}
                          className="group/btn shrink-0 inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold tracking-wide text-white bg-purple-600 hover:bg-purple-500 shadow-md shadow-purple-500/30 transition-all active:scale-[0.97]"
                        >
                          View
                          <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.8} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <SiteFooter />

    </div>
  );
}
