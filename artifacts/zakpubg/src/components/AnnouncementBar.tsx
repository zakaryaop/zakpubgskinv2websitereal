import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";

const MESSAGES = [
  "🔥 New: COD Mobile VIP launched · Get 20% off all packs this week",
  "⚡ Instant crypto activation · USDT · BTC · BNB accepted",
  "🛡 100% Anti-ban · Trusted by 12,000+ players worldwide",
  "💎 Refer a friend & get 1 week VIP free",
];

export default function AnnouncementBar() {
  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (closed) {
      document.body.classList.remove("has-marquee");
      return;
    }
    document.body.classList.add("has-marquee");
    return () => document.body.classList.remove("has-marquee");
  }, [closed]);
  if (closed) return null;
  const items = [...MESSAGES, ...MESSAGES];
  return (
    <div className="fixed top-0 left-0 right-0 z-[30] h-7 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 text-white text-[11px] font-semibold overflow-hidden">
      <div className="flex items-center">
        <Sparkles className="w-3.5 h-3.5 mx-2 shrink-0" />
        <div className="flex-1 overflow-hidden">
          <div className="flex whitespace-nowrap animate-[marquee_40s_linear_infinite]">
            {items.map((m, i) => (
              <span key={i} className="px-6 py-1.5 inline-flex items-center">
                {m}
                <span className="mx-3 opacity-50">•</span>
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => setClosed(true)}
          aria-label="Dismiss"
          className="shrink-0 mx-1 p-1 rounded hover:bg-white/15 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
