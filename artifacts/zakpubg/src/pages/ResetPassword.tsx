import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Lock, KeyRound, Eye, EyeOff, Check, X, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";

function passwordChecks(pw: string) {
  return [
    { ok: pw.length >= 8, label: "8+ chars" },
    { ok: /[A-Z]/.test(pw), label: "Uppercase" },
    { ok: /[a-z]/.test(pw), label: "Lowercase" },
    { ok: /[0-9]/.test(pw), label: "Number" },
  ];
}

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) setIdentifier(id);
  }, []);

  const checks = useMemo(() => passwordChecks(password), [password]);
  const pwValid = checks.every((c) => c.ok);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!pwValid) { setError("Password doesn't meet requirements"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, code, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      setSuccess(true);
      setTimeout(() => navigate("/sign-in"), 1500);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <PageShell backTo="/sign-in" backLabel="Sign In" maxWidth="max-w-md">
      <div className="text-center mb-6 mt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 ring-1 ring-inset ring-violet-400/30 text-violet-200 text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> New Password
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
          Set new <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">password</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">Enter the 6-digit code from your email and your new password.</p>
      </div>

      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-6">
        {success ? (
          <div className="bg-lime-500/10 ring-1 ring-inset ring-lime-400/30 rounded-xl p-4 text-sm text-lime-200">
            ✅ Password reset successful! Redirecting to login...
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username or Email</span>
              <div className="mt-1.5 flex items-center gap-3 px-3 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-violet-400/50">
                <input type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm py-2.5 text-white" data-testid="input-identifier" />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">6-digit Code</span>
              <div className="mt-1.5 flex items-center gap-3 px-3 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-violet-400/50">
                <KeyRound className="h-4 w-4 text-violet-300" />
                <input type="text" required maxLength={6} pattern="[0-9]{6}" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="w-full bg-transparent outline-none text-sm py-2.5 font-mono tracking-[0.3em] placeholder:text-slate-600 text-white"
                  data-testid="input-code" />
              </div>
            </label>

            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</span>
              <div className="mt-1.5 flex items-center gap-3 px-3 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-violet-400/50">
                <Lock className="h-4 w-4 text-violet-300" />
                <input type={showPw ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent outline-none text-sm py-2.5 placeholder:text-slate-600 text-white"
                  data-testid="input-password" />
                <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Hide password" : "Show password"} className="text-slate-400 hover:text-violet-300">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>

            <div className="grid grid-cols-4 gap-1.5 text-[10px] font-mono">
              {checks.map((c) => (
                <div key={c.label} className={`inline-flex items-center gap-1 ${c.ok ? "text-lime-400" : "text-slate-500"}`}>
                  {c.ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {c.label}
                </div>
              ))}
            </div>

            {error && (
              <div className="text-xs font-mono text-red-300 bg-red-500/10 ring-1 ring-inset ring-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-black uppercase tracking-wider text-xs h-11 rounded-xl shadow-lg shadow-violet-500/30 hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:hover:scale-100"
              data-testid="button-reset">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </PageShell>
  );
}
