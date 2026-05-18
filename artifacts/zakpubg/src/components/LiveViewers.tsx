import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

export default function LiveViewers({ seed = 1 }: { seed?: number }) {
  const initial = 6 + (seed % 11);
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => {
      setCount(c => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = Math.max(4, Math.min(28, c + delta));
        return next;
      });
    }, 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-400/25 text-rose-300">
      <span className="relative flex w-1.5 h-1.5">
        <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-70" />
        <span className="relative w-1.5 h-1.5 rounded-full bg-rose-400" />
      </span>
      <Eye className="w-3 h-3" />
      <span>{count} viewing now</span>
    </span>
  );
}
