import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import PageShell from "@/components/PageShell";

const fadeUp = { initial: { opacity: 0, y: 14 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

const sections = [
  { t: "1. Acceptance of Terms", b: "By accessing and using ZakPubgSkin services, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services. These terms apply to all visitors, users, and members." },
  { t: "2. Membership Plans", b: "ZakPubgSkin offers VIP membership plans (30-day and 60-day). Upon successful payment verification, your membership will be activated for the selected duration. Memberships are non-transferable and tied to a single Telegram account." },
  { t: "3. Payment & Verification", b: "All payments must be made through supported methods listed on our checkout page. A valid screenshot must be provided for verification. Our team reviews each payment manually and reserves the right to approve or reject any submission. Approval typically takes 5-15 minutes." },
  { t: "4. Refund Policy", b: "Due to the digital nature of our products, all sales are final. Refunds are not available once a membership has been activated. If your payment was rejected, you may resubmit. For disputes, contact our support team." },
  { t: "5. User Conduct", b: "Users agree not to share, redistribute, or resell any files, configs, or content provided through VIP membership. Sharing credentials or VIP content with non-members will result in immediate termination without refund." },
  { t: "6. Service Availability", b: "We strive to provide uninterrupted service but do not guarantee 100% uptime. Configs and files are updated regularly. We reserve the right to modify, update, or discontinue services at any time." },
  { t: "7. Limitation of Liability", b: "ZakPubgSkin is not responsible for any account bans, game restrictions, or other consequences resulting from the use of our products. Users assume all risks associated with using third-party configurations in games." },
  { t: "8. Changes to Terms", b: "We reserve the right to update these terms at any time. Continued use after changes constitutes acceptance. Users will be notified of significant changes via our Telegram channel." },
];

export default function Terms() {
  return (
    <PageShell>
      <motion.div {...fadeUp} className="text-center mb-8 mt-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-violet-500/15 ring-1 ring-inset ring-violet-400/30 items-center justify-center mb-3">
          <Shield className="w-7 h-7 text-violet-300" />
        </div>
        <h1 className="text-4xl font-black tracking-tight" data-testid="text-terms-title">
          Terms of <span className="bg-gradient-to-r from-cyan-300 to-fuchsia-400 bg-clip-text text-transparent">Service</span>
        </h1>
        <p className="text-xs text-slate-500 mt-2 uppercase tracking-widest">Last updated: February 2026</p>
      </motion.div>

      <motion.div {...fadeUp} transition={{ delay: 0.1 }}
        className="rounded-2xl bg-white/[0.03] ring-1 ring-inset ring-white/[0.06] p-6 sm:p-8 space-y-7">
        {sections.map((s) => (
          <section key={s.t}>
            <h2 className="text-base font-bold text-white mb-2">{s.t}</h2>
            <p className="text-sm text-slate-400 leading-relaxed">{s.b}</p>
          </section>
        ))}
        <div className="pt-4 border-t border-white/10">
          <p className="text-xs text-slate-500">
            For questions about these terms, contact us on{" "}
            <a href="https://t.me/zakpubgskin" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:text-violet-200 underline-offset-4 hover:underline">Telegram</a>.
          </p>
        </div>
      </motion.div>
    </PageShell>
  );
}
