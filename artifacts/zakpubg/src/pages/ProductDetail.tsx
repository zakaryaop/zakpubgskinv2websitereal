import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { ArrowLeft, ArrowRight, Check, Play, ShieldCheck, Star, Clock, Zap, Flame, Crown, ChevronLeft, ChevronRight, Send, Lock, X, ZoomIn } from "lucide-react";
import { getGameProducts } from "../lib/api";
import { getGameBanner, isGlobalGame } from "../lib/gameImage";
import { useAuth } from "../lib/auth";
import PaymentModal from "../components/PaymentModal";
import SiteFooter from "../components/SiteFooter";
import BrandLogo from "../components/BrandLogo";
import TrustRow from "../components/TrustRow";
import CountdownStrip from "../components/CountdownStrip";
import FAQSection from "../components/FAQSection";

type Game = { id: number; slug: string; name: string; description?: string | null; logoUrl?: string | null; bannerUrl?: string | null; color?: string | null; };
type Product = { id: number; gameId: number; title: string; subtitle?: string | null; description?: string | null; priceUsd?: string | null; durationDays?: number | null; bannerUrl?: string | null; videoUrl?: string | null; features?: string | null; galleryImages?: string | null; galleryVideos?: string | null; variants?: string | null; sortOrder?: number | null; };
type MediaItem = { kind: "image" | "video"; url: string };
type DurationTab = { days: number; price: string };

function toEmbedUrl(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.slice(1)}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      return `https://player.vimeo.com/video/${u.pathname.split("/").filter(Boolean).pop()}`;
    }
    return url;
  } catch { return null; }
}

