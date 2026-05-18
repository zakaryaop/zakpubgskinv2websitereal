import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Headphones, Send } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 right-5 z-[80] w-[300px] bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-foreground font-bold text-sm">{t("support.title")}</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                    <span className="text-green-400 text-[10px] font-medium">Online</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4">
              <div className="bg-muted/30 rounded-xl p-3 mb-4">
                <p className="text-muted-foreground text-xs leading-relaxed">{t("support.desc")}</p>
              </div>

              <a
                href="https://t.me/Zaksite_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="smooth-button w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#2AABEE] text-white font-bold text-sm hover:bg-[#229ED9] transition-colors"
                data-testid="button-support-telegram"
              >
                <Send className="w-4 h-4" />
                {t("support.button")}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-[80] w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        data-testid="button-support-widget"
      >
        {open ? (
          <X className="w-5 h-5" />
        ) : (
          <MessageCircle className="w-5 h-5" />
        )}
      </button>
    </>
  );
}
