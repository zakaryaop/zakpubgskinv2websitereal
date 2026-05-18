import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setPct(total > 0 ? Math.min(100, (h.scrollTop / total) * 100) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return (
    <div className="scroll-progress-bar fixed top-0 left-0 right-0 h-[2px] z-[100] pointer-events-none">
      <div
        className="h-full bg-gradient-to-r from-cyan-400 via-violet-500 to-fuchsia-500 transition-[width] duration-150 ease-out shadow-[0_0_8px_rgba(168,85,247,0.6)]"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
