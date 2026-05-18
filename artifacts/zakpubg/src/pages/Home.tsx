import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  Zap, ShieldCheck, Headphones, Award, ArrowRight,
  Mail, ChevronLeft, ChevronRight,
  Sun, Moon, Globe, ChevronDown,
  Star, Quote,
} from "lucide-react";
import { getGames, getSetting } from "../lib/api";
import { getGameBanner, hasBanner, getGameIcon, hasIcon } from "../lib/gameImage";
import { useAuth } from "../lib/auth";
import { useTheme } from "../lib/theme";
import { useI18n, languages, type Lang } from "../lib/i18n";
import { Sidebar } from "../components/Sidebar";
import BrandLogo from "../components/BrandLogo";

type Game = { id: number; slug: string; name: string; description?: string | null; logoUrl?: string | null; bannerUrl?: string | null; color?: string | null; };

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className="relative h-9 w-16 rounded-full flex items-center transition-all duration-300 overflow-hidden focus:outline-none active:scale-95"
      style={{
        background: isDark
          ? "linear-gradient(135deg,#1e1040,#2d1b69)"
          : "linear-gradient(135deg,#fbbf24,#f97316)",
        boxShadow: isDark
          ? "0 0 0 1px rgba(139,92,246,0.4), 0 4px 14px rgba(109,40,217,0.35)"
          : "0 0 0 1px rgba(251,191,36,0.5), 0 4px 14px rgba(249,115,22,0.4)",
      }}
    >
      <span
        className="absolute flex items-center justify-center w-7 h-7 rounded-full shadow-md transition-all duration-300"
        style={{
          left: isDark ? "calc(100% - 30px)" : "2px",
          background: isDark ? "linear-gradient(135deg,#7c3aed,#a78bfa)" : "white",
          boxShadow: isDark ? "0 2px 8px rgba(139,92,246,0.6)" : "0 2px 8px rgba(0,0,0,0.2)",
        }}
      >
        {isDark
          ? <Moon className="w-3.5 h-3.5 text-white" fill="currentColor" />
          : <Sun className="w-3.5 h-3.5 text-amber-500" />}
      </span>
      <span
        className="absolute text-[9px] font-black uppercase tracking-widest transition-all duration-300"
        style={{ left: isDark ? "8px" : "auto", right: isDark ? "auto" : "8px", color: isDark ? "#a78bfa" : "white", opacity: 0.9 }}
      >
        {isDark ? "🌙" : "☀️"}
      </span>
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = languages.find(l => l.code === lang) || languages[0];

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Change language"
        className="h-9 px-3 rounded-full flex items-center gap-1.5 transition-all duration-200 active:scale-95 focus:outline-none"
        style={{
          background: open
            ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
            : "linear-gradient(135deg,rgba(79,70,229,0.18),rgba(124,58,237,0.1))",
          boxShadow: open
            ? "0 0 0 1px rgba(139,92,246,0.6), 0 4px 14px rgba(109,40,217,0.35)"
            : "0 0 0 1px rgba(139,92,246,0.25)",
          color: open ? "white" : "#c4b5fd",
        }}
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="text-[11px] font-black uppercase tracking-wider">{current.code}</span>
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[180px] rounded-2xl overflow-hidden p-1.5 z-[60]"
          style={{
            background: "linear-gradient(170deg,#1a0f38 0%,#110c28 100%)",
            boxShadow: "0 0 0 1px rgba(139,92,246,0.2), 0 20px 60px -10px rgba(0,0,0,0.9)",
          }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLang(l.code as Lang); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-150 text-sm"
              style={lang === l.code ? {
                background: "linear-gradient(135deg,rgba(124,58,237,0.25),rgba(79,70,229,0.15))",
                boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.3)",
                color: "#c4b5fd",
              } : { color: "#94a3b8" }}
              onMouseEnter={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
              onMouseLeave={e => { if (lang !== l.code) (e.currentTarget as HTMLElement).style.background = ""; }}
            >
              <span className="text-lg leading-none">{l.flag}</span>
              <span className="font-bold flex-1 truncate">{l.label}</span>
              {lang === l.code && (
                <span className="w-2 h-2 rounded-full" style={{ background: "linear-gradient(135deg,#7c3aed,#a78bfa)", boxShadow: "0 0 6px rgba(139,92,246,0.7)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const SLUG_CONFIG: Record<string, { displayName: string; region: string }> = {
  "pubg-mobile": { displayName: "PUBG Mobile", region: "GLOBAL" },
  "pubg-kr":     { displayName: "PUBG KR",     region: "KOREAN (KR)" },
  "bgmi":        { displayName: "BGMI",         region: "INDIA" },
  "pubg-vng":    { displayName: "PUBG VNG",     region: "VIETNAM (VN)" },
  "free-fire":   { displayName: "Free Fire",    region: "GLOBAL" },
  "cod-mobile":  { displayName: "COD Mobile",   region: "GLOBAL" },
};

function getRegionLabel(g: Game): string {
  const slug = (g.slug || "").toLowerCase();
  return SLUG_CONFIG[slug]?.region ?? "GLOBAL";
}

function getDisplayName(g: Game): string {
  const slug = (g.slug || "").toLowerCase();
  return SLUG_CONFIG[slug]?.displayName ?? (g.name || "PUBG Mobile");
}

const DEFAULT_BANNERS = [
  "/banners/banner1.jpg",
  "/banners/banner2.jpg",
  "/banners/banner3.jpg",
  "/banners/banner4.jpg",
  "/banners/banner5.jpg",
  "/banners/banner6.jpg",
  "/banners/banner7.jpg",
  "/banners/banner8.jpg",
];

function HeroCarousel({ onSelect }: { games: Game[]; onSelect: (slug: string) => void }) {
  const [idx, setIdx] = useState(0);
  const [banners, setBanners] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem("zakpubg_banners");
      if (s) {
        const p = JSON.parse(s);
        // Ignore cache if it contains old .png banner paths
        if (Array.isArray(p) && p.length && !p.some((b: string) => b.match(/banner\d+\.png$/))) return p;
      }
    } catch {}
    localStorage.removeItem("zakpubg_banners");
    return DEFAULT_BANNERS;
  });

  useEffect(() => {
    getSetting("home_banners").then(val => {
      if (val) {
        try {
          const p = JSON.parse(val);
          if (Array.isArray(p) && p.length) { localStorage.setItem("zakpubg_banners", val); setBanners(p); }
        } catch {}
      }
    });
  }, []);

  useEffect(() => {
    const onUpdate = () => {
      try {
        const s = localStorage.getItem("zakpubg_banners");
        if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) setBanners(p); }
      } catch {}
    };
    window.addEventListener("zakpubg_banners_updated", onUpdate);
    return () => window.removeEventListener("zakpubg_banners_updated", onUpdate);
  }, []);

  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners, idx]);

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % banners.length), 5000);
    return () => clearInterval(t);
  }, [banners.length]);

  const prev = () => setIdx(i => (i - 1 + banners.length) % banners.length);
  const next = () => setIdx(i => (i + 1) % banners.length);

  return (
    <section className="relative pt-14">
      <div className="relative max-w-6xl mx-auto px-3 sm:px-4 pt-2">
        <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl bg-[#130d28] ring-1 ring-inset ring-white/10 shadow-[0_20px_60px_-20px_rgba(139,92,246,0.3)]">
          <div className="relative aspect-[16/9] sm:aspect-[2/1]">
            {banners.map((src, i) => (
              <div
                key={src + i}
                className="absolute inset-0 w-full h-full"
                style={{
                  opacity: i === idx ? 1 : 0,
                  transition: "opacity 0.7s ease-in-out",
                  pointerEvents: i === idx ? "auto" : "none",
                }}
              >
                <img
                  src={src}
                  alt={`Banner ${i + 1}`}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
              </div>
            ))}

            {/* Left arrow */}
            <button
              type="button"
              aria-label="Previous slide"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all z-20"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
            </button>
            {/* Right arrow */}
            <button
              type="button"
              aria-label="Next slide"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/80 backdrop-blur-md border border-white/20 flex items-center justify-center text-white transition-all z-20"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
            </button>

            {/* Dots */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-20">
              {banners.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => setIdx(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === idx ? 22 : 6,
                    background: i === idx ? "#a855f7" : "rgba(255,255,255,0.35)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Brand({ size = "base" }: { size?: "sm" | "base" | "lg" }) {
  const sizes = { sm: "text-xs", base: "text-base", lg: "text-lg" }[size];
  return (
    <span className={`font-black ${sizes} tracking-tight leading-none`}>
      <span className="text-white">ZAK</span>
      <span className="brand-animated">PUBG</span>
      <span className="text-white">SKIN</span>
    </span>
  );
}

function NewsletterCard() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "loading") return;
    const v = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
      setState("error"); setMessage("Please enter a valid email address."); return;
    }
    setState("loading"); setMessage("");
    try {
      const r = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: v, source: "home" }),
      });
      const d = await r.json();
      if (!r.ok) { setState("error"); setMessage(d.message || "Subscription failed."); return; }
      setState("success"); setMessage(d.message || "Subscribed!"); setEmail("");
    } catch {
      setState("error"); setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="bg-gradient-to-br from-violet-600/20 via-[#1a0f38] to-violet-600/10 border border-violet-500/20 rounded-2xl p-4 sm:p-6 text-center">
      <h3 className="text-lg sm:text-xl font-black text-white mb-1">Stay Updated</h3>
      <p className="text-slate-400 text-xs mb-3">Subscribe to get latest updates and exclusive offers.</p>
      {state === "success" ? (
        <div className="max-w-md mx-auto rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-4 py-3 text-sm font-bold text-emerald-300">
          ✓ {message}
        </div>
      ) : (
        <form className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" onSubmit={onSubmit}>
          <input
            type="email"
            aria-label="Email address"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
            disabled={state === "loading"}
            className="flex-1 bg-[#130d28] border border-white/10 rounded-full px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={state === "loading"}
            className="px-6 py-2.5 rounded-full font-bold text-sm text-white bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95 transition-all shadow-lg shadow-violet-600/30 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
          >
            {state === "loading" ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
      {state === "error" && (
        <p className="mt-2 text-xs text-red-400 font-semibold">{message}</p>
      )}
    </div>
  );
}

export default function Home() {
  const [, navigate] = useLocation();
  useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    getGames().then(d => setGames(d.games || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0e0820] text-white overflow-x-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} games={games} />

      {/* ── Navbar ─────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-30 bg-[#0e0820]/85 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              className="group w-10 h-10 -ml-1.5 rounded-xl flex flex-col items-center justify-center gap-[5px] transition-all duration-200 active:scale-90 focus:outline-none"
              style={{
                background: "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.06))",
                boxShadow: "0 0 0 1px rgba(139,92,246,0.2)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(124,58,237,0.28),rgba(79,70,229,0.18))";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(139,92,246,0.45), 0 4px 14px rgba(109,40,217,0.25)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg,rgba(124,58,237,0.12),rgba(79,70,229,0.06))";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 1px rgba(139,92,246,0.2)";
              }}
            >
              <span className="block w-[18px] h-[2px] rounded-full transition-all duration-200 group-hover:w-[14px]" style={{ background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
              <span className="block w-[14px] h-[2px] rounded-full transition-all duration-200 group-hover:w-[18px]" style={{ background: "linear-gradient(90deg,#7c3aed,#a78bfa)" }} />
              <span className="block w-[18px] h-[2px] rounded-full transition-all duration-200 group-hover:w-[14px]" style={{ background: "linear-gradient(90deg,#a78bfa,#7c3aed)" }} />
            </button>
            <button onClick={() => navigate("/")} className="flex items-center gap-2" aria-label="ZakPubgSkin home">
              <BrandLogo size={28} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
              <Brand />
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <LangToggle />
          </div>
        </div>
      </nav>

      {/* ── Hero Banner Carousel ──────────────────────────────── */}
      <HeroCarousel games={games} onSelect={(slug) => navigate(`/games/${slug}`)} />

      {/* ── Choose Your Game ───────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-3 sm:px-5 pt-5 sm:pt-8 pb-4 sm:pb-6">
        <div className="flex items-center justify-center gap-3 sm:gap-4 mb-1">
          <span className="block h-px w-8 sm:w-24 bg-gradient-to-r from-transparent to-violet-500/60" />
          <h2 className="text-base sm:text-2xl font-black text-white tracking-[0.18em] uppercase">Choose Your Game</h2>
          <span className="block h-px w-8 sm:w-24 bg-gradient-to-l from-transparent to-violet-500/60" />
        </div>
        <p className="text-center text-slate-500 text-[11px] sm:text-xs mb-4 sm:mb-5">Select your favorite PUBG variant</p>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl bg-slate-800/30 animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {games.map(game => {
              const color = game.color || "#a855f7";
              const region = getRegionLabel(game);
              return (
                <div key={game.id} className="relative">
                  {/* Ambient glow — fixed violet */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -inset-1.5 rounded-3xl opacity-40 blur-2xl"
                    style={{ background: "radial-gradient(60% 60% at 50% 50%, #7c3aed55 0%, #7c3aed22 40%, transparent 75%)" }}
                  />
                  <button
                    onClick={() => navigate(`/games/${game.slug}`)}
                    className="group relative w-full overflow-hidden rounded-2xl text-left transition-all duration-300 hover:-translate-y-1"
                    style={{ boxShadow: "0 12px 32px -8px #7c3aed55, inset 0 0 0 1px #7c3aed30" }}
                  >
                    {/* Full-bleed image — square so nothing is cropped */}
                    <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#130d28]">
                      {hasBanner(game) ? (
                        <img
                          src={getGameBanner(game)}
                          alt={game.name}
                          loading="lazy"
                          decoding="async"
                          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className="absolute inset-0"
                          style={{ background: `linear-gradient(145deg, ${color}50 0%, #130d28 65%)` }}
                        />
                      )}
                    </div>

                    {/* View Files button — violet theme */}
                    <div className="px-2.5 py-2.5 bg-[#130d28]">
                      <div className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-violet-200 border border-violet-500/30 transition-all group-hover:border-violet-400/60 group-hover:text-white" style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.18), rgba(168,85,247,0.10))" }}>
                        View Files
                        <ArrowRight className="w-3 h-3" strokeWidth={3} />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Trust Strip ─────────────────────────────────────────── */}
      <section className="border-t border-white/5 bg-[#0e0820]">
        <div className="max-w-5xl mx-auto px-4 py-4 sm:py-5 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-5">
          {[
            { Icon: ShieldCheck, t: "100% Safe", d: "No Ban Risk", bg: "bg-emerald-500/10", border: "border-emerald-500/25", text: "text-emerald-400" },
            { Icon: Zap, t: "Instant Delivery", d: "Automatic Setup", bg: "bg-cyan-500/10", border: "border-cyan-500/25", text: "text-cyan-400" },
            { Icon: Headphones, t: "24/7 Support", d: "Always Available", bg: "bg-orange-500/10", border: "border-orange-500/25", text: "text-orange-400" },
            { Icon: Award, t: "Premium Quality", d: "Best Experience", bg: "bg-yellow-500/10", border: "border-yellow-500/25", text: "text-yellow-400" },
          ].map(f => (
            <div key={f.t} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${f.bg} border ${f.border} flex items-center justify-center flex-shrink-0`}>
                <f.Icon className={`w-5 h-5 ${f.text}`} strokeWidth={2.2} />
              </div>
              <div className="min-w-0">
                <div className="font-black text-white text-sm leading-tight">{f.t}</div>
                <div className="text-slate-500 text-[11px] leading-tight">{f.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-3 sm:px-5 py-6 sm:py-8">
        <div className="text-center mb-4 sm:mb-5">
          <div className="inline-flex items-center gap-2 mb-1.5">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-500/50" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-violet-400 uppercase">What Our Users Say</span>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-violet-500/50" />
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-white tracking-tight">Trusted by Thousands of Players</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { name: "Ahmed K.", role: "PUBG Mobile VIP", text: "Best service for PUBG KR fan, no lag, super fast delivery. Highly recommend!" },
            { name: "Rahul M.", role: "BGMI Pro", text: "I love that Rahem velvet is much better with ZakPubgSkin. Worth every dollar." },
            { name: "Tariq S.", role: "PUBG VN VIP", text: "Smooth process and 24/7 support is awesome. Highly recommended for all gamers." },
          ].map((t, i) => (
            <div key={i} className="bg-[#1a0f38] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-violet-400/30 transition-all relative">
              <Quote className="absolute top-3 right-3 w-5 h-5 text-violet-500/30" />
              <div className="flex items-center gap-1 mb-3">
                {[...Array(5)].map((_, s) => (
                  <Star key={s} className="w-3.5 h-3.5 text-lime-400 fill-lime-400" />
                ))}
              </div>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-2.5 pt-3 border-t border-white/5">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center font-black text-xs text-white">
                  {t.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white text-xs leading-tight">{t.name}</div>
                  <div className="text-slate-500 text-[10px] leading-tight">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Newsletter ──────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-3 sm:px-5 pb-6 sm:pb-8">
        <NewsletterCard />
      </section>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="relative border-t border-white/5 bg-[#0e0820]">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        <div className="max-w-5xl mx-auto px-5 pt-6 pb-4">
          {/* Brand row */}
          <div className="text-center mb-4">
            <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 mb-1.5" aria-label="ZakPubgSkin home">
              <BrandLogo size={32} className="drop-shadow-[0_0_18px_rgba(168,85,247,0.5)]" />
              <Brand size="lg" />
            </button>
            <p className="text-slate-500 text-[11px] leading-relaxed max-w-sm mx-auto">
              Premium VIP cheats &amp; tools for PUBG variants. Instant delivery, crypto payments, 100% safe.
            </p>
            <div className="flex justify-center gap-2 mt-2.5">
              {[
                {
                  href: "https://t.me/zakpubgskin", label: "Telegram", color: "#229ED9",
                  svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
                },
                {
                  href: "https://wa.me/923192530306", label: "WhatsApp", color: "#25D366",
                  svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.073zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>,
                },
                {
                  href: "https://www.tiktok.com/@zakpubgskin5", label: "TikTok", color: "#FF0050",
                  svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>,
                },
                {
                  href: "mailto:zakpubgskin@gmail.com", label: "Email", color: "#A78BFA",
                  svg: <Mail className="w-[18px] h-[18px]" strokeWidth={2} />,
                },
              ].map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  {...(s.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  aria-label={s.label}
                  className="group relative w-10 h-10 rounded-xl bg-[#1a0f38]/70 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-[#1a0f38]"
                  style={{
                    border: `1px solid ${s.color}55`,
                    color: s.color,
                    boxShadow: `0 0 0 1px ${s.color}22, 0 4px 16px -6px ${s.color}80`,
                  }}
                >
                  {/* Top corner accent */}
                  <span aria-hidden className="pointer-events-none absolute -top-px left-2 right-2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
                  {/* Bottom corner accent */}
                  <span aria-hidden className="pointer-events-none absolute -bottom-px left-2 right-2 h-px opacity-50" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
                  {s.svg}
                </a>
              ))}
            </div>
          </div>

          {/* Links grid */}
          <div className="grid grid-cols-3 gap-4 sm:gap-8 pb-6 border-b border-white/5">
            <div>
              <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-widest mb-3">Games</h4>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-500">
                {games.slice(0, 4).map(g => (
                  <li key={g.id}>
                    <button onClick={() => navigate(`/games/${g.slug}`)} className="hover:text-violet-300 transition-colors text-left">
                      {g.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-widest mb-3">Company</h4>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-500">
                {[
                  { l: "Support", p: "/support" },
                  { l: "Contact", p: "/contact" },
                  { l: "Members", p: "/members" },
                ].map(i => (
                  <li key={i.p}>
                    <button onClick={() => navigate(i.p)} className="hover:text-violet-300 transition-colors text-left">{i.l}</button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-widest mb-3">Legal</h4>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-500">
                {[
                  { l: "Terms", p: "/terms" },
                  { l: "Privacy", p: "/privacy" },
                  { l: "Sign In", p: "/sign-in" },
                ].map(i => (
                  <li key={i.p}>
                    <button onClick={() => navigate(i.p)} className="hover:text-violet-300 transition-colors text-left">{i.l}</button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Payment badges — real brand colors */}
          <div className="py-5 border-b border-white/5">
            <div className="text-center text-[10px] text-slate-600 uppercase tracking-widest mb-3">We Accept Crypto</div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {[
                { sym: "BTC", color: "#F7931A", path: "M11.767 19.089c4.924.868 9.593-2.535 10.461-7.599.868-5.064-2.405-9.872-7.329-10.74-4.924-.868-9.593 2.535-10.461 7.599-.868 5.064 2.405 9.872 7.329 10.74zm-3.06-12.41h2.88c1.32 0 2.4 1.08 2.4 2.4 0 .54-.18 1.02-.48 1.44.78.36 1.32 1.14 1.32 2.04 0 1.26-1.02 2.28-2.28 2.28h-3.84v-8.16zm1.32 1.2v2.16h1.56c.6 0 1.08-.48 1.08-1.08s-.48-1.08-1.08-1.08h-1.56zm0 3.36v2.4h1.92c.66 0 1.2-.54 1.2-1.2s-.54-1.2-1.2-1.2h-1.92z" },
                { sym: "ETH", color: "#627EEA", path: "M11.998 0L5.36 11.022 11.998 14.96l6.638-3.938L11.998 0zM5.36 12.273L11.998 24l6.638-11.727L11.998 16.21l-6.638-3.938z" },
                { sym: "USDT", color: "#26A17B", path: "M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm.71 12.97v2.16h-1.42v-2.16c-2.55-.13-4.5-.65-4.5-1.27v-2.39c0-.62 1.95-1.13 4.5-1.27V6.5h1.42v1.54c2.55.14 4.5.65 4.5 1.27v2.39c0 .62-1.95 1.14-4.5 1.27zm0-1.5c2.39-.14 4-.62 4-1.16 0-.55-1.61-1.02-4-1.16v1.04h-1.42v-1.04c-2.39.14-4 .61-4 1.16 0 .54 1.61 1.02 4 1.16v-1.05h1.42v1.05z" },
                { sym: "BNB", color: "#F3BA2F", path: "M12 0L9.207 2.793l5.121 5.121L12 10.243 9.671 7.914 4.55 13.035 0 8.484 12 0zm0 24L2.793 14.793l5.121-5.121L12 13.757l2.329-2.329 5.121 5.121L24 12.243 12 24zM12 14.793L9.671 12.464 12 10.135l2.329 2.329z" },
                { sym: "TRX", color: "#FF060A", path: "M21.66 6.46L3.32 2.92c-.15-.03-.31.06-.36.21-.06.16 0 .33.13.42L20.78 21.34c.06.06.14.09.22.09.04 0 .09-.01.13-.03.12-.06.19-.18.18-.31L22.04 6.78c-.02-.16-.16-.29-.38-.32zM7.04 6.16l9.92 1.91-12.92 4.6L7.04 6.16zm12.4 13.04l-7.6-7.74 8.32-2.96-.72 10.7zm-7.66-7.05l-2.84 4.66-5.16-9.07 8 4.41z" },
              ].map(c => (
                <span
                  key={c.sym}
                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#1a0f38]/60"
                  style={{ border: `1px solid ${c.color}40` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill={c.color}>
                    <path d={c.path} />
                  </svg>
                  <span className="text-[9px] font-bold tracking-widest" style={{ color: c.color }}>{c.sym}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[11px] text-slate-600">© {new Date().getFullYear()} ZakPubgSkin. All rights reserved.</span>
            <span className="text-[10px] text-slate-700 uppercase tracking-widest">Premium VIP · Crypto Only</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
