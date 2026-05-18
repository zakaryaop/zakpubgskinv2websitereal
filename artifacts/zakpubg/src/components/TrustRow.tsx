import { Lock, Zap, ShieldCheck, Headphones } from "lucide-react";

export default function TrustRow() {
  const items = [
    { icon: Lock, label: "Secure Crypto", color: "text-emerald-300" },
    { icon: Zap, label: "Instant Delivery", color: "text-cyan-300" },
    { icon: ShieldCheck, label: "Undetected", color: "text-violet-300" },
    { icon: Headphones, label: "24/7 Support", color: "text-amber-300" },
  ];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="flex flex-col items-center gap-1 px-1 py-2 rounded-lg bg-white/[0.025] border border-white/[0.06]"
          >
            <Icon className={`w-3.5 h-3.5 ${it.color}`} />
            <div className="text-[9px] font-bold text-slate-300 text-center leading-tight">{it.label}</div>
          </div>
        );
      })}
    </div>
  );
}
