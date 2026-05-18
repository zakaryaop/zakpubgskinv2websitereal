import { motion } from "framer-motion";
import { Headphones, MessageCircle, Clock, HelpCircle, Send, Globe, Plus } from "lucide-react";
import PageShell from "@/components/PageShell";

const fadeUp = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const faqs = [
  { q: "How long does payment verification take?", a: "Payment verification typically takes 5-15 minutes. Our admin team reviews each payment manually to ensure security." },
  { q: "What if my payment was rejected?", a: "If your payment was rejected, it may be due to an incorrect screenshot or amount. You can resubmit with the correct details from the checkout page." },
  { q: "Can I change my membership plan?", a: "Plan changes are not supported mid-subscription. You can choose a different plan when your current membership expires." },
  { q: "How do I access VIP files?", a: "After your payment is approved, log in to the Client Portal using your Telegram ID. All VIP files, configs, and guides will be available in your dashboard." },
  { q: "What payment methods are supported?", a: "We support 30+ payment methods across 11 countries including PayPal, Binance, Easypaisa, JazzCash, UPI, bKash, Vodafone Cash, and many more regional options." },
  { q: "Can I get a refund?", a: "Due to the digital nature of our products, all sales are final once membership is activated. Please review our Terms of Service for more details." },
  { q: "My membership expired. How do I renew?", a: "Go to the Memberships section and select your preferred plan. Complete the checkout process again to renew your VIP access." },
  { q: "Is sharing my VIP files allowed?", a: "No. Sharing VIP content or account credentials with non-members is strictly prohibited and will result in immediate membership termination." },
];

const cards = [
  { icon: <MessageCircle className="w-5 h-5" />, title: "Telegram Support", desc: "Chat with us directly", link: "https://t.me/zakpubgskin", color: "text-[#229ED9]", bg: "bg-[#229ED9]/15", ring: "ring-[#229ED9]/30" },
  { icon: <Clock className="w-5 h-5" />, title: "Response Time", desc: "Usually within 5-15 min", color: "text-violet-300", bg: "bg-violet-500/15", ring: "ring-violet-400/30" },
  { icon: <Globe className="w-5 h-5" />, title: "Available 24/7", desc: "Multi-language support", color: "text-lime-400", bg: "bg-lime-500/15", ring: "ring-lime-400/30" },
];

export default function Support() {
  return (
    <PageShell>
      <motion.div {...fadeUp} className="text-center mb-8 mt-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-violet-500/15 ring-1 ring-inset ring-violet-400/30 items-center justify-center mb-3">
          <Headphones className="w-7 h-7 text-violet-300" />
        </div>
        <h1 className="text-4xl font-black tracking-tight" data-testid="text-support-title">
          Support <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Center</span>
        </h1>
        <p className="text-sm text-slate-400 mt-2">We're here to help you 24/7</p>
      </motion.div>

      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {cards.map((item, i) => (
          <motion.div key={i} {...fadeUp} transition={{ delay: i * 0.07 }}
            className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-4">
            <div className={`w-10 h-10 rounded-xl ${item.bg} ring-1 ring-inset ${item.ring} flex items-center justify-center mb-3 ${item.color}`}>
              {item.icon}
            </div>
            <h3 className="text-white font-bold text-sm">{item.title}</h3>
            <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
            {item.link && (
              <a href={item.link} target="_blank" rel="noopener noreferrer" className={`${item.color} text-xs font-semibold mt-2 inline-flex items-center gap-1 hover:underline`}>
                <Send className="w-3 h-3" /> Open Chat
              </a>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div {...fadeUp} transition={{ delay: 0.15 }}>
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-violet-300" />
          <h2 className="text-xl font-bold">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <motion.details key={i} {...fadeUp} transition={{ delay: 0.04 * i }}
              className="group rounded-xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] open:ring-violet-400/30 transition-all">
              <summary className="flex items-center justify-between gap-3 px-4 py-3.5 cursor-pointer text-white font-medium text-sm list-none">
                <span>{faq.q}</span>
                <Plus className="w-4 h-4 text-slate-400 shrink-0 group-open:rotate-45 transition-transform" />
              </summary>
              <div className="px-4 pb-4">
                <p className="text-slate-400 text-sm leading-relaxed">{faq.a}</p>
              </div>
            </motion.details>
          ))}
        </div>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.25 }}
        className="mt-8 relative overflow-hidden rounded-2xl ring-1 ring-inset ring-violet-400/20 bg-gradient-to-br from-violet-600/15 to-cyan-500/15 p-6 text-center">
        <h3 className="text-lg font-bold">Still Need Help?</h3>
        <p className="text-slate-300 text-sm mt-1.5 mb-4">Our support team is always ready on Telegram.</p>
        <a href="https://t.me/zakpubgskin" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-white text-black px-6 h-11 rounded-xl font-black text-xs uppercase tracking-wider hover:scale-[1.02] transition-transform"
          data-testid="button-contact-telegram">
          <MessageCircle className="w-4 h-4" /> Chat on Telegram
        </a>
      </motion.div>
    </PageShell>
  );
}
