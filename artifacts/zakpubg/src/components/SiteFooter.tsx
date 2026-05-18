import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Mail } from "lucide-react";
import { getGames } from "../lib/api";
import BrandLogo from "./BrandLogo";

type Game = { id: number; slug: string; name: string };

function Brand() {
  return (
    <span className="font-black text-lg tracking-tight leading-none">
      <span className="text-white">ZAK</span>
      <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
      <span className="text-white">SKIN</span>
    </span>
  );
}

export default function SiteFooter({ games: gamesProp }: { games?: Game[] }) {
  const [, navigate] = useLocation();
  const [games, setGames] = useState<Game[]>(gamesProp || []);

  useEffect(() => {
    if (gamesProp && gamesProp.length) return;
    getGames().then(d => setGames(d.games || [])).catch(() => {});
  }, [gamesProp]);

  return (
    <footer className="relative border-t border-white/5 bg-gradient-to-b from-[#0a0a14] to-[#050509] mt-4">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

      <div className="max-w-5xl mx-auto px-5 pt-10 pb-5">
        {/* Brand row */}
        <div className="text-center mb-6 sm:mb-8">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2.5 mb-2.5" aria-label="ZakPubgSkin home">
            <BrandLogo size={40} className="drop-shadow-[0_0_18px_rgba(168,85,247,0.5)]" />
            <Brand />
          </button>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm mx-auto">
            Premium VIP cheats &amp; tools for PUBG variants. Instant delivery, crypto payments, 100% safe.
          </p>
          <div className="flex justify-center gap-2.5 mt-4">
            {[
              { href: "https://t.me/zakpubgskin", label: "Telegram", color: "#229ED9",
                svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg> },
              { href: "https://wa.me/923192530306", label: "WhatsApp", color: "#25D366",
                svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.073zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg> },
              { href: "https://www.tiktok.com/@zakpubgskin5", label: "TikTok", color: "#FF0050",
                svg: <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg> },
              { href: "mailto:zakpubgskin@gmail.com", label: "Email", color: "#A78BFA",
                svg: <Mail className="w-[18px] h-[18px]" strokeWidth={2} /> },
            ].map((s) => (
              <a key={s.label} href={s.href}
                {...(s.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                aria-label={s.label}
                className="group relative w-10 h-10 rounded-xl bg-slate-900/70 backdrop-blur-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:bg-slate-900"
                style={{ border: `1px solid ${s.color}55`, color: s.color, boxShadow: `0 0 0 1px ${s.color}22, 0 4px 16px -6px ${s.color}80` }}>
                <span aria-hidden className="pointer-events-none absolute -top-px left-2 right-2 h-px" style={{ background: `linear-gradient(90deg, transparent, ${s.color}, transparent)` }} />
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
                  <button onClick={() => navigate(`/games/${g.slug}`)} className="hover:text-violet-300 transition-colors text-left">{g.name}</button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-widest mb-3">Company</h4>
            <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-500">
              {[{ l: "Support", p: "/support" }, { l: "Contact", p: "/contact" }, { l: "VIP Portal", p: "/portal" }].map(i => (
                <li key={i.p}><button onClick={() => navigate(i.p)} className="hover:text-violet-300 transition-colors text-left">{i.l}</button></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-black text-white text-[10px] sm:text-xs uppercase tracking-widest mb-3">Legal</h4>
            <ul className="space-y-1.5 text-[11px] sm:text-xs text-slate-500">
              {[{ l: "Terms", p: "/terms" }, { l: "Privacy", p: "/privacy" }, { l: "Sign In", p: "/sign-in" }].map(i => (
                <li key={i.p}><button onClick={() => navigate(i.p)} className="hover:text-violet-300 transition-colors text-left">{i.l}</button></li>
              ))}
            </ul>
          </div>
        </div>

        {/* Crypto badges */}
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
              <span key={c.sym} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/60" style={{ border: `1px solid ${c.color}40` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color, boxShadow: `0 0 6px ${c.color}` }} />
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill={c.color}><path d={c.path} /></svg>
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
  );
}
