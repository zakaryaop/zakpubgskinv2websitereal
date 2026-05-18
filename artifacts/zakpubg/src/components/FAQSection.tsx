import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

const FAQS = [
  {
    q: "Kya yeh safe hai? Account ban toh nahi hoga?",
    a: "Bilkul safe hai. Hamara anti-ban system 99%+ accounts ko protect karta hai. 12,000+ players use kar rahe hain bina kisi issue ke. Phir bhi best practice: account naya hi use karein, asli ID par avoid karein.",
  },
  {
    q: "Payment ke baad VIP kab milta hai?",
    a: "Payment confirm hote hi (1-2 minutes) auto Telegram VIP group ka invite link aap ke account par aa jayega. Crypto network par depend karta hai — USDT TRC20 fastest hai.",
  },
  {
    q: "Kaunse crypto accept karte ho?",
    a: "USDT (TRC20/ERC20/BEP20), Bitcoin (BTC), BNB, ETH, LTC, DOGE aur 100+ coins NOWPayments ke through. Best aur sasta: USDT TRC20.",
  },
  {
    q: "Refund policy kya hai?",
    a: "Agar product activate nahi hua ya hamare server ki wajah se koi issue aaya, toh 24 hours ke andar full refund process kiya jaata hai. Refund ke liye WhatsApp ya Telegram par support se rabta karein.",
  },
  {
    q: "Multiple devices par chal sakta hai?",
    a: "1 license = 1 device. Agar device change karna ho toh support se contact karein, hum reset kar denge.",
  },
  {
    q: "Renewal kaise karein?",
    a: "Account page par jaake 'Extend' button dabayein, ya phir same product wapas khareed lein. Old VIP expire hote hi naya activate ho jata hai.",
  },
];

export default function FAQSection() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="rounded-2xl border border-white/10 bg-[#12121c] p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-400/20 flex items-center justify-center">
          <HelpCircle className="w-4 h-4 text-violet-300" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-violet-300/80">FAQ</div>
          <h3 className="text-base sm:text-lg font-black text-white leading-tight">Frequently Asked Questions</h3>
        </div>
      </div>
      <div className="space-y-1.5">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className={`rounded-xl border transition-all ${isOpen ? "border-violet-400/30 bg-violet-500/5" : "border-white/[0.06] bg-white/[0.02] hover:border-white/15"}`}>
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center justify-between gap-3 p-3 text-left"
              >
                <span className={`text-xs sm:text-sm font-bold ${isOpen ? "text-white" : "text-slate-200"}`}>{f.q}</span>
                <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? "rotate-180 text-violet-300" : "text-slate-400"}`} />
              </button>
              <div className={`overflow-hidden transition-all ${isOpen ? "max-h-60" : "max-h-0"}`}>
                <p className="px-3 pb-3 text-xs text-slate-400 leading-relaxed">{f.a}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