export default function ProductDetail() {
  const params = useParams<{ slug: string; id: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [anchorId, setAnchorId] = useState<number | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(30);
  const [payProduct, setPayProduct] = useState<Product | null>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!params.slug || !params.id) return;
    setLoading(true);
    getGameProducts(params.slug)
      .then(d => {
        setGame(d.game);
        setProducts(d.products || []);
        const id = Number(params.id);
        const found = (d.products || []).find((p: Product) => p.id === id);
        if (!found) { setNotFound(true); return; }
        setAnchorId(id);
        const dur = Number(found.durationDays || 30);
        setSelectedDuration([7, 30, 60].includes(dur) ? dur : 30);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.slug, params.id]);

  const current = useMemo(() => products.find(p => p.id === anchorId) || null, [products, anchorId]);

  const variants = useMemo(() => {
    if (!current) return [] as Product[];
    const norm = (t: string) => t
      .toLowerCase()
      .replace(/[\(\)\[\]\-–_,/|]/g, " ")
      .replace(/\b\d+\s*(d|day|days|week|weeks|month|months)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const base = norm(current.title);
    const list = products.filter(p => norm(p.title) === base);
    return list.sort((a, b) => (a.durationDays || 0) - (b.durationDays || 0));
  }, [products, current]);

  function priceTo99(n: number) {
    const rounded = Math.max(0.99, Math.round(n) - 0.01);
    return rounded.toFixed(2);
  }

  const adminTiers = useMemo<DurationTab[]>(() => {
    if (!current?.variants) return [];
    try {
      const parsed = JSON.parse(current.variants);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((v: any) => ({ days: parseInt(String(v.days)) || 0, price: String(v.price ?? "") }))
        .filter(t => t.days > 0 && t.price.length > 0)
        .sort((a, b) => a.days - b.days);
    } catch { return []; }
  }, [current]);

  const tabs = useMemo(() => {
    if (adminTiers.length > 0) {
      return adminTiers.map(t => ({ days: t.days, price: t.price, product: variants.find(v => Number(v.durationDays) === t.days) || null, isReal: true }));
    }
    const baseDays = Number(current?.durationDays || 30) || 30;
    const basePrice = Number(current?.priceUsd || 0) || 0;
    const rate = basePrice / baseDays;
    const discount = (d: number) => d >= 60 ? 0.85 : d >= 30 ? 0.92 : 1;
    return [1, 30, 60].map(d => {
      const real = variants.find(v => Number(v.durationDays) === d);
      const calcPrice = priceTo99(rate * d * discount(d));
      return {
        days: d,
        price: real ? String(real.priceUsd) : calcPrice,
        product: real || null,
        isReal: !!real,
      };
    });
  }, [current, variants, adminTiers]);

  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.find(t => t.days === selectedDuration)) {
      const mid = tabs[Math.floor(tabs.length / 2)] || tabs[0];
      setSelectedDuration(mid.days);
    }
  }, [tabs, selectedDuration]);

  const selectedTab = tabs.find(t => t.days === selectedDuration) || tabs[Math.floor(tabs.length / 2)] || tabs[0];
  const selectedPrice = selectedTab?.price ?? current?.priceUsd ?? "0";
  const productToBuy = selectedTab?.product || current;

  const features = useMemo(() => {
    if (!current?.features) return [] as string[];
    const raw = current.features.trim();
    if (raw.startsWith("[")) {
      try {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.map(s => String(s).trim()).filter(Boolean);
      } catch {}
    }
    return raw.split(/\r?\n|,/).map(s => s.replace(/^["'\s\[\]]+|["'\s\[\]]+$/g, "").trim()).filter(Boolean);
  }, [current]);

  const mediaItems = useMemo<MediaItem[]>(() => {
    const parseArr = (s?: string | null): string[] => {
      if (!s) return [];
      try { const a = JSON.parse(s); if (Array.isArray(a)) return a.map(String).filter(Boolean); } catch {}
      return s.split("\n").map(x => x.trim()).filter(Boolean);
    };
    const imgs = parseArr(current?.galleryImages);
    const vids = parseArr(current?.galleryVideos);
    if (current?.bannerUrl && !imgs.includes(current.bannerUrl)) imgs.unshift(current.bannerUrl);
    if (current?.videoUrl && !vids.includes(current.videoUrl)) vids.unshift(current.videoUrl);
    const items: MediaItem[] = [
      ...imgs.map(url => ({ kind: "image" as const, url })),
      ...vids.map(url => ({ kind: "video" as const, url })),
    ];
    if (items.length === 0) {
      const gb = getGameBanner(game);
      if (gb) items.push({ kind: "image", url: gb });
    }
    return items;
  }, [current, game]);

  useEffect(() => { setMediaIdx(0); setShowVideo(false); }, [current?.id]);
  useEffect(() => {
    if (mediaIdx >= mediaItems.length) setMediaIdx(0);
  }, [mediaItems.length, mediaIdx]);

  const activeMedia = mediaItems[mediaIdx] || null;
  const heroVideoEmbed = activeMedia?.kind === "video" ? toEmbedUrl(activeMedia.url) : null;
  const heroImage = activeMedia?.kind === "image" ? activeMedia.url : getGameBanner(game);
  const accent = game?.color || "#a855f7";

  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const prevMedia = () => { setShowVideo(false); setMediaIdx(i => (i - 1 + mediaItems.length) % Math.max(1, mediaItems.length)); };
  const nextMedia = () => { setShowVideo(false); setMediaIdx(i => (i + 1) % Math.max(1, mediaItems.length)); };

  function handleBuyClick() {
    if (!productToBuy) return;
    if (!user) { navigate("/sign-in"); return; }
    setPayProduct(productToBuy);
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center text-center p-4">
        <div>
          <h1 className="text-2xl font-black text-white mb-3">Product not found</h1>
          <button onClick={() => navigate(`/games/${params.slug}`)} className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm">← Back to store</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#080810]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => navigate(`/games/${params.slug}`)}
              aria-label="Back"
              className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 ${scrolled ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-75 pointer-events-none w-0 -ml-2 border-0"}`}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2 shrink-0 min-w-0" aria-label="ZakPubgSkin home">
              <BrandLogo size={26} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              <span className="font-black text-[15px] tracking-tight leading-none truncate">
                <span className="text-white">ZAK</span>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
                <span className="text-white">SKIN</span>
              </span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="https://t.me/zakpubgskin"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/15 to-cyan-500/15 border border-sky-400/30 text-sky-300 text-xs sm:text-sm font-bold hover:from-sky-500/25 hover:to-cyan-500/25 hover:text-white transition-all"
              aria-label="Live Support on Telegram"
            >
              <span className="relative flex w-2 h-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <Send className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Live Support</span>
            </a>
          </div>
        </div>
      </nav>

      <div className="pt-14 pb-6">
        {/* Back */}
        <div className="max-w-6xl mx-auto px-3 sm:px-5 pt-3 pb-2">
          <button
            onClick={() => navigate(`/games/${params.slug}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to {game?.name || "Store"}
          </button>
        </div>

        {loading || !current ? (
          <div className="max-w-6xl mx-auto px-3 sm:px-5">
            <div className="h-72 rounded-2xl bg-slate-800/30 animate-pulse mb-4" />
            <div className="h-6 w-1/2 bg-slate-800/30 animate-pulse rounded mb-3" />
            <div className="h-4 w-3/4 bg-slate-800/30 animate-pulse rounded" />
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-3 sm:px-5 grid lg:grid-cols-5 gap-3 sm:gap-4">
            {/* Left: media + description */}
            <div className="lg:col-span-3 space-y-3">
              {/* Hero media — manual gallery */}
              <div className="relative rounded-2xl overflow-hidden ring-1 ring-inset ring-white/10 bg-black aspect-video">
                {activeMedia?.kind === "video" && showVideo && heroVideoEmbed ? (
                  <iframe
                    src={heroVideoEmbed + (heroVideoEmbed.includes("?") ? "&" : "?") + "autoplay=1"}
                    title={current.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 w-full h-full"
                  />
                ) : activeMedia?.kind === "video" && showVideo && activeMedia.url ? (
                  <video src={activeMedia.url} controls autoPlay className="absolute inset-0 w-full h-full bg-black object-contain" />
                ) : (
                  <>
                    {heroImage ? (
                      <img
                        src={heroImage}
                        alt={current.title}
                        loading="lazy"
                        decoding="async"
                        onClick={() => setLightboxUrl(heroImage)}
                        className="absolute inset-0 w-full h-full object-cover object-center cursor-zoom-in"
                      />
                    ) : activeMedia?.kind === "video" ? (
                      <video src={activeMedia.url} muted className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${accent}40, #0f172a)` }} />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30 pointer-events-none" />
                    {heroImage && !showVideo && (
                      <button
                        onClick={() => setLightboxUrl(heroImage)}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white z-10 transition-all"
                        aria-label="View full screen"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    )}
                    {activeMedia?.kind === "video" && (
                      <button
                        onClick={() => setShowVideo(true)}
                        aria-label="Play preview video"
                        className="absolute inset-0 flex items-center justify-center group"
                      >
                        <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 hover:bg-white text-slate-950 flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
                          <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-slate-950" strokeWidth={0} />
                        </span>
                      </button>
                    )}
                  </>
                )}

                {mediaItems.length > 1 && !showVideo && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prevMedia(); }} aria-label="Previous"
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all z-10">
                      <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); nextMedia(); }} aria-label="Next"
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/55 hover:bg-black/75 backdrop-blur-md border border-white/10 flex items-center justify-center text-white transition-all z-10">
                      <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
                    </button>
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                      {mediaItems.map((_, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); setShowVideo(false); setMediaIdx(i); }}
                          aria-label={`Slide ${i + 1}`}
                          className="h-1.5 rounded-full transition-all"
                          style={{ width: i === mediaIdx ? 22 : 6, background: i === mediaIdx ? "#fff" : "rgba(255,255,255,0.45)" }} />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {mediaItems.length > 1 && (
                <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-1 -mx-1 px-1">
                  {mediaItems.map((m, i) => {
                    const active = i === mediaIdx;
                    return (
                      <button
                        key={i}
                        onClick={() => { setShowVideo(false); setMediaIdx(i); }}
                        className={`relative shrink-0 w-20 h-12 sm:w-24 sm:h-14 rounded-lg overflow-hidden border transition-all ${
                          active ? "border-violet-500/70 ring-2 ring-violet-500/40" : "border-white/10 hover:border-white/30"
                        }`}
                        aria-label={`Thumbnail ${i + 1}`}
                      >
                        {m.kind === "image" ? (
                          <img src={m.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <>
                            <video src={m.url} muted className="w-full h-full object-cover bg-slate-900" />
                            <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                              <Play className="w-4 h-4 fill-white text-white" strokeWidth={0} />
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Title */}
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">{current.title}</h1>
              </div>

              {/* Features + trust badges */}
              {features.length > 0 && (
                <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#0f0f1e,#0a0a16)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {/* Header */}
                  <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
                      <ShieldCheck className="w-3 h-3 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[11px] font-black text-white uppercase tracking-[0.18em]">What's Included</span>
                  </div>
                  {/* Feature list */}
                  <ul className="px-4 py-3 space-y-2.5">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5">
                        {/* Filled blue circle tick — like verified badge */}
                        <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center" style={{ background: "#2563eb" }}>
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3.5} />
                        </div>
                        <span className="text-[12px] font-medium text-slate-200 leading-none">{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Right: VIP buy panel */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-16 space-y-3">

                {/* Plan Selector — 3 compact boxes */}
                {(() => {
                  const tiers = [
                    {
                      badge: "Trial",
                      badgeBg: "#1e1b4b",
                      badgeColor: "#a5b4fc",
                      color: "#818cf8",
                      cardBg: "linear-gradient(160deg,rgba(67,56,202,0.2),rgba(67,56,202,0.07))",
                      border: "rgba(99,102,241,0.4)",
                      glow: "rgba(99,102,241,0.3)",
                      Icon: Zap,
                      iconColor: "#38bdf8",
                      iconGlow: "0 0 14px 3px rgba(56,189,248,0.9), 0 0 28px 6px rgba(56,189,248,0.5)",
                    },
                    {
                      badge: "Popular",
                      badgeBg: "#4c1d95",
                      badgeColor: "#ddd6fe",
                      color: "#a78bfa",
                      cardBg: "linear-gradient(160deg,rgba(124,58,237,0.25),rgba(109,40,217,0.09))",
                      border: "rgba(167,139,250,0.5)",
                      glow: "rgba(124,58,237,0.4)",
                      Icon: Flame,
                      iconColor: "#c084fc",
                      iconGlow: "0 0 14px 3px rgba(192,132,252,0.9), 0 0 28px 6px rgba(192,132,252,0.5)",
                    },
                    {
                      badge: "Hot",
                      badgeBg: "#7f1d1d",
                      badgeColor: "#fca5a5",
                      color: "#f87171",
                      cardBg: "linear-gradient(160deg,rgba(239,68,68,0.2),rgba(220,38,38,0.07))",
                      border: "rgba(248,113,113,0.45)",
                      glow: "rgba(239,68,68,0.35)",
                      Icon: Crown,
                      iconColor: "#f87171",
                      iconGlow: "0 0 14px 3px rgba(248,113,113,0.9), 0 0 28px 6px rgba(248,113,113,0.5)",
                    },
                  ];
                  return (
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Choose Plan</span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> In Stock
                        </span>
                      </div>

                      {/* 3 compact boxes */}
                      <div className="grid grid-cols-3 gap-2">
                        {tabs.map((t, i) => {
                          const active = t.days === selectedDuration;
                          const tier = tiers[i] || tiers[0];
                          const TierIcon = tier.Icon;
                          return (
                            <button
                              key={t.days}
                              onClick={() => setSelectedDuration(t.days)}
                              className="relative flex flex-col items-center rounded-xl py-3 px-1.5 transition-all duration-200 active:scale-[0.96] overflow-hidden"
                              style={{
                                background: active ? tier.cardBg : "rgba(255,255,255,0.04)",
                                border: active ? `1.5px solid ${tier.border}` : "1.5px solid rgba(255,255,255,0.07)",
                                boxShadow: active ? `0 0 18px -5px ${tier.glow}` : "none",
                              }}
                            >
                              {/* Top color line on active */}
                              {active && (
                                <div className="absolute top-0 left-0 right-0 h-[2px]"
                                  style={{ background: `linear-gradient(90deg,transparent,${tier.color},transparent)` }} />
                              )}

                              {/* Badge + icon row */}
                              <div className="flex items-center justify-between w-full px-1 mb-2">
                                <span
                                  className="text-[8px] font-black uppercase tracking-wide px-1.5 py-[2px] rounded-md"
                                  style={{ background: active ? tier.badgeBg : "rgba(255,255,255,0.06)", color: active ? tier.badgeColor : "#4b5563" }}
                                >
                                  {tier.badge}
                                </span>
                                <TierIcon
                                  className="w-3.5 h-3.5 shrink-0 transition-all duration-200"
                                  style={{
                                    color: active ? tier.iconColor : "#374151",
                                    filter: active ? `drop-shadow(0 0 5px ${tier.iconColor}) drop-shadow(0 0 10px ${tier.iconColor})` : "none",
                                  }}
                                  strokeWidth={2.5}
                                />
                              </div>

                              {/* Days */}
                              <span className={`text-[22px] font-black leading-none ${active ? "text-white" : "text-slate-500"}`}>
                                {t.days}
                              </span>
                              <span className={`text-[9px] font-semibold mb-1.5 ${active ? "text-slate-400" : "text-slate-700"}`}>
                                {t.days === 1 ? "Day" : "Days"}
                              </span>

                              {/* Price */}
                              <span
                                className="text-[13px] font-black tabular-nums"
                                style={{ color: active ? tier.color : "#374151" }}
                              >
                                ${t.price}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Buy button */}
                      <button
                        onClick={handleBuyClick}
                        className="group/buy relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden active:scale-[0.98] flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)", boxShadow: "0 8px 28px -6px rgba(124,58,237,0.65)" }}
                      >
                        <span className="absolute inset-0 -translate-x-full group-hover/buy:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        <Lock className="w-4 h-4 relative" strokeWidth={2.5} />
                        <span className="relative">Buy Now — ${selectedPrice}</span>
                      </button>
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#15803d" }}>
                          <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                        </div>
                        <span className="text-[11px] font-semibold text-slate-400">Secure Payment — 100% Safe</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Trust badges */}
                <TrustRow />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FAQ section */}
      {current && (
        <div className="max-w-6xl mx-auto px-3 sm:px-5 mt-4">
          <FAQSection />
        </div>
      )}

      {/* Reviews section */}
      {current && (
        <div className="max-w-6xl mx-auto px-3 sm:px-5 mt-4">
          <div className="rounded-2xl border border-white/10 bg-[#12121c] p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300/80">Customer Reviews</div>
                <h3 className="text-lg sm:text-xl font-black text-white mt-1">What players are saying</h3>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-2xl sm:text-3xl font-black text-white">4.9</span>
                  <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                </div>
                <div className="text-[10px] text-slate-500 font-semibold mt-0.5">1,247 reviews</div>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {[
                { n: "Ahmad K.", t: "2d ago", r: 5, c: "Bhai maza aa gaya! Aimbot bilkul smooth hai, koi lag nahi. USDT se payment ki, 1 minute me Telegram invite mil gaya. 10/10!", g: "from-violet-500 to-fuchsia-500" },
                { n: "Dmitry V.", t: "4d ago", r: 5, c: "Лучший VIP что я пробовал. ESP работает идеально, никаких банов за 30 дней. Очень рекомендую!", g: "from-cyan-500 to-blue-500" },
                { n: "Rahul S.", t: "6d ago", r: 5, c: "मस्त है यार! No recoil और magic bullet दोनों एकदम perfect. Conqueror push करना अब easy है. Worth every rupee.", g: "from-amber-500 to-orange-500" },
                { n: "Bilal R.", t: "1w ago", r: 5, c: "Sach me bhai, paisa wasool. Support ne 2 minute me reply kiya jab confusion hui. Renew kar raha hoon next month bhi.", g: "from-emerald-500 to-teal-500" },
                { n: "Aleksei P.", t: "1w ago", r: 4, c: "Very clean menu, easy to use. Anti-ban works well. Only wish there were more language options in the panel. Otherwise solid!", g: "from-rose-500 to-pink-500" },
                { n: "Hassan M.", t: "2w ago", r: 5, c: "Pehle dar tha ki scam hoga, lekin payment ke turant baad VIP group me add ho gaya. Ab 25 days ho gaye, no ID ban. Trusted seller!", g: "from-lime-500 to-emerald-500" },
                { n: "Priya K.", t: "2w ago", r: 5, c: "Bahut accha product hai 🔥 ESP बहुत clear दिखती है और team चैट में सब impress हैं। Definitely renewing!", g: "from-fuchsia-500 to-purple-500" },
                { n: "Ivan S.", t: "3w ago", r: 5, c: "Smooth aim, ESP, magic bullet — everything works flawlessly. Telegram support replied in Russian too. Спасибо команде!", g: "from-indigo-500 to-violet-500" },
              ].map((rev, i) => (
                <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${rev.g} flex items-center justify-center text-[11px] font-black text-white`}>
                        {rev.n[0]}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-none">{rev.n}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{rev.t}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, s) => (
                        <Star key={s} className={`w-3 h-3 ${s < rev.r ? "fill-amber-400 text-amber-400" : "fill-slate-700 text-slate-700"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{rev.c}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <SiteFooter />

      {payProduct && (
        <PaymentModal
          product={payProduct}
          onClose={() => setPayProduct(null)}
          override={{ priceUsd: String(selectedPrice), durationDays: selectedDuration }}
        />
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(8px)" }}
          onClick={() => setLightboxUrl(null)}
        >
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Full view"
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-full object-contain rounded-xl"
            style={{ maxHeight: "90vh", maxWidth: "95vw" }}
          />
        </div>
      )}

    </div>
  );
}
