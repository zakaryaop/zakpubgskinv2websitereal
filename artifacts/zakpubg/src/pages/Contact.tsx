import { useState } from "react";
import { motion } from "framer-motion";
import { Copy, Check, ExternalLink, Clock, Shield, Zap, Sparkles, Send } from "lucide-react";
import PageShell from "@/components/PageShell";

const WHATSAPP_DISPLAY = "+92 319 253 0306";
const WHATSAPP_RAW = "923192530306";
const WHATSAPP_GROUP = "https://chat.whatsapp.com/CT29StHOdZaBPCwzGL8HKP?mode=gi_t";
const TELEGRAM = "zakpubgskin";
const TELEGRAM_LINK = "https://t.me/zakpubgskin";
const TIKTOK = "zakpubgskin5";
const TIKTOK_LINK = "https://www.tiktok.com/@zakpubgskin5";
const EMAIL = "zakpubgskin@gmail.com";

const TelegramIcon = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
);
const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-1.073zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/></svg>
);
const TikTokIcon = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.1z"/></svg>
);
const EmailIcon = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 7 9 7 9-7"/></svg>
);
const UsersIcon = (
  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor"><path d="M16 11a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-8 0a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-2.67 0-8 1.34-8 4v3h11v-3c0-.96.74-2.06 1.96-2.92A12.7 12.7 0 0 0 8 13Zm8 0c-.36 0-.78.03-1.22.08C16.18 14.21 17 15.6 17 17v3h7v-3c0-2.66-5.33-4-8-4Z"/></svg>
);

type Channel = {
  id: string;
  label: string;
  title: string;
  handle: string;
  description: string;
  href: string;
  copyValue?: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  ring: string;
  cta: string;
};

const channels: Channel[] = [
  {
    id: "telegram",
    label: "Telegram",
    title: "Direct Message",
    handle: `@${TELEGRAM}`,
    description: "Fastest way to reach us. Order help, configs & VIP support — instantly.",
    href: TELEGRAM_LINK,
    copyValue: `@${TELEGRAM}`,
    icon: TelegramIcon,
    color: "text-[#229ED9]",
    bg: "bg-[#229ED9]/15",
    ring: "hover:ring-[#229ED9]/40 hover:shadow-[0_0_30px_-5px_#229ED9]",
    cta: "Open Telegram",
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    title: "Direct Chat",
    handle: WHATSAPP_DISPLAY,
    description: "Chat with us 1-on-1 for orders, payments, and quick queries.",
    href: `https://wa.me/${WHATSAPP_RAW}`,
    copyValue: WHATSAPP_DISPLAY,
    icon: WhatsAppIcon,
    color: "text-[#25D366]",
    bg: "bg-[#25D366]/15",
    ring: "hover:ring-[#25D366]/40 hover:shadow-[0_0_30px_-5px_#25D366]",
    cta: "Open WhatsApp",
  },
  {
    id: "whatsapp-group",
    label: "Community",
    title: "VIP WhatsApp Group",
    handle: "Join VIP Community",
    description: "Updates, giveaways, and tips from other VIP members.",
    href: WHATSAPP_GROUP,
    icon: UsersIcon,
    color: "text-lime-400",
    bg: "bg-lime-500/15",
    ring: "hover:ring-lime-400/40 hover:shadow-[0_0_30px_-5px_#a3e635]",
    cta: "Join Group",
  },
  {
    id: "tiktok",
    label: "TikTok",
    title: "Follow Our TikTok",
    handle: `@${TIKTOK}`,
    description: "Gameplay clips, config demos & pro tips — daily PUBG content.",
    href: TIKTOK_LINK,
    copyValue: `@${TIKTOK}`,
    icon: TikTokIcon,
    color: "text-pink-400",
    bg: "bg-pink-500/15",
    ring: "hover:ring-pink-400/40 hover:shadow-[0_0_30px_-5px_#ec4899]",
    cta: "Open TikTok",
  },
  {
    id: "email",
    label: "Email",
    title: "Business Inquiries",
    handle: EMAIL,
    description: "Partnerships, bulk orders, or formal business — drop an email.",
    href: `mailto:${EMAIL}`,
    copyValue: EMAIL,
    icon: EmailIcon,
    color: "text-violet-300",
    bg: "bg-violet-500/15",
    ring: "hover:ring-violet-400/40 hover:shadow-[0_0_30px_-5px_#a855f7]",
    cta: "Send Email",
  },
];

