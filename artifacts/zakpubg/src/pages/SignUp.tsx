import { useEffect, useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, Crown, Send, Star, ShieldCheck, AlertTriangle, Gift, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useGoogleLogin } from "@react-oauth/google";
import BrandLogo from "@/components/BrandLogo";

const TG_BOT_URL = "https://t.me/zakpubgskin";

const HAS_GOOGLE = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "At least 8 chars" },
    { ok: /[A-Z]/.test(pw), label: "Uppercase letter" },
    { ok: /[a-z]/.test(pw), label: "Lowercase letter" },
    { ok: /[0-9]/.test(pw), label: "One number" },
  ];
}

function Brand() {
  return (
    <span className="font-black text-base tracking-tight leading-none">
      <span className="text-white">ZAK</span>
      <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
      <span className="text-white">SKIN</span>
    </span>
  );
}

export default function SignUp() {
  const [, navigate] = useLocation();
  const { signup, loginWithGoogle } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const [agree, setAgree] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCf, setShowCf] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [capsOn, setCapsOn] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(true);
  const [online, setOnline] = useState(() => 220 + Math.floor(Math.random() * 90));

  useEffect(() => {
    const t = setInterval(() => setOnline(n => Math.max(180, Math.min(340, n + (Math.random() < 0.5 ? -1 : 1) * Math.ceil(Math.random() * 3)))), 4000);
    return () => clearInterval(t);
  }, []);

  const checks = useMemo(() => passwordChecks(form.password), [form.password]);
  const pwValid = checks.every(c => c.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    if (!form.fullName.trim()) { setErr("Please enter your full name"); return; }
    if (!pwValid) { setErr("Password doesn't meet requirements"); return; }
    if (form.password !== form.confirm) { setErr("Passwords do not match"); return; }
    if (!agree) { setErr("Please accept the Terms & Conditions"); return; }
    setLoading(true);
    try {
      const username = form.fullName.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "").slice(0, 24) || `user_${Date.now()}`;
      await signup({ email: form.email, username, password: form.password });
      navigate("/");
    } catch (e: any) { setErr(e.message || "Signup failed"); }
    finally { setLoading(false); }
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setErr(null); setLoading(true);
      try { await (loginWithGoogle as any)(tokenResponse.access_token, true); navigate("/"); }
      catch (e: any) { setErr(e.message || "Google login failed"); }
      finally { setLoading(false); }
    },
    onError: () => { setErr("Google login failed"); },
  });

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="min-h-[100dvh] relative bg-[#070710] text-white flex flex-col overflow-x-hidden overflow-y-auto pb-[env(safe-area-inset-bottom)]">
      {/* Premium ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-24 -left-16 w-56 sm:w-72 h-56 sm:h-72 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-32 -right-16 w-56 sm:w-72 h-56 sm:h-72 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-56 sm:w-72 h-56 sm:h-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative px-4 pt-3 sm:pt-5 pb-1 grid grid-cols-3 items-center z-10">
        <div className="justify-self-start">
          <button onClick={() => navigate("/")} aria-label="Back to home"
            className="group inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/40 text-slate-300 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            <span className="text-xs font-semibold">Back</span>
          </button>
        </div>
        <button onClick={() => navigate("/")} className="justify-self-center flex items-center gap-2" aria-label="ZakPubgSkin home">
          <BrandLogo size={28} className="drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
          <Brand />
        </button>
        <div />
      </header>

      <div className="relative flex-1 px-4 sm:px-5 pb-5 max-w-sm w-full mx-auto z-10">
        {/* First-time bonus banner */}
        {bonusOpen && (
          <div className="relative mt-3 mb-2 px-3 py-2 rounded-xl bg-gradient-to-r from-yellow-500/15 via-amber-500/10 to-fuchsia-500/15 border border-yellow-400/30 flex items-center gap-2 overflow-hidden">
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(110deg,transparent_30%,rgba(255,255,255,0.15)_50%,transparent_70%)] -translate-x-full animate-[shimmer_3s_linear_infinite]" />
            <Gift className="w-4 h-4 text-yellow-300 shrink-0" strokeWidth={2.4} />
            <div className="flex-1 min-w-0 text-[11px] font-bold text-white">
              New users get <span className="text-yellow-300">10% OFF</span> first VIP
            </div>
            <button onClick={() => setBonusOpen(false)} aria-label="Dismiss" className="text-slate-400 hover:text-white shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Live online strip */}
        <div className="flex items-center justify-center mt-2 mb-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-lime-400/10 border border-lime-400/30 text-[10px] font-bold text-lime-300">
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-lime-400" />
            </span>
            <span className="tabular-nums">{online}</span> players online
          </div>
        </div>

        {/* Minimal hero — small crown icon + title */}
        <div className="text-center mt-2 mb-4">
          <div className="relative inline-block mb-2.5">
            <span aria-hidden className="absolute -inset-2 rounded-full bg-fuchsia-500/30 blur-2xl" />
            <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-500 flex items-center justify-center shadow-[0_10px_30px_-8px_rgba(217,70,239,0.7)] ring-1 ring-inset ring-white/20 mx-auto">
              <Crown className="w-5 h-5 text-white" strokeWidth={2.2} />
            </div>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
            Create <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-400 bg-clip-text text-transparent">Account</span>
          </h1>
          <p className="text-[11px] text-slate-400 mt-0.5">Join the VIP community</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Full Name */}
          <div>
            <label htmlFor="signup-name" className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="signup-name" value={form.fullName} onChange={f("fullName")} placeholder="Enter your full name" autoComplete="name" required
                className="w-full bg-[#12121c] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-base text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-xs font-semibold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="signup-email" type="email" value={form.email} onChange={f("email")} placeholder="Enter your email" autoComplete="email" required
                className="w-full bg-[#12121c] border border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-base text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="signup-password" className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="signup-password" type={showPw ? "text" : "password"} value={form.password} onChange={f("password")}
                onKeyUp={e => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                onKeyDown={e => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                onBlur={() => setCapsOn(false)}
                placeholder="Create a password" autoComplete="new-password" required
                className="w-full bg-[#12121c] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-base text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
              <button type="button" onClick={() => setShowPw(v => !v)} aria-label="Toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {capsOn && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-amber-300">
                <AlertTriangle className="w-3 h-3" strokeWidth={2.6} /> Caps Lock is on
              </div>
            )}
            {form.password.length > 0 && (
              <div className="grid grid-cols-2 gap-1 mt-2">
                {checks.map(c => (
                  <div key={c.label} className={`flex items-center gap-1 text-[10px] ${c.ok ? "text-lime-400" : "text-slate-600"}`}>
                    <span>{c.ok ? "✓" : "○"}</span>{c.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="signup-confirm" className="block text-xs font-semibold text-slate-300 mb-1.5">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input id="signup-confirm" type={showCf ? "text" : "password"} value={form.confirm} onChange={f("confirm")}
                onKeyUp={e => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                onKeyDown={e => setCapsOn(e.getModifierState && e.getModifierState("CapsLock"))}
                onBlur={() => setCapsOn(false)}
                placeholder="Confirm your password" autoComplete="new-password" required
                className="w-full bg-[#12121c] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-base text-white placeholder-slate-600 focus:outline-none focus:border-violet-500/50 transition-colors" />
              <button type="button" onClick={() => setShowCf(v => !v)} aria-label="Toggle confirm password" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                {showCf ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-2 cursor-pointer select-none group">
            <span className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center transition-all shrink-0 ${agree ? "bg-gradient-to-br from-violet-500 to-fuchsia-500" : "bg-[#12121c] border border-white/15"}`}>
              {agree && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </span>
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="sr-only" />
            <span className="text-xs text-slate-400 leading-snug">
              I agree to the{" "}
              <Link href="/terms" className="font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Terms &amp; Conditions</Link>
            </span>
          </label>

          {err && <p className="text-red-400 text-xs bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">{err}</p>}

          <button type="submit" disabled={loading}
            className="relative w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 hover:from-violet-500 hover:via-fuchsia-400 hover:to-cyan-400 font-bold text-sm disabled:opacity-50 transition-all shadow-[0_10px_30px_-8px_rgba(168,85,247,0.7)] hover:shadow-[0_15px_40px_-8px_rgba(168,85,247,0.9)] active:scale-[0.98] overflow-hidden group">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <span className="relative">{loading ? "Creating account…" : "Sign Up"}</span>
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500">Or sign up with</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Social buttons — Google + Telegram side by side */}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button"
            onClick={() => HAS_GOOGLE ? googleLogin() : setErr("Google login not configured")}
            disabled={loading}
            className="h-11 rounded-xl bg-white hover:bg-gray-100 active:bg-gray-200 flex items-center justify-center gap-2 text-xs font-bold text-gray-800 transition-all shadow-md disabled:opacity-50">
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <a href={TG_BOT_URL} target="_blank" rel="noopener noreferrer"
            className="h-11 rounded-xl bg-[#229ED9] hover:bg-[#1f8fc4] flex items-center justify-center gap-2 text-xs font-bold text-white transition-all shadow-[0_6px_20px_-6px_rgba(34,158,217,0.6)]">
            <Send className="w-4 h-4" strokeWidth={2.6} fill="currentColor" />
            Telegram
          </a>
        </div>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-3 mt-4 text-[10px] text-slate-500">
          <span className="inline-flex items-center gap-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" strokeWidth={0} /> 4.9
          </span>
          <span className="w-px h-3 bg-white/10" />
          <span className="inline-flex items-center gap-1 text-slate-400">12K+ players</span>
          <span className="w-px h-3 bg-white/10" />
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-lime-400" strokeWidth={2.6} /> Trusted
          </span>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4 pb-4">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent hover:from-violet-300 hover:to-fuchsia-300">Login</Link>
        </p>
      </div>
    </div>
  );
}
