import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, LogOut, Mail, User as UserIcon, Send, Calendar, Shield, Crown,
  Pencil, Check, X, Loader2, KeyRound, ArrowRight, Sparkles, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import SiteFooter from "@/components/SiteFooter";
import BrandLogo from "@/components/BrandLogo";

export default function Account() {
  const [, navigate] = useLocation();
  const { user, loading, logout, updateTelegramId } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/sign-in");
  }, [loading, user, navigate]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <Loader2 className="w-7 h-7 text-violet-400 animate-spin" />
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  const initials = (user.username || "U").slice(0, 2).toUpperCase();
  const memberSince = new Date(user.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      {/* Top bar */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-[#080810]/85 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-2.5 sm:px-5 h-14 flex items-center justify-between gap-2">
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
                <span className="text-white">ZAK</span>
                <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
                <span className="text-white">SKIN</span>
              </span>
            </button>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-300 hover:text-red-300 px-3 py-1.5 rounded-full bg-white/5 hover:bg-red-500/10 border border-white/10 hover:border-red-400/30 transition-all"
            data-testid="button-logout-top"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </nav>

      <div className="pt-14 pb-12">
        {/* Back */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5 pt-4 pb-3">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Home
          </button>
        </div>

        {/* Profile Hero */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-600/15 via-fuchsia-500/10 to-cyan-500/15">
            <div aria-hidden className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-violet-500/30 blur-3xl" />
            <div aria-hidden className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-cyan-500/25 blur-3xl" />
            <div className="relative p-5 sm:p-7 flex items-center gap-4 sm:gap-5">
              <div className="relative shrink-0">
                <div aria-hidden className="absolute inset-0 rounded-2xl blur-md bg-gradient-to-br from-violet-500 to-cyan-400 opacity-70" />
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.username} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-2 ring-white/30" />
                ) : (
                  <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 flex items-center justify-center ring-2 ring-white/30">
                    <span className="text-xl sm:text-2xl font-black text-white">{initials}</span>
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-300/80 mb-1">My Account</div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight truncate">
                  Hi, <span className="bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">{user.username}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300/80 mt-1 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Info cards */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5 mt-5 grid sm:grid-cols-2 gap-3 sm:gap-4">
          <InfoCard icon={<UserIcon className="w-4 h-4" />} label="Username" value={user.username} testId="info-username" />
          <InfoCard icon={<Mail className="w-4 h-4" />} label="Email" value={user.email} testId="info-email" />
          <TelegramCard currentValue={user.telegramId} onSave={updateTelegramId} />
          <InfoCard icon={<Calendar className="w-4 h-4" />} label="Member Since" value={memberSince} testId="info-created" />
        </div>

        {/* VIP Membership */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5 mt-5">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#12121c] p-5 sm:p-6">
            <div aria-hidden className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-amber-400/15 blur-3xl" />
            <div className="relative flex items-start gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-amber-300 to-fuchsia-500 flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(251,191,36,0.6)]">
                <Crown className="w-6 h-6 text-slate-950" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-amber-300/80">VIP Membership</div>
                <h2 className="text-lg sm:text-xl font-black text-white mt-1">Unlock Premium VIP Access</h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                  Get exclusive aimbot, ESP, configs, sensitivity settings, and 24/7 Telegram support — instant delivery.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate("/")}
                    className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 shadow-[0_8px_24px_-8px_rgba(139,92,246,0.6)] transition-all"
                    data-testid="button-view-plans"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Browse Games
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate("/contact")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all"
                    data-testid="button-contact-support"
                  >
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5 mt-5">
          <div className="rounded-2xl border border-white/10 bg-[#12121c] p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-emerald-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-300/80">Account Security</div>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">Keep Your Account Safe</h3>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                  Change your password regularly and link your Telegram for easy account recovery.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => navigate("/forgot-password")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-400/40 hover:text-white transition-all"
                    data-testid="button-change-password"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Change Password
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-red-300 bg-red-500/5 border border-red-400/20 hover:bg-red-500/10 hover:border-red-400/40 transition-all"
                    data-testid="button-logout"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-5xl mx-auto px-3 sm:px-5 mt-5">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1">
              <Shield className="w-4 h-4 text-emerald-300" />
              <div className="text-[10px] font-bold text-slate-200">Encrypted</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Crown className="w-4 h-4 text-amber-300" />
              <div className="text-[10px] font-bold text-slate-200">VIP Ready</div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Send className="w-4 h-4 text-cyan-300" />
              <div className="text-[10px] font-bold text-slate-200">Telegram Linked</div>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function InfoCard({ icon, label, value, testId }: { icon: React.ReactNode; label: string; value: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121c] p-4 sm:p-5 hover:border-white/20 transition-colors" data-testid={testId}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-400/20 text-violet-300 flex items-center justify-center">{icon}</span>
        <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">{label}</span>
      </div>
      <p className="text-sm text-white font-semibold break-all">{value}</p>
    </div>
  );
}

function TelegramCard({ currentValue, onSave }: { currentValue: string | null; onSave: (val: string | null) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(currentValue || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() { setValue(currentValue || ""); setError(null); setEditing(true); }
  function cancel() { setEditing(false); setError(null); }
  async function save() {
    setSaving(true); setError(null);
    try {
      const trimmed = value.trim().replace(/^@/, "");
      await onSave(trimmed || null);
      setEditing(false);
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally { setSaving(false); }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121c] p-4 sm:p-5 hover:border-white/20 transition-colors" data-testid="info-telegram">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 flex items-center justify-center">
            <Send className="w-4 h-4" />
          </span>
          <span className="text-[10px] uppercase tracking-widest font-black text-slate-500">Telegram ID</span>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-slate-500 hover:text-violet-300 p-1 rounded transition-colors"
            aria-label="Edit Telegram ID"
            data-testid="button-edit-telegram"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-violet-400/40 bg-black/40 focus-within:border-violet-400 transition-colors">
            <span className="text-slate-500 text-sm">@</span>
            <input
              type="text"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="username"
              autoFocus
              maxLength={64}
              className="w-full bg-transparent outline-none text-sm text-white py-1 placeholder:text-slate-600"
              data-testid="input-telegram"
            />
          </div>
          {error && <p className="text-xs text-red-400" data-testid="text-telegram-error">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-60 transition-colors"
              data-testid="button-save-telegram"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
            </button>
            <button
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              data-testid="button-cancel-telegram"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-white font-semibold break-all">
          {currentValue ? `@${currentValue}` : <span className="text-slate-500 font-normal italic">— not linked —</span>}
        </p>
      )}
    </div>
  );
}
