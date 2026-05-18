import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MessageCircle,
  Crown,
  AlertCircle,
  RefreshCw,
  Calendar,
  CheckCircle,
  Bell,
  X,
  LogOut,
  Send,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { getMember, logoutMember } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import BrandLogo from "@/components/BrandLogo";

function PortalNav({ onHome }: { onHome: () => void }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-[#080810]/85 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-3 sm:px-5 h-14 flex items-center justify-between">
        <button onClick={onHome} className="flex items-center gap-2 shrink-0" aria-label="ZakPubgSkin home">
          <BrandLogo size={28} className="drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
          <span className="font-black text-base tracking-tight leading-none">
            <span className="text-white">ZAK</span>
            <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
            <span className="text-white">SKIN</span>
          </span>
        </button>
        <span className="text-[10px] font-bold uppercase tracking-widest text-violet-300 bg-violet-500/10 border border-violet-400/25 px-2.5 py-1 rounded-full">VIP Portal</span>
      </div>
    </nav>
  );
}

export default function Portal() {
  const [, setLocation] = useLocation();
  const { currentUser, setCurrentUser, sessionLoading } = useStore();
  const { t } = useI18n();
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [popupStatus, setPopupStatus] = useState<
    "waiting" | "checking" | "still_pending" | "approved" | "rejected"
  >("waiting");
  const autoCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (currentUser?.status === "pending") {
      const autoCheck = async () => {
        try {
          const result = await getMember(currentUser.id);
          if (result.member.status === "active") {
            setCurrentUser(result.member);
            setShowPopup(true);
            setPopupStatus("approved");
            if (autoCheckRef.current) clearInterval(autoCheckRef.current);
          } else if (result.member.status === "rejected") {
            setCurrentUser(result.member);
            setShowPopup(true);
            setPopupStatus("rejected");
            if (autoCheckRef.current) clearInterval(autoCheckRef.current);
          }
        } catch {}
      };

      autoCheckRef.current = setInterval(autoCheck, 15000);
      autoCheck();

      return () => {
        if (autoCheckRef.current) clearInterval(autoCheckRef.current);
      };
    }
  }, [currentUser?.status]);

  const handlePopupCheck = async () => {
    if (!currentUser) return;
    setPopupStatus("checking");
    try {
      const result = await getMember(currentUser.id);
      setCurrentUser(result.member);
      if (result.member.status === "active") {
        setPopupStatus("approved");
      } else if (result.member.status === "rejected") {
        setPopupStatus("rejected");
      } else {
        setPopupStatus("still_pending");
      }
    } catch {
      setPopupStatus("still_pending");
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setPopupStatus("waiting");
  };

  useEffect(() => {
    if (!currentUser) {
      setLocation("/login");
      return;
    }

    if (currentUser.status === "active" && currentUser.expiryDate) {
      const updateTimer = () => {
        const now = new Date();
        const difference =
          new Date(currentUser.expiryDate!).getTime() - now.getTime();

        if (difference <= 0) {
          setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
          clearInterval(interval);
          handleLogout();
          return;
        }

        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      };

      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    }
  }, [currentUser, setLocation]);

  const refreshStatus = async () => {
    if (!currentUser) return;
    setRefreshing(true);
    try {
      const result = await getMember(currentUser.id);
      setCurrentUser(result.member);
    } catch {}
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLogout = async () => {
    await logoutMember();
    setCurrentUser(null);
    setLocation("/login");
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!currentUser) return null;

  if (currentUser.status === "pending") {
    return (
      <div className="min-h-screen bg-[#080810] text-white">
        <PortalNav onHome={() => setLocation("/")} />
        <div className="pt-24 pb-8 px-4 flex justify-center items-center">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border-primary/20"
        >
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-5 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
            <RefreshCw
              className={`w-7 h-7 text-primary ${refreshing ? "animate-spin" : "animate-spin"}`}
            />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2 font-heading">
            {t("portal.pending.title")}
          </h2>
          <p className="text-muted-foreground mb-3 text-sm">
            {t("portal.pending.desc")}
          </p>

          <div className="bg-card/60 rounded-xl p-3 mb-4 border border-border text-sm">
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">{t("portal.pending.plan")}</span>
              <span className="text-foreground font-medium">
                {currentUser.plan === "60-days" ? "VIP 60 Days" : "VIP 30 Days"}
              </span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-muted-foreground">{t("portal.pending.method")}</span>
              <span className="text-foreground font-medium">{currentUser.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("portal.pending.orderId")}</span>
              <span className="text-primary font-bold">#{currentUser.id}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 mb-4 text-xs text-muted-foreground">
            <Bell className="w-3.5 h-3.5" />
            <span>Auto-checking status every 15s</span>
          </div>

          <button
            onClick={refreshStatus}
            disabled={refreshing}
            className="w-full py-3 text-sm rounded-xl bg-primary text-primary-foreground font-bold disabled:opacity-50"
          >
            {refreshing ? t("portal.pending.checking") : t("portal.pending.checkStatus")}
          </button>

          <button
            onClick={() => setLocation("/")}
            className="w-full py-3 text-sm rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors font-medium mt-3"
          >
            ← {t("portal.pending.backHome")}
          </button>
        </motion.div>

        <AnimatePresence>
          {showPopup && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100]"
                onClick={closePopup}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="fixed inset-0 flex items-center justify-center z-[101] px-4"
              >
                <div className="glass-panel rounded-2xl p-6 max-w-sm w-full text-center border border-primary/20 relative">
                  <button
                    onClick={closePopup}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  {popupStatus === "waiting" && (
                    <>
                      <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Bell className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{t("portal.popup.title")}</h3>
                      <p className="text-muted-foreground text-sm mb-5">{t("portal.popup.desc")}</p>
                      <button
                        onClick={handlePopupCheck}
                        className="w-full py-3 text-sm rounded-xl bg-primary text-primary-foreground font-bold"
                      >
                        {t("portal.popup.checkNow")}
                      </button>
                    </>
                  )}

                  {popupStatus === "checking" && (
                    <div className="py-8">
                      <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
                      <p className="text-foreground font-bold">{t("portal.popup.checking")}</p>
                    </div>
                  )}

                  {popupStatus === "approved" && (
                    <>
                      <div className="w-14 h-14 mx-auto bg-green-500/10 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{t("portal.popup.approved")}</h3>
                      <p className="text-green-400 text-sm mb-5">{t("portal.popup.approvedDesc")}</p>
                      <button
                        onClick={closePopup}
                        className="w-full py-3 text-sm rounded-xl bg-green-600 text-white font-bold"
                      >
                        {t("portal.popup.goToDashboard")}
                      </button>
                    </>
                  )}

                  {popupStatus === "rejected" && (
                    <>
                      <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{t("portal.popup.rejected")}</h3>
                      <p className="text-primary text-sm mb-5">{t("portal.popup.rejectedDesc")}</p>
                      <a
                        href="https://t.me/Zaksite_bot"
                        target="_blank"
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm rounded-xl bg-[#2AABEE] text-white font-bold"
                      >
                        <MessageCircle className="w-4 h-4" /> {t("portal.popup.contactSupport")}
                      </a>
                    </>
                  )}

                  {popupStatus === "still_pending" && (
                    <>
                      <div className="w-14 h-14 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold text-foreground mb-2">{t("portal.popup.stillPending")}</h3>
                      <p className="text-muted-foreground text-sm mb-5">{t("portal.popup.stillPendingDesc")}</p>
                      <button
                        onClick={closePopup}
                        className="w-full py-3 text-sm rounded-xl bg-card/40 text-foreground font-bold"
                      >
                        {t("portal.popup.ok")}
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
      </div>
    );
  }

  if (currentUser.status === "rejected") {
    return (
      <div className="min-h-screen bg-[#080810] text-white">
        <PortalNav onHome={() => setLocation("/")} />
        <div className="pt-24 pb-8 px-4 flex justify-center items-center">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass-panel p-8 rounded-3xl max-w-sm w-full text-center border-primary/20"
        >
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-5">
            <AlertCircle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">{t("portal.rejected.title")}</h2>
          <p className="text-muted-foreground mb-5 text-sm">{t("portal.rejected.desc")}</p>
          <a
            href="https://t.me/Zaksite_bot"
            target="_blank"
            className="w-full py-3 text-sm rounded-xl bg-[#2AABEE] text-white font-bold flex items-center justify-center gap-2 mb-3"
          >
            <MessageCircle className="w-4 h-4" /> {t("portal.rejected.contact")}
          </a>
          <button
            onClick={() => setLocation("/")}
            className="w-full py-3 text-sm rounded-xl border border-border text-muted-foreground hover:text-foreground transition-colors font-medium"
          >
            {t("portal.rejected.tryAgain")}
          </button>
        </motion.div>
      </div>
      </div>
    );
  }

  const expiryDate = currentUser.expiryDate
    ? new Date(currentUser.expiryDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  return (
    <div className="min-h-screen bg-[#080810] text-white">
      <PortalNav onHome={() => setLocation("/")} />
      <div className="pt-20 pb-10 px-4 flex justify-center">
      <div className="w-full max-w-md space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel p-6 rounded-3xl border-primary/10 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.15)] mb-4">
            <Crown className="w-7 h-7 text-primary" />
          </div>

          <h1 className="text-xl font-bold text-foreground font-heading mb-1">
            {currentUser.telegramId}
          </h1>
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 uppercase tracking-wider">
              {t("portal.active")}
            </span>
          </div>
          <p className="text-muted-foreground text-sm mb-5">
            {currentUser.plan === "60-days" ? t("portal.plan60") : t("portal.plan30")} {t("portal.planSuffix")}
          </p>

          <div className="flex gap-2 justify-center mb-4">
            {[
              { label: t("portal.timer.days"), value: timeLeft.days },
              { label: t("portal.timer.hours"), value: timeLeft.hours },
              { label: t("portal.timer.min"), value: timeLeft.minutes },
              { label: t("portal.timer.sec"), value: timeLeft.seconds },
            ].map((unit) => (
              <div
                key={unit.label}
                className="bg-background/80 px-3 py-2 rounded-xl border border-border text-center flex-1"
              >
                <div className="text-lg font-bold text-foreground font-mono">
                  {String(unit.value).padStart(2, "0")}
                </div>
                <div className="text-[9px] text-muted-foreground uppercase tracking-wider">
                  {unit.label}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{t("portal.stat.expires")}: {expiryDate}</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <a
            href="https://t.me/Zaksite_bot"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#2AABEE] text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 text-base shadow-lg hover:opacity-90 transition-opacity"
          >
            <Send className="w-5 h-5" />
            {t("portal.community.button")}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={handleLogout}
            className="w-full py-3 text-sm rounded-xl border border-border text-muted-foreground hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all font-medium flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {t("portal.logout")}
          </button>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
