import { Crown, Clock } from "lucide-react";
import { useLocation } from "wouter";

const TelegramIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.41 13.946l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.738.613z" />
  </svg>
);

const WhatsAppIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

export default function Login() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-background bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background z-0" />

      <div className="glass-panel p-8 md:p-12 rounded-3xl max-w-md w-full relative z-10 border-border text-center">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.15)]">
            <Crown className="w-8 h-8 text-primary" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2 font-heading">ZakPubgSkin VIP</h2>
        <p className="text-muted-foreground text-sm mb-8">Your exclusive PUBG membership portal</p>

        <div className="bg-primary/10 border border-primary/20 rounded-2xl px-6 py-6 mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-primary animate-pulse" />
            <span className="text-primary font-bold text-base">Waiting for Approval</span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your payment has been submitted and is currently under review. Once approved, you will receive your VIP group invite link directly on Telegram.
          </p>
        </div>

        <div className="bg-card/40 border border-border rounded-xl px-4 py-3 mb-8 text-left">
          <p className="text-xs text-muted-foreground leading-relaxed">
            💡 <span className="text-foreground font-medium">Already submitted?</span> If you need help or have questions about your payment status, contact our support team below.
          </p>
        </div>

        <div className="flex gap-3 mb-6">
          <a
            href="https://t.me/zakarya_op"
            target="_blank"
            rel="noopener noreferrer"
            className="smooth-button flex-1 bg-primary text-primary-foreground font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <TelegramIcon />
            Telegram
          </a>
          <a
            href="https://wa.me/923192530306"
            target="_blank"
            rel="noopener noreferrer"
            className="smooth-button flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <WhatsAppIcon />
            WhatsApp
          </a>
        </div>

        <div className="pt-5 border-t border-border">
          <button
            onClick={() => setLocation("/")}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
