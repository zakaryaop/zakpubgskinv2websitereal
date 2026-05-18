import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, ChevronDown, ChevronUp, X, Clock } from "lucide-react";

type OrderStatus = "pending" | "active" | "rejected" | null;

const APPROVED_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const LS_LINK_KEY = "vip_invite_link";
const LS_EXPIRY_KEY = "vip_invite_expiry";

export function PendingOrderWidget() {
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [status, setStatus] = useState<OrderStatus>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [minimized, setMinimized] = useState(false);
  const [dots, setDots] = useState(".");
  const [visible, setVisible] = useState(false);
  const [remaining, setRemaining] = useState(APPROVED_DURATION_MS);
  const [expired, setExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotsRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // On mount: restore approved state from localStorage OR pending state from sessionStorage
  useEffect(() => {
    const savedLink = localStorage.getItem(LS_LINK_KEY);
    const savedExpiry = localStorage.getItem(LS_EXPIRY_KEY);

    if (savedLink && savedExpiry) {
      const expiryTime = parseInt(savedExpiry, 10);
      const now = Date.now();
      if (now < expiryTime) {
        // Still valid — restore approved popup with remaining time
        setInviteLink(savedLink);
        setStatus("active");
        setRemaining(expiryTime - now);
        setVisible(true);
        startCountdown(expiryTime);
        return;
      } else {
        // Expired — clean up
        localStorage.removeItem(LS_LINK_KEY);
        localStorage.removeItem(LS_EXPIRY_KEY);
      }
    }

    const saved = sessionStorage.getItem("vip_pending_id");
    if (!saved) return;
    setTelegramId(saved);
    setVisible(true);
  }, []);

  const startCountdown = (expiryTime: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      const left = expiryTime - Date.now();
      if (left <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setRemaining(0);
        setExpired(true);
        localStorage.removeItem(LS_LINK_KEY);
        localStorage.removeItem(LS_EXPIRY_KEY);
        setTimeout(() => setVisible(false), 3000);
      } else {
        setRemaining(left);
      }
    }, 1000);
  };

  useEffect(() => {
    if (!telegramId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/order-status?telegramId=${encodeURIComponent(telegramId)}`);
        const data = await res.json();
        setStatus(data.status);

        if (data.status === "active" && data.inviteLink) {
          setInviteLink(data.inviteLink);
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (dotsRef.current) clearInterval(dotsRef.current);
          sessionStorage.removeItem("vip_pending_id");
          setMinimized(false);
          // Save to localStorage so it survives refresh
          const expiryTime = Date.now() + APPROVED_DURATION_MS;
          localStorage.setItem(LS_LINK_KEY, data.inviteLink);
          localStorage.setItem(LS_EXPIRY_KEY, String(expiryTime));
          setRemaining(APPROVED_DURATION_MS);
          startCountdown(expiryTime);
        } else if (data.status === "rejected") {
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (dotsRef.current) clearInterval(dotsRef.current);
          sessionStorage.removeItem("vip_pending_id");
        }
      } catch {}
    };

    poll();
    intervalRef.current = setInterval(poll, 20000);
    dotsRef.current = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (dotsRef.current) clearInterval(dotsRef.current);
    };
  }, [telegramId]);

  const dismiss = () => {
    setVisible(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (dotsRef.current) clearInterval(dotsRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const isApproved = status === "active" && !!inviteLink;
  const isRejected = status === "rejected";

  const totalSecs = Math.floor(remaining / 1000);
  const mins = String(Math.floor(totalSecs / 60)).padStart(2, "0");
  const secs = String(totalSecs % 60).padStart(2, "0");
  const countdownLabel = `${mins}:${secs}`;
  const timerColor = totalSecs > 600 ? "text-green-400" : totalSecs > 120 ? "text-primary" : "text-primary";

  if (!visible || (!telegramId && !isApproved)) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="widget"
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: expired ? 0 : 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed bottom-6 right-6 z-[200] w-80 max-w-[calc(100vw-2rem)]"
      >
        {isApproved ? (
          <div className="rounded-2xl border border-primary/40 bg-background/95 backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/20">
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-primary font-bold text-sm">VIP Approved!</span>
              </div>
              <div className={`flex items-center gap-1 font-mono font-bold text-sm ${timerColor}`}>
                <Clock className="w-3.5 h-3.5" />
                {expired ? "Expired" : countdownLabel}
              </div>
            </div>
            <div className="p-4">
              {expired ? (
                <p className="text-muted-foreground text-sm text-center py-2">
                  Link has expired. Contact support if you haven't joined yet.
                </p>
              ) : (
                <>
                  <p className="text-foreground text-xs mb-1">
                    Join now — this invite link expires in{" "}
                    <span className={`font-bold ${timerColor}`}>{countdownLabel}</span>.
                  </p>
                  <a
                    href={inviteLink!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm shadow-[0_0_20px_rgba(var(--primary),0.4)] animate-pulse mt-3"
                  >
                    🚀 Join VIP Group Now
                  </a>
                  <p className="text-muted-foreground text-xs text-center mt-2">Single use — do not share this link</p>
                </>
              )}
            </div>
          </div>
        ) : isRejected ? (
          <div className="rounded-2xl border border-primary/30 bg-background/95 backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">
            <div className="bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/20">
              <span className="text-primary font-bold text-sm">❌ Payment Not Verified</span>
              <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-muted-foreground text-xs mb-3">Your screenshot could not be verified. Contact support for help.</p>
              <a href="https://t.me/zakarya_op" target="_blank" rel="noopener noreferrer"
                className="block w-full text-center bg-primary text-primary-foreground font-bold py-2.5 rounded-xl text-sm">
                Contact Support
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-primary/20 bg-background/95 backdrop-blur-sm shadow-[0_8px_40px_rgba(0,0,0,0.4)] overflow-hidden">
            <button
              onClick={() => setMinimized(m => !m)}
              className="w-full bg-primary/10 px-4 py-3 flex items-center justify-between border-b border-primary/20 hover:bg-primary/15 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                </span>
                <span className="text-primary font-bold text-sm">Order Under Review{dots}</span>
              </div>
              {minimized ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>

            <AnimatePresence initial={false}>
              {!minimized && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4">
                    <div className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2.5 mb-3">
                      <p className="text-primary font-semibold text-xs">⏳ Please refresh after 10 minutes</p>
                      <p className="text-muted-foreground text-[11px] mt-0.5">Admin is reviewing your screenshot. Check back in ~10 min for your VIP invite link.</p>
                    </div>
                    <a href="https://t.me/zakarya_op" target="_blank" rel="noopener noreferrer"
                      className="block w-full text-center bg-card border border-border text-foreground text-xs font-semibold py-2 rounded-lg hover:bg-card/80 transition-colors">
                      Support
                    </a>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
