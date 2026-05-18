import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Clock, X, ChevronUp, ChevronDown, RefreshCw, Check, ExternalLink } from "lucide-react";
import { getPaymentStatus, getManualPaymentStatus } from "../lib/api";
import { fireConfetti } from "../lib/confetti";

/* ── Storage keys ── */
const CRYPTO_KEY = "zakpubg_pending_payment";
const MANUAL_KEY = "zakpubg_pending_manual";
const STALE_MS   = 3 * 60 * 60 * 1000; // 3 hours

/* ── Types ── */
type CryptoPending = {
  type: "crypto";
  paymentId: number;
  productTitle: string;
  days: number | null;
  timestamp: number;
};

type ManualPending = {
  type: "manual";
  paymentId: number;
  methodId: string;
  productTitle: string;
  days: number;
  timestamp: number;
};

type AnyPending = CryptoPending | ManualPending;

const METHOD_META: Record<string, { label: string; color: string }> = {
  jazz:      { label: "JazzCash",    color: "#e91e63" },
  easypaisa: { label: "Easypaisa",   color: "#00a651" },
  nayapay:   { label: "NayaPay",     color: "#8b5cf6" },
  meezan:    { label: "Meezan Bank", color: "#1d6f42" },
  binance:   { label: "Binance Pay", color: "#f3ba2f" },
  crypto:    { label: "Crypto",      color: "#f59e0b" },
};

function getAccent(p: AnyPending) {
  if (p.type === "manual") return METHOD_META[p.methodId] ?? { label: p.methodId, color: "#6366f1" };
  return METHOD_META.crypto;
}

/* ── Load helpers ── */
function loadFromStorage(): AnyPending | null {
  try {
    /* Manual payment takes priority */
    const m = localStorage.getItem(MANUAL_KEY);
    if (m) {
      const d = JSON.parse(m) as ManualPending;
      if (d?.paymentId && Date.now() - d.timestamp < STALE_MS) return d;
      localStorage.removeItem(MANUAL_KEY);
    }
    /* Fallback to crypto */
    const c = localStorage.getItem(CRYPTO_KEY);
    if (c) {
      const d = JSON.parse(c) as CryptoPending;
      if (d?.paymentId && Date.now() - d.timestamp < STALE_MS) return d;
      localStorage.removeItem(CRYPTO_KEY);
    }
  } catch {}
  return null;
}

