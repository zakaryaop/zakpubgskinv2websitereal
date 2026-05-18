import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { Crown, Clock, Download, Send, RefreshCw, ShieldCheck, Calendar, Loader2, ArrowLeft, Sparkles, ExternalLink, Lock, ShoppingCart } from "lucide-react";
import { useAuth } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";

type Membership = {
  id: number;
  status: string;
  expiresAt: string | null;
  telegramInviteLink: string | null;
  productId: number;
  gameId: number;
  paymentId: number;
};

type MembershipWithProduct = Membership & {
  productTitle?: string;
  durationDays?: number;
  downloadLink?: string | null;
};

function useCountdown(expiresAt: string | null) {
  const [left, setLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: false });
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }); return; }
      setLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
        expired: false,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return left;
}

function TimerBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="w-full py-2.5 rounded-2xl bg-white/[0.05] border border-white/[0.08] text-center">
        <span className="text-xl font-black text-white font-mono tabular-nums">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="text-[9px] uppercase tracking-widest font-bold text-slate-500">{label}</span>
    </div>
  );
}

function MembershipCard({ m }: { m: MembershipWithProduct }) {
  const timer = useCountdown(m.expiresAt);
  const [downloading, setDownloading] = useState(false);
  const [dlErr, setDlErr] = useState("");
  const token = localStorage.getItem("zakpubg_auth_token") || "";

  const expiryDate = m.expiresAt
    ? new Date(m.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
    : "—";

  const durationLabel = m.durationDays
    ? `${m.durationDays}-Day VIP Key`
    : "VIP Access";

  async function handleDownload() {
    setDownloading(true); setDlErr("");
    try {
      const r = await fetch("/api/vip/download-token", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { "x-auth-token": token } : {}) },
        body: JSON.stringify({ fileName: "vip-guide.zip" }),
      });
      if (!r.ok) { setDlErr("Download unavailable. Contact support."); return; }
      const d = await r.json();
      const a = document.createElement("a");
      a.href = d.downloadUrl;
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch { setDlErr("Download failed. Try again."); }
    finally { setDownloading(false); }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-[#0e0c1e]">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-fuchsia-500 flex items-center justify-center shadow-[0_8px_24px_-8px_rgba(251,191,36,0.7)] shrink-0">
            <Crown className="w-6 h-6 text-slate-950" strokeWidth={2.5} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90">VIP ACTIVE</span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-lime-400/15 text-lime-300 border border-lime-400/25">✓ LIVE</span>
            </div>
            <p className="text-base font-black text-white truncate mt-0.5">{durationLabel}</p>
            {m.productTitle && <p className="text-xs text-slate-400 truncate">{m.productTitle}</p>}
          </div>
        </div>

        {!timer.expired && m.expiresAt && (
          <div className="mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">Time Remaining</p>
            <div className="flex gap-2">
              <TimerBox value={timer.days} label="Days" />
              <TimerBox value={timer.hours} label="Hrs" />
              <TimerBox value={timer.minutes} label="Min" />
              <TimerBox value={timer.seconds} label="Sec" />
            </div>
          </div>
        )}
        {timer.expired && (
          <div className="mb-4 px-3 py-2 rounded-xl bg-red-500/10 border border-red-400/20 text-xs font-bold text-red-300">
            ⚠ VIP expired — renew to regain access
          </div>
        )}

        <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-3 mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Expires</p>
              <p className="text-xs font-bold text-slate-200">{expiryDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-violet-400 shrink-0" />
            <div className="text-right">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider">Order ID</p>
              <p className="text-xs font-bold text-violet-300">#{m.paymentId}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          {m.telegramInviteLink && (
            <a href={m.telegramInviteLink} target="_blank" rel="noopener noreferrer"
              className="group relative w-full py-3.5 rounded-2xl font-black text-[13px] text-white overflow-hidden flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 8px 24px -8px rgba(16,185,129,0.55)" }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <Send className="w-4 h-4 relative" strokeWidth={2.5} />
              <span className="relative">Join VIP Telegram Group</span>
              <ExternalLink className="w-3.5 h-3.5 relative opacity-60" />
            </a>
          )}

          {/* Product-specific download link */}
          {m.downloadLink ? (
            <a
              href={timer.expired ? undefined : m.downloadLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={timer.expired ? e => e.preventDefault() : undefined}
              className="group relative w-full py-3.5 rounded-2xl font-black text-[13px] text-white overflow-hidden flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
              style={timer.expired
                ? { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", opacity: 0.4, cursor: "not-allowed" }
                : { background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)" }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <Download className="w-4 h-4 relative" strokeWidth={2.5} />
              <span className="relative">Download VIP Files</span>
              <ExternalLink className="w-3.5 h-3.5 relative opacity-60" />
            </a>
          ) : (
            <button onClick={handleDownload} disabled={downloading || timer.expired}
              className="group relative w-full py-3.5 rounded-2xl font-black text-[13px] text-white overflow-hidden flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-40"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)" }}>
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              {downloading ? <Loader2 className="w-4 h-4 relative animate-spin" /> : <Download className="w-4 h-4 relative" strokeWidth={2.5} />}
              <span className="relative">{downloading ? "Preparing…" : "Download VIP Files"}</span>
            </button>
          )}
          {dlErr && <p className="text-xs text-red-400 text-center">{dlErr}</p>}
        </div>
      </div>
    </div>
  );
}

