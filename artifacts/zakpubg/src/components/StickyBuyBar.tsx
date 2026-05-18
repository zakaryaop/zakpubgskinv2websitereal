import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type Props = {
  price: string | number;
  duration: number;
  label?: string;
  onBuy: () => void;
};

export default function StickyBuyBar({ price, duration, label, onBuy }: Props) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[75] transition-all duration-300 ${
        show ? "translate-y-0" : "translate-y-full"
      }`}
    >
      <div className="bg-[#080810]/95 backdrop-blur-2xl border-t border-white/10 px-3 py-2.5 sm:py-3 shadow-[0_-10px_30px_-8px_rgba(0,0,0,0.6)]">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 leading-none">{label || "Selected"}</div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-black text-white leading-none">${price}</span>
              <span className="text-[10px] text-slate-400">/ {duration}d</span>
            </div>
          </div>
          <button
            onClick={onBuy}
            className="group inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-black text-slate-950 bg-gradient-to-r from-lime-300 to-emerald-300 hover:from-lime-200 hover:to-emerald-200 active:scale-[0.97] shadow-[0_6px_20px_-8px_rgba(132,204,22,0.6)] transition-all"
          >
            Buy Now
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
