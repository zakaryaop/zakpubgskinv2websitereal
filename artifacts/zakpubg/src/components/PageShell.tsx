import { ReactNode } from "react";
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import BrandLogo from "./BrandLogo";

function Brand() {
  return (
    <span className="font-black text-base tracking-tight leading-none">
      <span className="text-white">ZAK</span>
      <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">PUBG</span>
      <span className="text-white">SKIN</span>
    </span>
  );
}

type Props = {
  children: ReactNode;
  backTo?: string;
  backLabel?: string;
  maxWidth?: string;
};

export default function PageShell({ children, backTo = "/", backLabel = "Back", maxWidth = "max-w-3xl" }: Props) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen relative bg-[#070710] text-white overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-fuchsia-600/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 pt-5 pb-2 grid grid-cols-3 items-center max-w-6xl mx-auto">
        <div className="justify-self-start">
          <button onClick={() => navigate(backTo)} aria-label={backLabel}
            className="group inline-flex items-center gap-1.5 pl-2 pr-3 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-400/40 text-slate-300 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
            <span className="text-xs font-semibold">{backLabel}</span>
          </button>
        </div>
        <button onClick={() => navigate("/")} className="justify-self-center flex items-center gap-2" aria-label="ZakPubgSkin home">
          <BrandLogo size={28} className="drop-shadow-[0_0_12px_rgba(168,85,247,0.5)]" />
          <Brand />
        </button>
        <div />
      </header>

      <main className={`relative z-10 ${maxWidth} mx-auto px-4 sm:px-6 pb-16 pt-4`}>
        {children}
      </main>
    </div>
  );
}