/* ── Component ── */
export default function PendingPaymentToast() {
  const [, navigate] = useLocation();

  const [pending, setPending]     = useState<AnyPending | null>(null);
  const [open, setOpen]           = useState(false);
  const [checking, setChecking]   = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [result, setResult]       = useState<"pending" | "approved" | "rejected">("pending");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Load + storage event */
  const reload = useCallback(() => { setPending(loadFromStorage()); }, []);
  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === MANUAL_KEY || e.key === CRYPTO_KEY) reload();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [reload]);

  /* ── Check status ── */
  const checkStatus = useCallback(async (p: AnyPending, silent = false) => {
    if (!silent) setChecking(true);
    try {
      let status = "waiting";
      let inviteLink: string | null = null;

      if (p.type === "manual") {
        const d = await getManualPaymentStatus(p.paymentId);
        status = d.status;
        inviteLink = d.inviteLink ?? null;
      } else {
        const d = await getPaymentStatus(p.paymentId);
        status = d.status;
        inviteLink = d.inviteLink ?? null;
      }

      if (!silent) setLastChecked(new Date());

      if (status === "finished" || status === "confirmed") {
        setResult("approved");
        localStorage.removeItem(p.type === "manual" ? MANUAL_KEY : CRYPTO_KEY);
        fireConfetti(120);
        /* Keep popup open briefly to show approved, then navigate */
        setTimeout(() => { setPending(null); setOpen(false); navigate("/account"); }, 2500);
        return;
      }
      if (status === "failed") {
        setResult("rejected");
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    } catch {}
    if (!silent) setChecking(false);
  }, [navigate]);

  /* Background poll every 8s */
  useEffect(() => {
    if (!pending) {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      return;
    }
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => checkStatus(pending, true), 8_000);
    return () => { if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; } };
  }, [pending, checkStatus]);

  function dismiss() {
    localStorage.removeItem(MANUAL_KEY);
    localStorage.removeItem(CRYPTO_KEY);
    setPending(null);
    setOpen(false);
  }

  if (!pending) return null;

  const { label: methodLabel, color } = getAccent(pending);

  /* ────────────────────────── POPUP ────────────────────────── */
  if (open) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-end justify-end p-4 pointer-events-none">
        {/* Dim backdrop */}
        <div
          className="absolute inset-0 pointer-events-auto"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        />

        {/* Card */}
        <div
          className="relative pointer-events-auto w-full max-w-[320px] rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(160deg,#0e0e1a 0%,#12121f 100%)",
            border: "1.5px solid rgba(255,255,255,0.08)",
            boxShadow: `0 24px 64px -8px rgba(0,0,0,0.85), 0 0 0 1px ${color}18`,
          }}
        >
          {/* Top accent bar */}
          <div className="h-[2px]" style={{ background: `linear-gradient(90deg,transparent,${color} 40%,${color}aa 60%,transparent)` }} />

          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ background: `${color}0e`, borderBottom: `1px solid ${color}1e` }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: `${color}20`, border: `1px solid ${color}40` }}
              >
                <Clock className="w-4 h-4" style={{ color }} />
              </div>
              <div>
                <p className="text-[11px] font-black text-white leading-tight">Payment Pending</p>
                <p className="text-[9px] leading-tight" style={{ color: `${color}cc` }}>{methodLabel}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">

            {/* Status badge */}
            {result === "pending" && (
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(243,186,47,0.07)", border: "1px solid rgba(243,186,47,0.22)" }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                <div>
                  <p className="text-amber-300 text-[11px] font-black leading-tight">Admin Approval Pending</p>
                  <p className="text-amber-600/70 text-[9px] mt-0.5 leading-snug">
                    {pending.type === "manual"
                      ? "Admin aapka screenshot check kar raha hai"
                      : "Blockchain confirmation ka wait kar rahe hain"}
                  </p>
                </div>
              </div>
            )}

            {result === "approved" && (
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(34,197,94,0.09)", border: "1px solid rgba(34,197,94,0.3)" }}
              >
                <Check className="w-5 h-5 text-green-400 shrink-0" strokeWidth={3} />
                <div>
                  <p className="text-green-400 text-[11px] font-black leading-tight">Payment Approved!</p>
                  <p className="text-green-500/70 text-[9px] mt-0.5">VIP activate ho raha hai…</p>
                </div>
              </div>
            )}

            {result === "rejected" && (
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <X className="w-4 h-4 text-red-400 shrink-0" strokeWidth={3} />
                <div>
                  <p className="text-red-300 text-[11px] font-black leading-tight">Payment Rejected</p>
                  <p className="text-red-500/60 text-[9px] mt-0.5">Admin ne reject kiya — support se rabta karo</p>
                </div>
              </div>
            )}

            {/* Package info row */}
            <div
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <p className="text-[9px] text-slate-600 uppercase tracking-wider mb-0.5">Package</p>
                <p className="text-sm font-black text-white">{pending.productTitle}</p>
              </div>
              {pending.days && (
                <div
                  className="px-3 py-1.5 rounded-xl text-right"
                  style={{ background: `${color}12`, border: `1px solid ${color}28` }}
                >
                  <p className="text-[9px] text-slate-500 mb-0.5">Duration</p>
                  <p className="text-sm font-black" style={{ color }}>{pending.days}d</p>
                </div>
              )}
            </div>

            {/* Last checked */}
            {lastChecked && (
              <p className="text-[9px] text-slate-600 text-center">
                Last checked: {lastChecked.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            )}

            {/* Check Now button */}
            {result === "pending" && (
              <button
                onClick={() => checkStatus(pending)}
                disabled={checking}
                className="w-full py-3 rounded-2xl font-black text-[13px] text-white flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg,${color}cc,${color})`,
                  boxShadow: `0 6px 22px -5px ${color}66`,
                }}
              >
                <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} strokeWidth={2.5} />
                {checking ? "Checking…" : "Check Status Now"}
              </button>
            )}

            {/* Account link */}
            <button
              onClick={() => { setOpen(false); navigate("/account"); }}
              className="w-full py-2.5 rounded-2xl text-xs font-semibold text-slate-500 flex items-center justify-center gap-1.5 hover:text-slate-200 hover:bg-white/5 transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Account page kholo
            </button>

            {/* Dismiss */}
            <button
              onClick={dismiss}
              className="w-full py-1.5 rounded-xl text-[10px] text-slate-700 hover:text-red-500/60 transition-all"
            >
              Dismiss (hata do)
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ────────────────────────── FLOATING PILL ────────────────────────── */
  return (
    <button
      onClick={() => setOpen(true)}
      className="fixed bottom-5 right-5 z-[9998] flex items-center gap-2.5 pl-3 pr-4 py-2.5 rounded-full transition-all duration-200 active:scale-95 hover:scale-105"
      style={{
        background: "linear-gradient(135deg,#0d0d1a,#141428)",
        border: `1.5px solid ${color}55`,
        boxShadow: `0 8px 28px -4px ${color}50, 0 2px 8px rgba(0,0,0,0.6)`,
      }}
    >
      {/* Pulsing dot */}
      <span className="relative flex w-2.5 h-2.5 shrink-0">
        <span
          className="absolute inline-flex h-full w-full rounded-full animate-ping opacity-60"
          style={{ background: color }}
        />
        <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ background: color }} />
      </span>

      <div className="text-left">
        <p className="text-[10px] font-black text-white leading-none mb-0.5">Payment Pending</p>
        <p className="text-[8.5px] leading-none" style={{ color: `${color}cc` }}>
          {methodLabel} · {pending.productTitle}
        </p>
      </div>

      <ChevronUp className="w-3.5 h-3.5 text-slate-500 ml-0.5" />
    </button>
  );
}
