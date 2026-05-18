import { useEffect, useState } from "react";
import { ShoppingBag, X } from "lucide-react";

const PURCHASES = [
  { name: "Ahmad K.", item: "Aimbot VIP · 30 days", time: "2 min ago", g: "from-violet-500 to-fuchsia-500" },
  { name: "Dmitry V.", item: "Magic Bullet · 60 days", time: "5 min ago", g: "from-cyan-500 to-blue-500" },
  { name: "Rahul S.", item: "All-in-One Mega · 30 days", time: "8 min ago", g: "from-amber-500 to-orange-500" },
  { name: "Bilal R.", item: "ESP Wallhack · 30 days", time: "12 min ago", g: "from-emerald-500 to-teal-500" },
  { name: "Hassan M.", item: "No Recoil VIP · 60 days", time: "18 min ago", g: "from-lime-500 to-emerald-500" },
  { name: "Priya K.", item: "Aimbot VIP · 7 days", time: "22 min ago", g: "from-fuchsia-500 to-purple-500" },
  { name: "Ivan S.", item: "Auto Headshot · 30 days", time: "27 min ago", g: "from-indigo-500 to-violet-500" },
  { name: "Aleksei P.", item: "Magic Bullet · 30 days", time: "33 min ago", g: "from-rose-500 to-pink-500" },
];

export default function RecentPurchasesToast() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (dismissed) return;
    const showT = setTimeout(() => setVisible(true), 8000);
    return () => clearTimeout(showT);
  }, [dismissed]);

  useEffect(() => {
    if (!visible || dismissed) return;
    const cycle = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % PURCHASES.length);
        setVisible(true);
      }, 600);
    }, 180000);
    return () => clearInterval(cycle);
  }, [visible, dismissed]);

  if (dismissed) return null;
  const p = PURCHASES[idx];

  return (
    <div
      className={`fixed bottom-5 left-3 sm:left-5 z-[70] max-w-[280px] sm:max-w-[320px] transition-all duration-500 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4 pointer-events-none"
      }`}
    >
      <div className="relative flex items-center gap-2.5 p-2.5 pr-7 rounded-xl bg-[#12121c]/95 backdrop-blur-xl border border-white/10 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.6)]">
        <div className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${p.g} flex items-center justify-center shadow-md`}>
          <ShoppingBag className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold text-white truncate">
            {p.name} <span className="text-slate-400 font-normal">just bought</span>
          </div>
          <div className="text-[10px] text-cyan-300 font-semibold truncate">{p.item}</div>
          <div className="text-[9px] text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
            {p.time}
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md text-slate-500 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