const trustBadges = [
  { icon: <Clock className="h-3.5 w-3.5" />, label: "Avg reply 5 min" },
  { icon: <Shield className="h-3.5 w-3.5" />, label: "Verified admin" },
  { icon: <Zap className="h-3.5 w-3.5" />, label: "24/7 support" },
];

export default function Contact() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {/* noop */}
  };

  return (
    <PageShell maxWidth="max-w-5xl">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10 mt-4">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-500/10 border border-violet-400/30 text-violet-200 text-[11px] font-bold uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> Contact Us
        </span>
        <h1 className="mt-4 text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight">
          Let's <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Talk.</span>
        </h1>
        <p className="mt-3 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
          Pick your favorite channel — we reply fast on all of them.
        </p>
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {trustBadges.map((b) => (
            <span key={b.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 ring-1 ring-inset ring-white/10 text-[11px] font-medium text-slate-300">
              <span className="text-violet-300">{b.icon}</span>
              {b.label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Channels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {channels.map((c, idx) => (
          <motion.div
            key={c.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.05 }}
            className={`group relative rounded-2xl bg-white/[0.03] backdrop-blur ring-1 ring-inset ring-white/[0.06] p-5 transition-all duration-300 ${c.ring} hover:ring-2`}
            data-testid={`channel-${c.id}`}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className={`shrink-0 w-12 h-12 rounded-xl ${c.bg} ring-1 ring-inset ring-white/10 flex items-center justify-center ${c.color}`}>
                {c.icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{c.label}</p>
                <h3 className="text-base font-bold text-white mt-0.5">{c.title}</h3>
                <p className={`text-xs font-mono mt-0.5 truncate ${c.color}`}>{c.handle}</p>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">{c.description}</p>

            <div className="flex items-center gap-2">
              <a
                href={c.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 h-10 rounded-xl ${c.bg} ring-1 ring-inset ring-white/10 ${c.color} text-xs font-bold uppercase tracking-wider hover:ring-white/30 transition-all`}
                data-testid={`link-${c.id}`}
              >
                {c.cta} <ExternalLink className="h-3.5 w-3.5" />
              </a>
              {c.copyValue && (
                <button
                  type="button"
                  onClick={() => handleCopy(c.id, c.copyValue!)}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 ring-1 ring-inset ring-white/10 text-slate-400 hover:text-white hover:ring-white/30 transition-all"
                  aria-label={`Copy ${c.label}`}
                  data-testid={`copy-${c.id}`}
                >
                  {copiedId === c.id ? <Check className="h-4 w-4 text-lime-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quick CTA */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-8 relative overflow-hidden rounded-2xl ring-1 ring-inset ring-violet-400/20 bg-gradient-to-br from-violet-600/15 via-fuchsia-600/10 to-cyan-500/15 p-6"
      >
        <div className="absolute -top-12 -right-8 w-48 h-48 rounded-full bg-fuchsia-500/20 blur-3xl pointer-events-none" />
        <div className="relative grid sm:grid-cols-[1fr_auto] items-center gap-4">
          <div>
            <h3 className="text-xl font-black tracking-tight">
              Need help <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">right now?</span>
            </h3>
            <p className="text-xs text-slate-300 mt-1.5">Telegram is fastest — admin replies in minutes, 24/7.</p>
          </div>
          <a
            href={TELEGRAM_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 h-11 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider shadow-lg hover:scale-[1.02] transition-transform"
            data-testid="link-telegram-cta"
          >
            <Send className="h-4 w-4" /> Message on Telegram
          </a>
        </div>
      </motion.div>
    </PageShell>
  );
}
