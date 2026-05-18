import { useLocation } from "wouter";
import { Home as HomeIcon, Compass } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

export default function NotFound() {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen relative bg-[#070710] text-white overflow-hidden flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      <div className="relative text-center max-w-md">
        <BrandLogo size={56} className="mx-auto drop-shadow-[0_0_20px_rgba(168,85,247,0.6)]" />
        <h1 className="mt-6 text-7xl sm:text-8xl font-black tracking-tighter leading-none">
          <span className="bg-gradient-to-br from-cyan-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">404</span>
        </h1>
        <h2 className="mt-3 text-2xl font-bold">Page not found</h2>
        <p className="mt-2 text-sm text-slate-400">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-7 flex items-center justify-center gap-2.5">
          <button onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-violet-500/30 hover:scale-[1.02] transition-transform">
            <HomeIcon className="w-4 h-4" /> Home
          </button>
          <button onClick={() => navigate("/contact")}
            className="inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 hover:ring-white/30 text-white text-xs font-bold uppercase tracking-wider transition-all">
            <Compass className="w-4 h-4" /> Contact
          </button>
        </div>
      </div>
    </div>
  );
}
