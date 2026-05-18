import { useEffect } from "react";
import { useLocation } from "wouter";
import {
  X, LogIn, UserPlus, LogOut, Gamepad2, Home as HomeIcon,
  Headset, FileText, Shield, Send, Sparkles, Zap, ChevronRight, ChevronDown, Crown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import { getGameBanner, isGlobalGame, getGameIcon, hasIcon } from "@/lib/gameImage";

type Game = { id: number; slug: string; name: string; bannerUrl?: string | null; color?: string | null };

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  games: Game[];
}

export function Sidebar({ open, onClose, games }: SidebarProps) {
  const [, navigate] = useLocation();
  const { user, logout } = useAuth();

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[82%] max-w-[320px] bg-slate-950 border-r border-white/10 z-50 transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Scroll-down hint chip — pulses to tell user there's more below */}
        {open && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-violet-600/30 border border-violet-400/40 backdrop-blur-md text-[9px] font-bold uppercase tracking-wider text-violet-100 shadow-lg animate-bounce">
            <ChevronDown className="w-3 h-3" strokeWidth={2.8} /> Scroll
          </div>
        )}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-2.5">
            <BrandLogo size={36} className="drop-shadow-[0_0_12px_rgba(168,85,247,0.55)]" />
            <div className="font-black text-white text-sm tracking-tight">
              ZAK<span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>SKIN
            </div>
          </div>
          <button onClick={onClose} aria-label="Close menu" className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain" style={{ WebkitOverflowScrolling: "touch" }}>
          <div className="p-4">
            {user ? (
              <div className="space-y-2">
                <button
                  onClick={() => go("/account")}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all"
                >
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-purple-600 flex items-center justify-center text-sm font-black text-white">
                      {user.username[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-bold text-white text-sm truncate">{user.username}</div>
                    <div className="text-cyan-400 text-[10px] font-bold uppercase tracking-wider">My Account</div>
                  </div>
                </button>
                <button
                  onClick={() => go("/vip-dashboard")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-amber-400/20 hover:border-amber-400/40 text-sm font-bold transition-all"
                  style={{ background: "rgba(251,191,36,0.07)", color: "#fbbf24" }}
                >
                  <Crown className="w-4 h-4" />
                  VIP Portal
                </button>
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-slate-300 hover:text-red-400 text-sm font-semibold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => go("/sign-in")}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-white/10 hover:border-white/30 bg-white/5 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
                <button
                  onClick={() => go("/sign-up")}
                  className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/30 transition-all hover:opacity-90"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Sign Up
                </button>
              </div>
            )}
          </div>

          <div className="p-3">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Games</span>
            </div>
            <div className="space-y-1">
              {games.map((g) => {
                const color = g.color || "#22d3ee";
                return (
                  <button
                    key={g.id}
                    onClick={() => go(`/games/${g.slug}`)}
                    className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group"
                  >
                    {hasIcon(g) ? (
                      <img src={getGameIcon(g)} className="w-10 h-10 rounded-lg object-cover object-center flex-shrink-0" alt="" />
                    ) : g.bannerUrl || isGlobalGame(g) ? (
                      <img src={getGameBanner(g)} className="w-10 h-10 rounded-lg object-cover object-center flex-shrink-0" alt="" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${color}20` }}>
                        <Gamepad2 className="w-5 h-5" style={{ color }} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="font-bold text-white text-sm truncate group-hover:text-cyan-300 transition-colors">{g.name}</div>
                      <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>VIP</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3 border-t border-white/5 mt-2">
            <div className="flex items-center gap-2 px-3 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Menu</span>
            </div>
            <div className="space-y-1.5">
              {[
                { icon: HomeIcon, label: "Home", desc: "Browse all games", path: "/", color: "#22d3ee", from: "from-cyan-500/15", ring: "ring-cyan-500/30" },
                { icon: Headset, label: "Support", desc: "Get instant help", path: "/support", color: "#a3e635", from: "from-lime-500/15", ring: "ring-lime-500/30" },
                { icon: FileText, label: "Terms", desc: "Service agreement", path: "/terms", color: "#a78bfa", from: "from-violet-500/15", ring: "ring-violet-500/30" },
                { icon: Shield, label: "Privacy", desc: "Your data is safe", path: "/privacy", color: "#f0abfc", from: "from-fuchsia-500/15", ring: "ring-fuchsia-500/30" },
              ].map(({ icon: Icon, label, desc, path, color, from, ring }) => (
                <button
                  key={path}
                  onClick={() => go(path)}
                  className={`group relative w-full flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-gradient-to-r ${from} via-transparent to-transparent border border-white/5 hover:border-white/15 hover:bg-white/[0.03] transition-all overflow-hidden`}
                >
                  {/* left accent bar */}
                  <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                  {/* icon tile */}
                  <span className={`relative w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ring-1 ring-inset ${ring} group-hover:scale-105 transition-transform`}
                    style={{ background: `${color}18` }}>
                    <Icon className="w-4 h-4" style={{ color }} strokeWidth={2.4} />
                  </span>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="font-bold text-white text-[13px] leading-tight group-hover:translate-x-0.5 transition-transform">{label}</div>
                    <div className="text-[10px] text-slate-500 leading-tight mt-0.5">{desc}</div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          </div>

        {/* Promo card — inside scroll container so it never overflows on small screens */}
        <div className="p-3 border-t border-white/10">
          <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-violet-600/25 via-fuchsia-600/15 to-cyan-500/20 ring-1 ring-inset ring-violet-400/30">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full bg-fuchsia-500/40 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-cyan-500/30 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 ring-1 ring-inset ring-white/20 text-[9px] font-black uppercase tracking-widest text-white mb-2">
                <Sparkles className="w-2.5 h-2.5 text-yellow-300" /> Live
              </div>
              <h4 className="font-black text-white text-sm leading-tight">
                Join our <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-transparent">Telegram</span>
              </h4>
              <p className="text-[10px] text-slate-300 mt-1 mb-3 leading-snug">
                Live drops, configs & VIP support — admin replies in minutes.
              </p>
              <a
                href="https://t.me/zakpubgskin"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-white text-black text-[11px] font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-transform"
              >
                <Send className="w-3.5 h-3.5" /> Open Telegram
              </a>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <div className="text-center">
                  <div className="text-sm font-black text-white">5min</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400">Reply</div>
                </div>
                <div className="text-center border-x border-white/10">
                  <div className="text-sm font-black text-white">24/7</div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400">Support</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-black text-white inline-flex items-center justify-center gap-0.5">
                    <Zap className="w-3 h-3 text-yellow-300" />Fast
                  </div>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400">Delivery</div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-3 pb-[env(safe-area-inset-bottom)]">© 2026 ZakPubgSkin · VIP Access</p>
        </div>
        </div>
      </aside>
    </>
  );
}
