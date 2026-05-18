import { useEffect, useState } from "react";
import { Flame } from "lucide-react";

function nextMidnight(): number {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d.getTime();
}

function fmt(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, "0");
}

export default function CountdownStrip() {
  const [target] = useState(nextMidnight());
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const diff = Math.max(0, target - now);
  const h = diff / 3.6e6;
  const m = (diff % 3.6e6) / 6e4;
  const s = (diff % 6e4) / 1e3;
  return (
    <div className="rounded-xl bg-gradient-to-r from-rose-500/15 via-orange-500/10 to-amber-500/15 border border-rose-400/25 px-3 py-2 flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5 min-w-0">
        <Flame className="w-3.5 h-3.5 text-rose-300 shrink-0" />
        <span className="text-[11px] font-bold text-rose-200 truncate">Flash Sale ends in</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {[
          { v: fmt(h), l: "H" },
          { v: fmt(m), l: "M" },
          { v: fmt(s), l: "S" },
        ].map((b, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-white text-[11px] font-black font-mono tabular-nums">{b.v}</span>
            {i < 2 && <span className="text-rose-300/60 text-[10px] font-black">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
