import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, Send, CheckCircle2, Sparkles } from "lucide-react";
import PageShell from "@/components/PageShell";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setMessage(null); setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Request failed");
      setMessage(data.message);
      setSubmitted(true);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <PageShell backTo="/sign-in" backLabel="Sign In" maxWidth="max-w-md">
      <div className="text-center mb-6 mt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 ring-1 ring-inset ring-violet-400/30 text-violet-200 text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> Reset Password
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
          Forgot <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Password?</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">
          Enter your username or email — we'll send a 6-digit code to your email.
        </p>
      </div>

      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-6">
        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3 bg-lime-500/10 ring-1 ring-inset ring-lime-400/30 rounded-xl p-4">
              <CheckCircle2 className="h-5 w-5 text-lime-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold">Request received</p>
                <p className="text-xs text-slate-400 mt-1">{message}</p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/reset-password?id=${encodeURIComponent(identifier)}`)}
              className="w-full inline-flex items-center justify-center gap-2 bg-white text-black font-black uppercase tracking-wider text-xs h-11 rounded-xl hover:scale-[1.01] transition-transform"
              data-testid="button-enter-code"
            >
              I have a code → Enter it
            </button>
            <p className="text-[11px] text-slate-500 text-center">
              Didn't receive a code? Check your spam folder or contact support.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Username or Email</span>
              <div className="mt-1.5 flex items-center gap-3 px-3 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 focus-within:ring-violet-400/50 transition-colors">
                <Send className="h-4 w-4 text-violet-300" />
                <input
                  type="text" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="username or email"
                  className="w-full bg-transparent outline-none text-sm py-2.5 placeholder:text-slate-500 text-white"
                  data-testid="input-identifier"
                />
              </div>
            </label>

            {error && (
              <div className="text-xs font-mono text-red-300 bg-red-500/10 ring-1 ring-inset ring-red-500/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-black uppercase tracking-wider text-xs h-11 rounded-xl shadow-lg shadow-violet-500/30 hover:scale-[1.01] transition-transform disabled:opacity-60 disabled:hover:scale-100"
              data-testid="button-send-code">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Send Reset Code"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Remember your password?{" "}
          <Link href="/sign-in" className="text-violet-300 hover:text-violet-200 font-semibold">Sign in</Link>
        </p>
      </div>
    </PageShell>
  );
}
