import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Menu, X, Crown, Sun, Moon, ArrowRight, User as UserIcon, LogIn, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [location] = useLocation();
  const { currentUser, setCurrentUser } = useStore();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const { user: authUser, logout: authLogout } = useAuth();
  const logout = () => setCurrentUser(null);
  const handleAuthLogout = async () => {
    await authLogout();
    window.location.href = "/";
  };
  const rafRef = useRef<number>(0);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        rafRef.current = requestAnimationFrame(() => {
          setScrolled(window.scrollY > 20);
          ticking = false;
        });
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const navLinks = [
    { href: "/", label: t("nav.home") },
    { href: "/#vip-plans", label: t("nav.memberships") },
    { href: "/#features", label: t("nav.features") },
    { href: "/#faq", label: "FAQ" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <>
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? "bg-background/90 backdrop-blur-sm py-3" : "bg-transparent py-5"}`}>
        <div className="container mx-auto px-6 flex items-center justify-between gap-4">

          {/* LEFT: Logo */}
          <Link href="/" className="flex items-center gap-3 group shrink-0">
            <div className={`flex items-center justify-center bg-primary group-hover:warrior-glow transition-all ${scrolled ? "w-10 h-10" : "w-11 h-11"}`}>
              <Crown className="text-primary-foreground w-5 h-5" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-heading font-black text-xl tracking-tight text-foreground">
                ZakPubg<span className="text-primary">Skin</span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-muted-foreground mt-0.5">VIP Configs</span>
            </div>
          </Link>

          {/* CENTER: Nav links */}
          <div className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-muted-foreground hover:text-primary transition-colors relative group"
              >
                {link.label}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-primary group-hover:w-6 transition-all" />
              </a>
            ))}
          </div>

          {/* RIGHT: Actions */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="w-8 h-8 flex items-center justify-center border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
              data-testid="button-theme-toggle"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
            </button>
            <LanguageSwitcher />
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <Link href="/portal" className="luxury-button flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 font-black text-[10px] uppercase tracking-[0.15em]">
                  <Crown className="w-3 h-3" />
                  {t("nav.dashboard")}
                </Link>
                <button onClick={logout} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors px-1.5">
                  {t("nav.logout")}
                </button>
              </div>
            ) : authUser ? (
              <div className="flex items-center gap-1.5">
                <Link href="/account" className="luxury-button flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 font-black text-[10px] uppercase tracking-[0.15em]" data-testid="link-account">
                  <UserIcon className="w-3 h-3" />
                  {authUser.username}
                </Link>
                <button
                  onClick={handleAuthLogout}
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
                  data-testid="button-auth-logout"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden xl:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <>
                <Link href="/signin" className="flex items-center gap-1 px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:text-primary transition-colors" data-testid="link-signin">
                  <LogIn className="w-3 h-3" />
                  Sign In
                </Link>
                <Link href="/signup" className="luxury-button flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 font-black text-[10px] uppercase tracking-[0.15em] warrior-glow" data-testid="link-signup">
                  Sign Up
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu trigger */}
          <button
            className="md:hidden w-8 h-8 flex items-center justify-center border border-border text-foreground"
            onClick={() => setIsOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* === MOBILE MENU === */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed right-0 top-0 bottom-0 w-[88%] max-w-sm bg-background border-l-2 border-primary z-50 p-4 sm:p-6 flex flex-col shadow-2xl overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-primary flex items-center justify-center">
                    <Crown className="text-primary-foreground w-3.5 h-3.5" />
                  </div>
                  <span className="font-heading font-black text-base text-foreground">
                    ZakPubg<span className="text-primary">Skin</span>
                  </span>
                </div>
                <button onClick={() => setIsOpen(false)} className="w-8 h-8 flex items-center justify-center border border-border text-foreground hover:border-primary hover:text-primary transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {currentUser ? (
                <Link href="/portal" onClick={() => setIsOpen(false)} className="luxury-button mb-6 w-full text-center flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 font-black text-xs uppercase tracking-[0.15em] warrior-glow">
                  <Crown className="w-4 h-4" />
                  {t("nav.dashboard")}
                </Link>
              ) : authUser ? (
                <div className="mb-6 space-y-2">
                  <Link href="/account" onClick={() => setIsOpen(false)} className="luxury-button w-full text-center flex items-center justify-center gap-1.5 bg-primary text-primary-foreground px-4 py-2.5 font-black text-xs uppercase tracking-[0.15em] warrior-glow">
                    <UserIcon className="w-4 h-4" />
                    My Account ({authUser.username})
                  </Link>
                  <button
                    onClick={() => { setIsOpen(false); handleAuthLogout(); }}
                    className="w-full flex items-center justify-center gap-1.5 border border-border hover:border-primary text-foreground hover:text-primary px-4 py-2 font-black text-xs uppercase tracking-[0.15em] transition-colors"
                    data-testid="button-auth-logout-mobile"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 mb-6">
                  <Link href="/signin" onClick={() => setIsOpen(false)} className="w-full text-center flex items-center justify-center gap-1 border border-primary text-primary px-2 py-2 font-black text-[11px] uppercase tracking-[0.1em]">
                    <LogIn className="w-3 h-3" />
                    Sign In
                  </Link>
                  <Link href="/signup" onClick={() => setIsOpen(false)} className="luxury-button w-full text-center flex items-center justify-center gap-1 bg-primary text-primary-foreground px-2 py-2 font-black text-[11px] uppercase tracking-[0.1em] warrior-glow">
                    Sign Up
                  </Link>
                </div>
              )}

              <div className="flex flex-col gap-1 pb-6 border-b border-border">
                {navLinks.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    onClick={() => setIsOpen(false)}
                    className="text-sm font-black uppercase tracking-[0.18em] text-muted-foreground hover:text-primary hover:bg-primary/10 px-4 py-3 transition-all"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-6">
                <button
                  onClick={toggleTheme}
                  className="w-8 h-8 shrink-0 flex items-center justify-center border border-border text-foreground hover:border-primary hover:text-primary transition-colors"
                  data-testid="button-theme-toggle-mobile"
                  aria-label="Toggle theme"
                >
                  {theme === "dark" ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                </button>
                <LanguageSwitcher />
              </div>

              {currentUser && (
                <button onClick={() => { logout(); setIsOpen(false); }} className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors py-2">
                  {t("nav.signOut")}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
