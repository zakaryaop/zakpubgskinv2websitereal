import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import PageShell from "@/components/PageShell";

const fadeUp = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const sections: Array<{ t: string; b?: string; list?: string[] }> = [
  { t: "1. Information We Collect", b: "We collect minimal information required to provide our services:", list: [
    "Telegram ID (for account identification and login)",
    "Country selection (for regional pricing)",
    "Payment method and screenshot (for verification)",
    "Membership plan selection",
  ]},
  { t: "2. How We Use Your Information", b: "Your information is used solely for:", list: [
    "Verifying your payment and activating membership",
    "Providing access to VIP content and services",
    "Communicating membership status via Telegram",
    "Tracking membership expiry dates",
  ]},
  { t: "3. Data Storage & Security", b: "All data is stored securely in encrypted databases. Payment screenshots are stored temporarily for verification. We use industry-standard security including HTTPS, bcrypt password hashing, and JWT token-based sessions." },
  { t: "4. Data Sharing", b: "We do not sell, trade, or share your personal information with third parties. Your data is only accessible to our admin team for payment verification and membership management." },
  { t: "5. Cookies & Tracking", b: "We use minimal local storage to remember your language preference and login session. We do not use third-party tracking cookies or analytics that collect personal data." },
  { t: "6. Your Rights", b: "You have the right to request access to, correction of, or deletion of your personal data at any time. To exercise these rights, contact our support team on Telegram." },
  { t: "7. Data Retention", b: "We retain membership data for the duration of your active membership plus 30 days after expiry. Payment screenshots are retained for 90 days for dispute resolution. You may request early deletion by contacting support." },
  { t: "8. Changes to This Policy", b: "We may update this privacy policy periodically. Users will be notified of significant changes through our Telegram channel. Continued use of our services constitutes acceptance of the updated policy." },
];

export default function Privacy() {
  return (
    <PageShell>
      <motion.div {...fadeUp} className="text-center mb-8 mt-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-lime-500/15 ring-1 ring-inset ring-lime-400/30 items-center justify-center mb-3">
          <Lock className="w-7 h-7 text-lime-400" />
        </div>
        <h1 className="text-4xl font-black tracking-tight" data-testid="text-privacy-title">
          Privacy <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Policy</span>
        </h1>
        <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Last updated: February 2026</p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-6 sm:p-8 space-y-7">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-base font-bold text-white mb-2">{s.t}</h2>
            {s.b && <p className="text-sm text-slate-400 leading-relaxed">{s.b}</p>}
            {s.list && (
              <ul className="mt-3 space-y-1.5">
                {s.list.map((item) => (
                  <li key={item} className="text-sm text-slate-400 flex items-start gap-2">
                    <span className="text-violet-400 mt-1.5 w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-slate-500">
            For privacy inquiries, contact us on{" "}
            <a href="https://t.me/zakpubgskin" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200 underline-offset-4 hover:underline">Telegram</a>.
          </p>
        </div>
      </motion.div>
    </PageShell>
  );
}
