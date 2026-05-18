import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { createPayment, getPaymentStatus, createManualPayment, getSetting, getManualPaymentStatus } from "../lib/api";
import { fireConfetti } from "../lib/confetti";
import { X, Copy, Check, Loader2, Lock, ShieldCheck, AlertTriangle, Send, Crown, User, Phone, ImageIcon, ChevronLeft, Hash } from "lucide-react";

type Product = { id: number; title: string; priceUsd?: string | null; durationDays?: number | null; };
type Override = { priceUsd?: string; durationDays?: number };

const PKR_RATE = 278;

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
function BrandLogo({ src, alt, size = 32, bg = "transparent", rounded = "12px" }: { src: string; alt: string; size?: number; bg?: string; rounded?: string }) {
  return (
    <div style={{ width: size, height: size, borderRadius: rounded, background: bg, overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <img src={`${BASE}/${src}`} alt={alt} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>
  );
}
function JazzCashIcon({ size = 32 }: { size?: number }) { return <BrandLogo src="jazzcash.png" alt="JazzCash" size={size} bg="#111" rounded="10px" />; }
function EasypaisaIcon({ size = 32 }: { size?: number }) { return <BrandLogo src="easypaisa.png" alt="Easypaisa" size={size} bg="white" rounded="10px" />; }
function NayaPayIcon({ size = 32 }: { size?: number }) { return <BrandLogo src="nayapay.png" alt="NayaPay" size={size} rounded="10px" />; }
function MeezanIcon({ size = 32 }: { size?: number }) { return <BrandLogo src="meezan.png" alt="Meezan Bank" size={size} bg="white" rounded="50%" />; }

function BinanceSvg({ size = 24, active = false }: { size?: number; active?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="16" fill={active ? "#f3ba2f22" : "#f3ba2f14"} />
      <g fill="#f3ba2f">
        <polygon points="16,5 19.2,8.2 16,11.4 12.8,8.2" />
        <polygon points="9.8,11.2 13,8 16,11 13,14 9.8,11.2" transform="translate(-0.2,4.8)" />
        <polygon points="19,11.2 22.2,8 25.2,11 22.2,14 19,11.2" transform="translate(-2.8,4.8)" />
        <polygon points="13,16 16,13 19,16 16,19" />
        <polygon points="16,21 19.2,17.8 22.4,21 19.2,24.2" transform="translate(-3.2,0)" />
        <polygon points="16,21 12.8,17.8 9.6,21 12.8,24.2" transform="translate(3.2,0)" />
      </g>
    </svg>
  );
}

const PK_METHODS = [
  { id: "jazz",      label: "JazzCash",    sub: "Mobile wallet",   color: "#F26522", hot: true  },
  { id: "easypaisa", label: "Easypaisa",   sub: "Mobile wallet",   color: "#1BA649", hot: true  },
  { id: "nayapay",   label: "NayaPay",     sub: "Digital bank",    color: "#4F46E5", hot: false },
  { id: "meezan",    label: "Meezan Bank", sub: "Online banking",  color: "#006341", hot: false },
  { id: "binance",   label: "Binance Pay", sub: "Manual transfer", color: "#f3ba2f", hot: false },
];

const CRYPTO_COINS = [
  { id: "trx",       label: "TRX / Tron",  icon: "◈", color: "#ef0027", desc: "Tron network", hot: true  },
  { id: "ltc",       label: "Litecoin",    icon: "Ł", color: "#bfbbbb", desc: "LTC network",  hot: true  },
  { id: "usdttrc20", label: "USDT TRC-20", icon: "₮", color: "#26a17b", desc: "Tron · USDT",  hot: false },
  { id: "usdtbsc",   label: "USDT BEP-20", icon: "₮", color: "#f3ba2f", desc: "BSC · USDT",   hot: false },
  { id: "btc",       label: "Bitcoin",     icon: "₿", color: "#f7931a", desc: "BTC network",  hot: false },
  { id: "eth",       label: "Ethereum",    icon: "Ξ", color: "#627eea", desc: "ETH network",  hot: false },
];

const STATUS_INFO: Record<string, { label: string; color: string; desc: string }> = {
  waiting:    { label: "Waiting for payment",  color: "#22d3ee", desc: "Send the exact amount to the address below" },
  confirming: { label: "Confirming…",          color: "#f59e0b", desc: "Payment received — awaiting blockchain confirmation" },
  confirmed:  { label: "Confirmed!",           color: "#22c55e", desc: "Payment confirmed! Activating your VIP…" },
  finished:   { label: "VIP Activated!",       color: "#22c55e", desc: "Your VIP is now active. Check your Telegram!" },
  failed:     { label: "Payment failed",       color: "#ef4444", desc: "The payment could not be processed. Please try again." },
  expired:    { label: "Expired",              color: "#ef4444", desc: "Payment window expired. Please start a new payment." },
  sending:    { label: "Processing…",          color: "#f59e0b", desc: "Finalizing your payment…" },
};

type PayMethod = "pk" | "crypto";
type Step = "select" | "account-details" | "proof-form" | "paying" | "done";

export default function PaymentModal({ product, onClose, override }: { product: Product; onClose: () => void; override?: Override }) {
  const effPrice = override?.priceUsd ?? product.priceUsd;
  const effDays  = override?.durationDays ?? product.durationDays;
  const [, navigate] = useLocation();

  const [payMethod, setPayMethod]   = useState<PayMethod>("pk");
  const [pkMethod, setPkMethod]     = useState(PK_METHODS[0]);
  const [cryptoCoin, setCryptoCoin] = useState(CRYPTO_COINS[0]);
  const [step, setStep]             = useState<Step>("select");

  /* Crypto payment state */
  const [paymentData, setPaymentData] = useState<any>(null);
  const [status, setStatus]           = useState("waiting");
  const [inviteLink, setInviteLink]   = useState<string | null>(null);
  const [creating, setCreating]       = useState(false);
  const [err, setErr]                 = useState("");
  const [copied, setCopied]           = useState<"address" | "amount" | "account" | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* Manual payment state */
  const [methodDetails, setMethodDetails] = useState<{ num: string; name: string } | null>(null);
  const [tgUsername, setTgUsername]       = useState("");
  const [screenshot, setScreenshot]       = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState("");
  const [manualPaymentId, setManualPaymentId] = useState<number | null>(null);

  function handleClose() {
    if (step === "paying" && paymentData?.paymentId) {
      localStorage.setItem("zakpubg_pending_payment", JSON.stringify({
        paymentId: paymentData.paymentId, productTitle: product.title, days: effDays, timestamp: Date.now(),
      }));
    }
    onClose();
  }

  const stopPoll = () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };

  /* Crypto auto-verify poll */
  useEffect(() => {
    if (step === "paying" && paymentData?.paymentId) {
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const d = await getPaymentStatus(paymentData.paymentId);
          setStatus(d.status || "waiting");
          if (d.inviteLink) setInviteLink(d.inviteLink);
          if (["finished", "confirmed"].includes(d.status)) { setStep("done"); stopPoll(); fireConfetti(100); }
          else if (["failed", "expired"].includes(d.status)) { stopPoll(); }
        } catch {}
      }, 6000);
    }
    return stopPoll;
  }, [step, paymentData]);

  /* Manual payment status poll — auto-open VIP when approved */
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === "done" && status === "manual_pending" && manualPaymentId) {
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const d = await getManualPaymentStatus(manualPaymentId);
          if (d.status === "finished") {
            stopPoll();
            setStatus("finished");
            if (d.inviteLink) setInviteLink(d.inviteLink);
            fireConfetti(120);
            localStorage.removeItem("zakpubg_pending_payment");
            localStorage.removeItem("zakpubg_pending_manual");
            /* Countdown 3…2…1 then redirect */
            setRedirectCountdown(3);
            countdownRef.current = setInterval(() => {
              setRedirectCountdown(prev => {
                if (prev === null || prev <= 1) {
                  clearInterval(countdownRef.current!);
                  onClose();
                  navigate("/account");
                  return null;
                }
                return prev - 1;
              });
            }, 1000);
          } else if (d.status === "failed") {
            stopPoll();
            setStatus("failed");
          }
        } catch {}
      }, 5000);
    }
    return stopPoll;
  }, [step, status, manualPaymentId]);

  useEffect(() => () => stopPoll(), []);


  /* Fetch method details then go to account-details (step 2) */
  async function goToAccountDetails() {
    setCreating(true); setErr("");
    try {
      const key = pkMethod.id;
      const [num, name] = await Promise.all([getSetting(`${key}_num`), getSetting(`${key}_name`)]);
      setMethodDetails({ num: num || "", name: name || "" });
      setStep("account-details");
    } catch { setErr("Could not load payment details"); }
    finally { setCreating(false); }
  }

  /* Handle screenshot file selection */
  function handleScreenshot(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotName(file.name);
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  /* Submit manual payment */
  async function submitManualPayment() {
    if (!tgUsername.trim()) { setErr("Please enter your Telegram username"); return; }
    if (!screenshot) { setErr("Please upload your payment screenshot"); return; }
    setCreating(true); setErr("");
    try {
      const d = await createManualPayment(product.id, {
        methodId: pkMethod.id,
        senderName: tgUsername.trim(),
        senderPhone: "",
        txReference: tgUsername.trim(),
        screenshotBase64: screenshot,
        durationDays: typeof effDays === "number" ? effDays : undefined,
        priceUsd: typeof effPrice === "string" ? effPrice : undefined,
      });
      setManualPaymentId(d.paymentId);
      setStep("done");
      setStatus("manual_pending");
    } catch (e: any) { setErr(e.message || "Submission failed. Please try again."); }
    finally { setCreating(false); }
  }

  /* Crypto payment */
  async function startCryptoPayment() {
    setCreating(true); setErr("");
    try {
      const d = await createPayment(product.id, cryptoCoin.id, {
        durationDays: typeof effDays === "number" ? effDays : undefined,
        priceUsd: typeof effPrice === "string" ? effPrice : undefined,
      });
      setPaymentData(d); setStatus(d.status || "waiting"); setStep("paying");
    } catch (e: any) { setErr(e.message || "Failed to create payment"); }
    finally { setCreating(false); }
  }

  function copy(text: string, type: "address" | "amount" | "account") {
    navigator.clipboard.writeText(text).then(() => { setCopied(type); setTimeout(() => setCopied(null), 2000); });
  }

  const si      = STATUS_INFO[status] || STATUS_INFO.waiting;
  const isDone  = ["finished", "confirmed"].includes(status);
  const isFailed = ["failed", "expired"].includes(status);

  const pkIcon = (id: string, size = 30) => {
    if (id === "jazz")      return <JazzCashIcon size={size} />;
    if (id === "easypaisa") return <EasypaisaIcon size={size} />;
    if (id === "nayapay")   return <NayaPayIcon size={size} />;
    if (id === "meezan")    return <MeezanIcon size={size} />;
    return <BinanceSvg size={size} active={true} />;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(14px)" }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(170deg,#16112a 0%,#0c0a1a 100%)",
          boxShadow: "0 0 0 1px rgba(139,92,246,0.2), 0 32px 80px -16px rgba(0,0,0,0.95)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        <div className="h-[2px]" style={{ background: "linear-gradient(90deg,transparent,#7c3aed 40%,#a78bfa 60%,transparent)" }} />

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2">
            {(step === "account-details" || step === "proof-form") && (
              <button
                onClick={() => { setStep(step === "proof-form" ? "account-details" : "select"); setErr(""); }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-all mr-0.5">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)" }}>
              <Lock className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
            </div>
            <p className="text-[13px] font-black text-white tracking-wide">
              {step === "account-details" ? `Pay via ${pkMethod.label}`
                : step === "proof-form" ? "Confirm Payment"
                : "Checkout"}
            </p>
          </div>
          <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-white hover:bg-white/[0.08] transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order summary */}
        <div className="mx-5 mb-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3"
          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(109,40,217,0.07))", border: "1px solid rgba(167,139,250,0.15)" }}>
          <div>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Duration</p>
            <p className="text-sm font-black text-violet-300">{effDays} Days VIP</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Total</p>
            <p className="text-2xl font-black text-white leading-none">${effPrice}</p>
          </div>
        </div>

        <div className="px-5 pb-6">

          {/* ── Step 1: Select method ── */}
          {step === "select" && (
            <div>
              {/* PK / Crypto toggle */}
              <div className="grid grid-cols-2 gap-1.5 mb-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)" }}>
                {(["pk","crypto"] as PayMethod[]).map(m => (
                  <button key={m} onClick={() => setPayMethod(m)}
                    className="py-2 rounded-lg text-[11px] font-black uppercase tracking-wide transition-all"
                    style={payMethod === m ? {
                      background: m === "pk"
                        ? "linear-gradient(135deg,#16a34a,#15803d)"
                        : "linear-gradient(135deg,#5b21b6,#7c3aed)",
                      color: "white",
                      boxShadow: m === "pk" ? "0 4px 12px rgba(22,163,74,0.4)" : "0 4px 12px rgba(124,58,237,0.4)",
                    } : { color: "#94a3b8", background: "rgba(255,255,255,0.03)" }}>
                    {m === "pk" ? "🇵🇰 Pakistani" : "₿ Crypto"}
                  </button>
                ))}
              </div>

              {/* Pakistani method grid */}
              {payMethod === "pk" && (
                <>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {PK_METHODS.map(m => {
                      const active = pkMethod.id === m.id;
                      return (
                        <button key={m.id}
                          onClick={() => { setPkMethod(m); setErr(""); }}
                          className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl transition-all duration-150 overflow-hidden${m.id === "binance" ? " col-span-2" : ""}`}
                          style={active ? {
                            background: `${m.color}18`,
                            boxShadow: `inset 0 0 0 1.5px ${m.color}55, 0 0 16px ${m.color}14`,
                          } : {
                            background: "rgba(255,255,255,0.03)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
                          }}>
                          {m.hot && (
                            <div className="absolute top-0 right-0 text-[6px] font-black uppercase px-1.5 py-[2px] rounded-bl-xl text-white"
                              style={{ background: "linear-gradient(90deg,#dc2626,#f97316)" }}>🔥 Hot</div>
                          )}
                          {active && (
                            <div className="absolute top-2 left-2 w-3.5 h-3.5 rounded-full flex items-center justify-center" style={{ background: m.color }}>
                              <Check className="w-2 h-2 text-white" strokeWidth={3.5} />
                            </div>
                          )}
                          {m.id === "binance" ? (
                            <div className="flex items-center gap-3">
                              <BinanceSvg size={28} active={active} />
                              <div className="text-left">
                                <p className={`text-[11px] font-black leading-none ${active ? "text-white" : "text-slate-400"}`}>Binance Pay</p>
                                <p className="text-[8px] mt-0.5" style={{ color: active ? m.color : "#475569" }}>Manual transfer · Fast</p>
                              </div>
                            </div>
                          ) : (
                            <>
                              {pkIcon(m.id, 30)}
                              <p className={`text-[10px] font-black leading-none text-center ${active ? "text-white" : "text-slate-400"}`}>{m.label}</p>
                              <p className="text-[8px] leading-none" style={{ color: active ? m.color : "#475569" }}>{m.sub}</p>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* PKR price info */}
                  <div className="rounded-xl mb-3 overflow-hidden" style={{ border: "1px solid rgba(0,201,167,0.2)" }}>
                    <div className="flex items-center gap-3 px-3 py-2.5" style={{ background: "rgba(0,73,78,0.25)" }}>
                      <div className="flex flex-col flex-1">
                        <p className="text-[9px] text-slate-500 uppercase tracking-wide mb-0.5">
                          {pkMethod.id === "binance" ? "You pay (USD)" : "You pay (PKR)"}
                        </p>
                        <p className="text-base font-black text-white">
                          {pkMethod.id === "binance"
                            ? `$${effPrice} USD`
                            : `Rs ${Math.round(parseFloat(effPrice ?? "0") * PKR_RATE).toLocaleString()}`}
                          {pkMethod.id !== "binance" && <span className="text-[10px] text-slate-500 font-normal ml-1">≈ ${effPrice} USD</span>}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-500 mb-0.5">{pkMethod.id === "binance" ? "Method" : "Rate"}</p>
                        <p className="text-[10px] font-bold text-green-400">
                          {pkMethod.id === "binance" ? "Manual" : `1$ = Rs ${PKR_RATE}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: "rgba(0,73,78,0.45)" }}>
                      <p className="text-[8px] text-slate-500 uppercase tracking-wider">All methods manual · Admin verified</p>
                    </div>
                  </div>

                  {err && (
                    <div className="mb-3 rounded-xl px-3 py-2.5 border border-red-400/20" style={{ background: "rgba(239,68,68,0.06)" }}>
                      <p className="text-red-300 text-xs font-bold mb-0.5">Error</p>
                      <p className="text-red-400/80 text-[11px]">{err}</p>
                    </div>
                  )}

                  <button onClick={goToAccountDetails} disabled={creating}
                    className="group/pay relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#16a34a,#15803d,#166534)", boxShadow: "0 8px 28px -6px rgba(22,163,74,0.55)" }}>
                    <span className="absolute inset-0 -translate-x-full group-hover/pay:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    {creating
                      ? <><Loader2 className="w-4 h-4 animate-spin relative" /><span className="relative">Loading…</span></>
                      : <><span className="relative">Continue →</span></>
                    }
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#15803d" }}>
                      <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] text-slate-500">Manual · Admin verified · VIP in minutes</span>
                  </div>
                </>
              )}

              {/* Crypto grid */}
              {payMethod === "crypto" && (
                <div className="mb-4">
                  <p className="text-[9px] uppercase tracking-[0.18em] font-black text-slate-500 mb-2.5">Select Coin</p>
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {CRYPTO_COINS.map(c => {
                      const active = cryptoCoin.id === c.id;
                      return (
                        <button key={c.id} onClick={() => { setCryptoCoin(c); setErr(""); }}
                          className="relative flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all duration-150 overflow-hidden"
                          style={active ? {
                            background: `${c.color}18`,
                            boxShadow: `inset 0 0 0 1.5px ${c.color}50, 0 0 14px ${c.color}14`,
                          } : {
                            background: "rgba(255,255,255,0.03)",
                            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.07)",
                          }}>
                          {c.hot && <div className="absolute top-1 left-1 px-1 py-px rounded text-[7px] font-black leading-none bg-red-600 text-white">HOT</div>}
                          {active && (
                            <div className="absolute top-1 right-1 w-3 h-3 rounded-full flex items-center justify-center" style={{ background: c.color }}>
                              <Check className="w-1.5 h-1.5 text-white" strokeWidth={4} />
                            </div>
                          )}
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black"
                            style={{ background: active ? `${c.color}28` : "rgba(255,255,255,0.06)", color: c.color, textShadow: active ? `0 0 8px ${c.color}` : "none" }}>
                            {c.icon}
                          </div>
                          <p className={`text-[9px] font-black leading-none text-center ${active ? "text-white" : "text-slate-500"}`}>{c.label}</p>
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-1"
                    style={{ background: "rgba(34,211,238,0.05)", border: "1px solid rgba(34,211,238,0.13)" }}>
                    <span className="text-sm font-black" style={{ color: cryptoCoin.color }}>{cryptoCoin.icon}</span>
                    <p className="text-[10px] text-slate-400 flex-1 font-semibold">{cryptoCoin.label} · ${effPrice}</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      <p className="text-[9px] text-cyan-400 font-bold">Auto-verify</p>
                    </div>
                  </div>

                  {err && (
                    <div className="mb-3 rounded-xl border border-red-400/20 overflow-hidden" style={{ background: "rgba(239,68,68,0.06)" }}>
                      <div className="flex items-start gap-2.5 px-3 py-2.5">
                        <span className="text-red-400 mt-0.5 shrink-0 text-sm">⚠</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-red-300 text-xs font-bold mb-0.5">Payment Error</p>
                          <p className="text-red-400/80 text-[11px]">{err}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <button onClick={startCryptoPayment} disabled={creating}
                    className="group/pay relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#6d28d9,#7c3aed,#9333ea)", boxShadow: "0 8px 28px -6px rgba(124,58,237,0.65)" }}>
                    <span className="absolute inset-0 -translate-x-full group-hover/pay:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    {creating
                      ? <><Loader2 className="w-4 h-4 animate-spin relative" /><span className="relative">Processing…</span></>
                      : <><Lock className="w-4 h-4 relative" strokeWidth={2.5} /><span className="relative">Pay ${effPrice}</span></>
                    }
                  </button>

                  <div className="flex items-center justify-center gap-1.5 mt-2.5">
                    <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#15803d" }}>
                      <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] text-slate-500">NOWPayments · Auto-verify · Non-custodial</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Account Details ── */}
          {step === "account-details" && (
            <div>
              {/* Step indicator — 3 steps */}
              <div className="flex items-center mb-4">
                {[
                  { n: 1, label: "Send Payment", active: true,  done: false },
                  { n: 2, label: "Payment Sent", active: false, done: false },
                  { n: 3, label: "Submit Proof", active: false, done: false },
                ].map((s, i, arr) => (
                  <div key={s.n} className="flex items-center" style={{ flex: i < arr.length - 1 ? "1" : "0 0 auto" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all"
                        style={{
                          background: s.active ? pkMethod.color : "rgba(255,255,255,0.07)",
                          color: s.active ? "#000" : "#475569",
                          boxShadow: s.active ? `0 0 10px ${pkMethod.color}60` : "none",
                        }}>
                        {s.n}
                      </div>
                      <span className="text-[8px] font-bold whitespace-nowrap" style={{ color: s.active ? pkMethod.color : "#475569" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-[1.5px] mx-1 mb-3 rounded-full bg-white/10" />
                    )}
                  </div>
                ))}
              </div>

              {/* Admin account card */}
              <div className="rounded-2xl overflow-hidden mb-4" style={{ border: `1.5px solid ${pkMethod.color}40` }}>
                <div className="flex items-center gap-3 px-4 py-4" style={{ background: `${pkMethod.color}12` }}>
                  <div className="shrink-0">{pkIcon(pkMethod.id, 40)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-1">
                      {pkMethod.id === "binance" ? "Send to Binance Pay ID" : "Send to account"}
                    </p>
                    {methodDetails?.name && (
                      <p className="text-[11px] font-black mb-1" style={{ color: pkMethod.color }}>{methodDetails.name}</p>
                    )}
                    {methodDetails?.num
                      ? <p className="text-xl font-black text-white font-mono leading-none tracking-wide">{methodDetails.num}</p>
                      : <p className="text-sm text-slate-500 italic">Not configured — contact admin</p>
                    }
                  </div>
                  {methodDetails?.num && (
                    <button onClick={() => copy(methodDetails.num, "account")}
                      className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 active:scale-95"
                      style={copied === "account"
                        ? { color: "#22c55e", background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)" }
                        : { color: pkMethod.color, background: `${pkMethod.color}18`, border: `1px solid ${pkMethod.color}30` }}>
                      {copied === "account" ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between px-4 py-2.5" style={{ background: `${pkMethod.color}08` }}>
                  <p className="text-[10px] font-black" style={{ color: pkMethod.color }}>
                    Send exactly:{" "}
                    <span className="text-white">
                      {pkMethod.id === "binance"
                        ? `$${effPrice} USD`
                        : `Rs ${Math.round(parseFloat(effPrice ?? "0") * PKR_RATE).toLocaleString()} PKR`}
                    </span>
                    {pkMethod.id !== "binance" && <span className="text-slate-500 font-normal ml-1">≈ ${effPrice}</span>}
                  </p>
                </div>
              </div>

              {/* Instructions */}
              <div className="flex items-start gap-3 rounded-2xl px-4 py-3 mb-5"
                style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.2)" }}>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                <p className="text-[11px] text-amber-300/90 leading-relaxed">
                  Transfer karo aur phir <strong>"I Have Paid"</strong> button dabao — agly screen mein Telegram username aur screenshot daalna hoga.
                </p>
              </div>

              {/* I Have Paid button */}
              <button onClick={() => setStep("proof-form")}
                className="group/pay relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: `linear-gradient(135deg,${pkMethod.color}dd,${pkMethod.color})`, boxShadow: `0 8px 28px -8px ${pkMethod.color}66` }}>
                <span className="absolute inset-0 -translate-x-full group-hover/pay:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                <Check className="w-5 h-5 relative" strokeWidth={3} />
                <span className="relative">I Have Paid — Next →</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#15803d" }}>
                  <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-slate-500">Admin verified · VIP activated in minutes</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Submit Proof (TG username + screenshot) ── */}
          {step === "proof-form" && (
            <div>
              {/* Step indicator — 3 steps */}
              <div className="flex items-center mb-4">
                {[
                  { n: 1, label: "Send Payment", done: true,  active: false },
                  { n: 2, label: "Payment Sent", done: false, active: true  },
                  { n: 3, label: "Submit Proof", done: false, active: false },
                ].map((s, i, arr) => (
                  <div key={s.n} className="flex items-center" style={{ flex: i < arr.length - 1 ? "1" : "0 0 auto" }}>
                    <div className="flex flex-col items-center gap-0.5">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-all"
                        style={{
                          background: s.done ? "rgba(34,197,94,0.25)" : s.active ? pkMethod.color : "rgba(255,255,255,0.07)",
                          color: s.done ? "#22c55e" : s.active ? "#000" : "#475569",
                          boxShadow: s.active ? `0 0 10px ${pkMethod.color}60` : s.done ? "0 0 8px rgba(34,197,94,0.3)" : "none",
                          border: s.done ? "1.5px solid rgba(34,197,94,0.4)" : "none",
                        }}>
                        {s.done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : s.n}
                      </div>
                      <span className="text-[8px] font-bold whitespace-nowrap"
                        style={{ color: s.done ? "#22c55e" : s.active ? pkMethod.color : "#475569" }}>
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex-1 h-[1.5px] mx-1 mb-3 rounded-full"
                        style={{ background: i === 0 ? "linear-gradient(90deg,rgba(34,197,94,0.5),rgba(255,255,255,0.1))" : "rgba(255,255,255,0.1)" }} />
                    )}
                  </div>
                ))}
              </div>

              {/* Form */}
              <div className="space-y-3 mb-4">
                {/* Telegram Username */}
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 font-black block mb-1.5">Your Telegram Username *</label>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-3 transition-all"
                    style={{
                      background: tgUsername ? "rgba(41,182,246,0.07)" : "rgba(255,255,255,0.04)",
                      border: tgUsername ? "1.5px solid rgba(41,182,246,0.4)" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    <svg width="22" height="22" viewBox="0 0 240 240" fill="none" className="shrink-0">
                      <circle cx="120" cy="120" r="120" fill="#29B6F6"/>
                      <path d="M179.7 60.4L152.9 180.1c-2 8.9-7.3 11.1-14.8 6.9l-41-30.2-19.8 19c-2.2 2.2-4 4-8.2 4l2.9-41.7 76-68.7c3.3-2.9-.7-4.6-5.2-1.7L61.8 133.4 22 121.2c-8.7-2.7-8.8-8.7 1.8-12.9l145.6-56.2c7.3-2.6 13.6 1.8 10.3 8.3z" fill="white"/>
                    </svg>
                    <span className="text-slate-400 font-black shrink-0">@</span>
                    <input
                      value={tgUsername}
                      onChange={e => setTgUsername(e.target.value.replace(/^@/, ""))}
                      placeholder="your_username"
                      autoFocus
                      className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 outline-none font-mono"
                    />
                  </div>
                  <p className="text-[9px] text-slate-600 mt-1 pl-1">VIP invite link is acount par bheja jayega</p>
                </div>

                {/* Screenshot upload */}
                <div>
                  <label className="text-[9px] uppercase tracking-wider text-slate-500 font-black block mb-1.5">Payment Screenshot *</label>
                  <label className="flex flex-col items-center justify-center cursor-pointer rounded-2xl px-4 py-5 transition-all gap-2"
                    style={{
                      background: screenshot ? "rgba(34,197,94,0.06)" : "rgba(255,255,255,0.03)",
                      border: screenshot ? "2px dashed rgba(34,197,94,0.45)" : "2px dashed rgba(255,255,255,0.13)",
                    }}>
                    {screenshot ? (
                      <>
                        <img src={screenshot} alt="preview" className="w-full max-h-32 object-cover rounded-xl mb-1" />
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-green-400" strokeWidth={3} />
                          <p className="text-green-400 text-sm font-black">Screenshot Ready!</p>
                        </div>
                        <p className="text-slate-600 text-[10px]">Tap to change</p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
                          style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.18),rgba(99,102,241,0.1))", border: "1px solid rgba(124,58,237,0.2)" }}>
                          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <rect x="7" y="3" width="18" height="26" rx="3" stroke="#a78bfa" strokeWidth="1.8" fill="none"/>
                            <rect x="10" y="8" width="12" height="9" rx="1.5" fill="rgba(167,139,250,0.15)" stroke="#a78bfa" strokeWidth="1.4"/>
                            <path d="M11 15.5l2.5-3 2 2.5 1.5-2 2.5 2.5" stroke="#a78bfa" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12.5" cy="10.5" r="1" fill="#a78bfa"/>
                            <path d="M16 20v4M14 21.5l2-2 2 2" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#7c3aed" }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="white" strokeWidth="2.2" fill="none"/>
                              <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" fill="none"/>
                            </svg>
                          </div>
                        </div>
                        <p className="text-white text-sm font-black">Upload Payment Screenshot</p>
                        <p className="text-slate-500 text-[10px] text-center">Payment ki screenshot ya photo upload karo<br/>JPG · PNG · WEBP</p>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleScreenshot} />
                  </label>
                </div>
              </div>

              {err && (
                <div className="mb-3 rounded-xl px-3 py-2.5 border border-red-400/20" style={{ background: "rgba(239,68,68,0.06)" }}>
                  <p className="text-red-300 text-xs font-bold mb-0.5">⚠ Error</p>
                  <p className="text-red-400/80 text-[11px]">{err}</p>
                </div>
              )}

              {/* Submit */}
              <button onClick={submitManualPayment} disabled={creating}
                className="group/pay relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed,#a21caf)", boxShadow: "0 8px 28px -6px rgba(124,58,237,0.6)" }}>
                <span className="absolute inset-0 -translate-x-full group-hover/pay:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                {creating
                  ? <><Loader2 className="w-4 h-4 animate-spin relative" /><span className="relative">Submitting…</span></>
                  : <><Send className="w-4 h-4 relative" strokeWidth={2.5} /><span className="relative">Submit Payment Proof</span></>
                }
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: "#15803d" }}>
                  <ShieldCheck className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] text-slate-500">Admin verifies · VIP minutes mein activate hoga</span>
              </div>
            </div>
          )}

          {/* ── Step 3: Crypto paying ── */}
          {step === "paying" && paymentData && (
            <div>
              <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl mb-4"
                style={{ background: `${si.color}10`, boxShadow: `inset 0 0 0 1px ${si.color}25` }}>
                {!isDone && !isFailed && <span className="w-2.5 h-2.5 rounded-full shrink-0 animate-pulse" style={{ background: si.color }} />}
                {isDone   && <Check className="w-4 h-4 shrink-0" style={{ color: si.color }} strokeWidth={3} />}
                {isFailed && <X className="w-4 h-4 shrink-0 text-red-400" />}
                <div>
                  <p className="text-sm font-black" style={{ color: si.color }}>{si.label}</p>
                  <p className="text-[10px] text-slate-500">{si.desc}</p>
                </div>
              </div>

              {!isDone && !isFailed && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
                  style={{ background: "rgba(34,211,238,0.06)", border: "1px solid rgba(34,211,238,0.15)" }}>
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                  <p className="text-[10px] text-cyan-400 font-semibold">Auto-verify active — checking every 6s</p>
                </div>
              )}

              {!isFailed && (
                <>
                  <div className="mb-3">
                    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500 mb-1.5">Send to ({paymentData.payCurrency?.toUpperCase()})</p>
                    <div className="flex gap-2 items-stretch">
                      <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-[11px] font-mono text-slate-300 break-all leading-relaxed">{paymentData.payAddress}</div>
                      <button onClick={() => copy(paymentData.payAddress, "address")}
                        className="px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-all shrink-0 flex items-center"
                        style={copied === "address" ? { color: "#22c55e" } : { color: "white" }}>
                        {copied === "address" ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-[9px] uppercase tracking-wider font-black text-slate-500 mb-1.5">Exact Amount</p>
                    <div className="flex gap-2 items-center">
                      <div className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3 py-2.5 text-sm font-black text-white font-mono">
                        {paymentData.payAmount} {paymentData.payCurrency?.toUpperCase()}
                      </div>
                      <button onClick={() => copy(String(paymentData.payAmount), "amount")}
                        className="px-3 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] transition-all shrink-0 flex items-center"
                        style={copied === "amount" ? { color: "#22c55e" } : { color: "white" }}>
                        {copied === "amount" ? <Check className="w-4 h-4" strokeWidth={3} /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 rounded-2xl px-3 py-3 mb-3"
                    style={{ background: "rgba(245,158,11,0.08)", boxShadow: "inset 0 0 0 1px rgba(245,158,11,0.18)" }}>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" strokeWidth={2.5} />
                    <p className="text-[11px] text-amber-300/90 leading-snug">
                      Send <strong>exactly</strong> {paymentData.payAmount} {paymentData.payCurrency?.toUpperCase()}. Wrong amount may not be processed.
                    </p>
                  </div>
                </>
              )}

              {isFailed && (
                <button onClick={() => { setStep("select"); setPaymentData(null); setStatus("waiting"); setErr(""); }}
                  className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 font-black text-sm text-white transition-colors active:scale-[0.98]">
                  Try Again
                </button>
              )}
            </div>
          )}

          {/* ── Step 4: Done ── */}
          {step === "done" && (
            <div className="text-center py-2">

              {/* Manual pending — waiting for admin approval */}
              {status === "manual_pending" && (
                <>
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{ background: "linear-gradient(135deg,rgba(243,186,47,0.2),rgba(245,158,11,0.15))", border: "2px solid rgba(243,186,47,0.4)" }}>
                    <span className="text-4xl">⏳</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Screenshot Submitted!</h3>
                  <p className="text-slate-400 text-sm mb-1">Awaiting Admin Approval</p>
                  <p className="text-slate-500 text-xs mb-4">Admin is checking your payment. This usually takes a few minutes. This screen will auto-update.</p>
                  <div className="flex items-center gap-2 justify-center px-4 py-3 rounded-2xl mb-5"
                    style={{ background: "rgba(243,186,47,0.08)", border: "1px solid rgba(243,186,47,0.2)" }}>
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <p className="text-[11px] text-amber-300 font-semibold">Checking status every 5 seconds…</p>
                  </div>
                  <button
                    onClick={() => {
                      if (manualPaymentId) {
                        localStorage.setItem("zakpubg_pending_manual", JSON.stringify({
                          type: "manual",
                          paymentId: manualPaymentId,
                          methodId: pkMethod.id,
                          productTitle: product.title,
                          days: effDays ?? 30,
                          timestamp: Date.now(),
                        }));
                        /* Dispatch storage event so PendingPaymentToast picks it up in same tab */
                        window.dispatchEvent(new StorageEvent("storage", { key: "zakpubg_pending_manual" }));
                      }
                      onClose();
                    }}
                    className="w-full py-3 rounded-2xl font-semibold text-sm text-slate-400 transition-all hover:text-slate-200 active:scale-[0.98]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    Close (check back later)
                  </button>
                </>
              )}

              {/* Manual rejected */}
              {status === "failed" && (
                <>
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{ background: "rgba(239,68,68,0.15)", border: "2px solid rgba(239,68,68,0.35)" }}>
                    <span className="text-4xl">❌</span>
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">Payment Rejected</h3>
                  <p className="text-slate-400 text-sm mb-5">Your payment was not approved. Please contact admin or try again.</p>
                  <button onClick={() => { setStep("select"); setStatus("waiting"); setErr(""); setScreenshot(null); setTxRef(""); setSenderName(""); setSenderPhone(""); }}
                    className="w-full py-3.5 rounded-2xl bg-violet-600 hover:bg-violet-500 font-black text-sm text-white transition-colors active:scale-[0.98]">
                    Try Again
                  </button>
                </>
              )}

              {/* Approved / Crypto success */}
              {(status === "finished" || status === "confirmed") && (
                <>
                  <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
                    style={{ background: "linear-gradient(135deg,rgba(124,58,237,0.2),rgba(74,222,128,0.15))", border: "2px solid rgba(74,222,128,0.3)" }}>
                    <span className="text-4xl">🎉</span>
                    <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ background: "radial-gradient(circle,#4ade80,transparent)" }} />
                  </div>
                  <h3 className="text-2xl font-black text-white mb-1">VIP Activated!</h3>
                  <p className="text-slate-400 text-sm mb-1">{effDays}-Day VIP Key</p>
                  {redirectCountdown !== null ? (
                    <div className="flex items-center justify-center gap-2 mb-5">
                      <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
                      <p className="text-violet-300 text-sm font-black">
                        VIP Portal mein redirect ho raha hai… {redirectCountdown}s
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs mb-5">Payment confirmed. Opening your VIP portal…</p>
                  )}

                  {inviteLink ? (
                    <div className="mb-3">
                      <a href={inviteLink} target="_blank" rel="noopener noreferrer"
                        className="group/tg relative w-full py-4 rounded-2xl font-black text-[15px] text-white overflow-hidden flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 8px 24px -6px rgba(16,185,129,0.5)" }}>
                        <span className="absolute inset-0 -translate-x-full group-hover/tg:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                        <Send className="w-4 h-4 relative" strokeWidth={2.5} />
                        <span className="relative">Join VIP Telegram</span>
                      </a>
                      <p className="text-[10px] text-slate-600 mt-2">Single-use link · expires in 24h</p>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-left mb-4"
                      style={{ background: "rgba(59,130,246,0.07)", boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.18)" }}>
                      <span className="text-lg shrink-0">📱</span>
                      <p className="text-[12px] text-blue-300 leading-snug">VIP invite sent to your Telegram. Make sure your username is set in Account Settings.</p>
                    </div>
                  )}

                  <button onClick={() => { localStorage.removeItem("zakpubg_pending_payment"); onClose(); navigate("/account"); }}
                    className="group relative w-full py-3.5 rounded-2xl font-black text-[14px] text-white overflow-hidden flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-2.5"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed,#a21caf)", boxShadow: "0 8px 24px -6px rgba(124,58,237,0.55)" }}>
                    <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                    <Crown className="w-4 h-4 relative" strokeWidth={2.5} />
                    <span className="relative">Open VIP Dashboard</span>
                  </button>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
