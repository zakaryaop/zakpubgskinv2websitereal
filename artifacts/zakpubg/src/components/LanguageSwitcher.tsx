import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, ChevronDown } from "lucide-react";
import { useI18n, languages, type Lang } from "@/lib/i18n";

const headerLabels: Record<Lang, string> = {
  en: "Language",
  ar: "اللغة",
  ur: "زبان",
  ru: "Язык",
  id: "Bahasa",
};

export function LanguageSwitcher() {
  const [open, setOpen] = useState(false);
  const { lang, setLang } = useI18n();
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find(l => l.code === lang) || languages[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border hover:border-primary/30 bg-card/60 hover:bg-card text-foreground transition-all duration-300 text-xs group"
        data-testid="button-language-switcher"
      >
        <span className="text-base leading-none">{current.flag}</span>
        <span className="hidden sm:inline font-medium text-muted-foreground group-hover:text-foreground transition-colors">{current.label}</span>
        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 bg-card/95 backdrop-blur-sm border border-border rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.15)] overflow-hidden min-w-[180px] z-[100] p-1.5"
          >
            <div className="px-3 py-2 mb-1">
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                <Globe className="w-3 h-3" />
                {headerLabels[lang]}
              </div>
            </div>
            {languages.map((l) => (
              <button
                key={l.code}
                onClick={() => {
                  setLang(l.code);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 text-sm ${
                  lang === l.code
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground border border-transparent"
                }`}
                data-testid={`lang-${l.code}`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <span className="font-medium flex-grow">{l.label}</span>
                {lang === l.code && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
