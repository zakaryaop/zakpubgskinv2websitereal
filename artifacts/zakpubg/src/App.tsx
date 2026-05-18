import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { StoreProvider } from "@/lib/store";
import { GoogleOAuthProvider } from "@react-oauth/google";
import ScrollProgress from "@/components/ScrollProgress";
import BackToTop from "@/components/BackToTop";
import AnnouncementBar from "@/components/AnnouncementBar";
import PendingPaymentToast from "@/components/PendingPaymentToast";

import Home from "@/pages/Home";

const GamePage = lazy(() => import("@/pages/GamePage"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const Admin = lazy(() => import("@/pages/Admin"));
const Portal = lazy(() => import("@/pages/Portal"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Support = lazy(() => import("@/pages/Support"));
const Contact = lazy(() => import("@/pages/Contact"));
const SignUp = lazy(() => import("@/pages/SignUp"));
const SignIn = lazy(() => import("@/pages/SignIn"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const ForgotUsername = lazy(() => import("@/pages/ForgotUsername"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const Account = lazy(() => import("@/pages/Account"));
const VipDashboard = lazy(() => import("@/pages/VipDashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function PageLoader() {
  return (
    <div className="min-h-screen bg-[#080810] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location]);
  return null;
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/games/:slug" component={GamePage} />
        <Route path="/games/:slug/products/:id" component={ProductDetail} />
        <Route path="/admin" component={Admin} />
        <Route path="/portal" component={Portal} />
        <Route path="/terms" component={Terms} />
        <Route path="/privacy" component={Privacy} />
        <Route path="/support" component={Support} />
        <Route path="/contact" component={Contact} />
        <Route path="/sign-up" component={SignUp} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/signup" component={SignUp} />
        <Route path="/signin" component={SignIn} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/forgot-username" component={ForgotUsername} />
        <Route path="/verify-email" component={VerifyEmail} />
        <Route path="/account" component={Account} />
        <Route path="/vip-dashboard" component={VipDashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function InnerApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <StoreProvider>
      <ThemeProvider>
        <I18nProvider>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <ScrollProgress />
              <AnnouncementBar />
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <BackToTop />
              <PendingPaymentToast />
            </TooltipProvider>
          </AuthProvider>
        </I18nProvider>
      </ThemeProvider>
      </StoreProvider>
    </QueryClientProvider>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || "not-configured"}>
      <InnerApp />
    </GoogleOAuthProvider>
  );
}

export default App;
