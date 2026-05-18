import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Loader2, CheckCircle2, XCircle, MailCheck } from "lucide-react";
import PageShell from "@/components/PageShell";

export default function VerifyEmail() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Verifying your email…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) { setState("error"); setMessage("Missing verification token."); return; }
    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.message || "Verification failed");
        setState("success");
        setMessage(d.message || "Email verified.");
        setTimeout(() => navigate("/account"), 2500);
      })
      .catch((e) => { setState("error"); setMessage(e.message); });
  }, [navigate]);

  return (
    <PageShell backTo="/" backLabel="Home" maxWidth="max-w-md">
      <div className="text-center mb-6 mt-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 ring-1 ring-inset ring-cyan-400/30 text-cyan-200 text-[11px] font-bold uppercase tracking-widest">
          <MailCheck className="w-3.5 h-3.5" /> Email Verification
        </span>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
          Email <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Verification</span>
        </h1>
      </div>

      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-8 text-center">
        {state === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto mb-4" />
            <p className="text-sm text-slate-300">{message}</p>
          </>
        )}
        {state === "success" && (
          <>
            <CheckCircle2 className="h-14 w-14 text-lime-400 mx-auto mb-4" />
            <p className="text-base font-bold text-white mb-2">{message}</p>
            <p className="text-xs text-slate-400">Redirecting to your account…</p>
          </>
        )}
        {state === "error" && (
          <>
            <XCircle className="h-14 w-14 text-red-400 mx-auto mb-4" />
            <p className="text-base font-bold text-white mb-2">{message}</p>
            <Link href="/account" className="inline-block mt-4 text-cyan-300 hover:text-cyan-200 text-sm font-semibold">Go to account →</Link>
          </>
        )}
      </div>
    </PageShell>
  );
}