export default function VipDashboard() {
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [memberships, setMemberships] = useState<MembershipWithProduct[]>([]);
  const [fetching, setFetching] = useState(true);
  const [err, setErr] = useState("");

  const fetchMemberships = useCallback(async () => {
    setFetching(true); setErr("");
    try {
      const token = localStorage.getItem("zakpubg_auth_token") || "";
      const r = await fetch("/api/my/memberships", {
        headers: token ? { "x-auth-token": token } : {},
      });
      if (r.status === 401) { navigate("/sign-in"); return; }
      if (!r.ok) { setErr("Failed to load memberships"); return; }
      const d = await r.json();
      const list: MembershipWithProduct[] = (d.memberships || []);
      setMemberships(list.filter(m => m.status === "active"));
    } catch { setErr("Network error. Please retry."); }
    finally { setFetching(false); }
  }, [navigate]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/sign-in"); return; }
    if (!authLoading && user) fetchMemberships();
  }, [authLoading, user, fetchMemberships, navigate]);

  if (authLoading || fetching) {
    return (
      <div className="min-h-screen bg-[#070710] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070710] text-white">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute -top-32 left-1/4 w-80 h-80 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 rounded-full bg-fuchsia-600/10 blur-3xl" />
      </div>

      <nav className="sticky top-0 z-40 bg-[#070710]/90 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate("/")} className="flex items-center gap-2">
            <BrandLogo size={26} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
            <span className="font-black text-sm tracking-tight">
              <span className="text-white">ZAK</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
              <span className="text-white">SKIN</span>
            </span>
          </button>
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-400/25 px-3 py-1.5 rounded-full">VIP Portal</span>
        </div>
      </nav>

      <div className="relative max-w-lg mx-auto px-4 pt-6 pb-12 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-slate-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        </div>

        <div className="text-center py-4">
          <div className="relative inline-block mb-3">
            <div className="absolute -inset-3 rounded-full bg-amber-400/20 blur-2xl" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 via-fuchsia-500 to-violet-600 flex items-center justify-center shadow-[0_16px_40px_-8px_rgba(251,191,36,0.5)] mx-auto">
              <Sparkles className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white">VIP Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Your active memberships & download links</p>
        </div>

        {err && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-400/20 text-sm text-red-300 text-center">
            {err}
            <button onClick={fetchMemberships} className="block mx-auto mt-2 text-xs font-bold text-red-300 underline">Retry</button>
          </div>
        )}

        {!err && memberships.length === 0 && (
          <div className="relative overflow-hidden rounded-3xl border border-violet-500/20 text-center py-10 px-6"
            style={{ background: "linear-gradient(135deg,#0e0c1e 0%,#0a0818 100%)" }}>
            {/* Glow blobs */}
            <div className="pointer-events-none absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-12 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-fuchsia-500/15 blur-3xl" />
            <div className="relative">
              {/* Lock icon */}
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-slate-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-black text-white mb-1">VIP Access Locked</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-1">
                You don't have an active VIP membership yet.
              </p>
              <p className="text-slate-500 text-xs mb-6">
                Purchase a plan to unlock downloads, Telegram group & all VIP features.
              </p>
              {/* Feature chips */}
              <div className="flex flex-wrap justify-center gap-2 mb-7">
                {[
                  { icon: <Download className="w-3 h-3" />, label: "VIP Files" },
                  { icon: <Send className="w-3 h-3" />, label: "Telegram Group" },
                  { icon: <Clock className="w-3 h-3" />, label: "Instant Access" },
                  { icon: <ShieldCheck className="w-3 h-3" />, label: "100% Safe" },
                ].map(f => (
                  <span key={f.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[10px] font-bold text-slate-400">
                    {f.icon} {f.label}
                  </span>
                ))}
              </div>
              <button onClick={() => navigate("/")}
                className="group relative w-full py-3.5 rounded-2xl font-black text-[14px] text-white overflow-hidden flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#7c3aed,#06b6d4)", boxShadow: "0 8px 32px -8px rgba(124,58,237,0.6)" }}>
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <ShoppingCart className="w-4 h-4 relative" strokeWidth={2.5} />
                <span className="relative">Buy VIP Access Now</span>
              </button>
              <p className="text-[10px] text-slate-600 mt-3">Crypto accepted · Instant activation · No KYC</p>
            </div>
          </div>
        )}

        {memberships.map(m => <MembershipCard key={m.id} m={m} />)}

        {memberships.length > 0 && (
          <div className="flex items-center justify-center gap-1.5 pt-2">
            <button onClick={fetchMemberships} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-violet-300 transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh memberships
            </button>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <Clock className="w-4 h-4 text-cyan-300 mx-auto" />, label: "Live Timer" },
            { icon: <Download className="w-4 h-4 text-violet-300 mx-auto" />, label: "Downloads" },
            { icon: <Send className="w-4 h-4 text-green-300 mx-auto" />, label: "VIP Group" },
          ].map(i => (
            <div key={i.label} className="flex flex-col items-center gap-1.5">
              {i.icon}
              <span className="text-[10px] font-bold text-slate-400">{i.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
