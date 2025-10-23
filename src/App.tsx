import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import {
  QueryClient,
  QueryClientProvider,
  QueryCache,
  MutationCache,
} from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingSkeleton } from "@/components/common/LoadingState";
import { ROUTES } from "@/lib/constants";
import BottomNav from "@/components/layout/BottomNav";
import Header from "@/components/layout/Header";
import ProtectedSellerRoute from "./components/auth/ProtectedSellerRoute";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";
import { MessageCountProvider } from "@/contexts/MessageCountContext";
import { WelcomeModalProvider } from "@/contexts/WelcomeModalContext";

import { MessagePopup } from "@/components/notifications/MessagePopup";
import { OfflineNotification } from "@/components/common/OfflineNotification";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
// import { AIChatbot } from "@/components/chatbot/AIChatbot";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { ProfileCompletionModal } from "@/components/profile/ProfileCompletionModal";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";

import { AuthGuard } from "@/components/auth/AuthGuard";
import { BannedUserModal } from "@/components/auth/BannedUserModal";
import { useBanCheck } from "@/hooks/useBanCheck";
import {
  initializeOneSignal,
  requestNotificationPermission,
  setupNotificationClickHandler,
} from "@/utils/oneSignal";
import { initializePushNotifications } from "@/utils/pushNotifications";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";
import { useOnboarding } from "@/hooks/useOnboarding";
import { DevToolsProtection } from "@/components/security/DevToolsProtection";
import { useEffect, useCallback } from "react";
import { NetworkNotification } from "@/components/notifications/NetworkNotification";
import { useAutoReload } from "@/hooks/useAutoReload";
import { PerformanceMonitor } from "@/components/common/PerformanceMonitor";
import { AccessibilityProvider } from "@/components/common/AccessibilityProvider";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import { NavigationPreloader } from "@/components/common/NavigationPreloader";
import { PageLoadError } from "@/components/common/PageLoadError";

import "@/styles/mobile-fixes.css";

import "@/styles/scroll-optimization.css";
import "@/styles/bottom-nav.css";

// Lazy load pages for better performance with error boundaries
const Index = React.lazy(() =>
  import("./pages/Index").catch(() => ({
    default: PageLoadError,
  }))
);
const NotFound = React.lazy(() =>
  import("./pages/NotFound").catch(() => ({
    default: PageLoadError,
  }))
);
const ProductDetails = React.lazy(() =>
  import("./pages/ProductDetails").catch(() => ({
    default: PageLoadError,
  }))
);
const Profile = React.lazy(() =>
  import("./pages/Profile").catch(() => ({
    default: PageLoadError,
  }))
);
const SellerProfile = React.lazy(() =>
  import("./components/profiles/SellerProfile").catch(() => ({
    default: PageLoadError,
  }))
);
const Messages = React.lazy(() =>
  import("./pages/Messages").catch(() => ({
    default: PageLoadError,
  }))
);
const Orders = React.lazy(() =>
  import("./pages/Orders").catch(() => ({
    default: PageLoadError,
  }))
);
const Search = React.lazy(() =>
  import("./pages/Search").catch(() => ({
    default: PageLoadError,
  }))
);
const SellerSearch = React.lazy(() =>
  import("./pages/SellerSearch").catch(() => ({
    default: PageLoadError,
  }))
);
const Settings = React.lazy(() =>
  import("./pages/Settings").catch(() => ({
    default: PageLoadError,
  }))
);
const Sell = React.lazy(() =>
  import("./pages/Sell").catch(() => ({
    default: PageLoadError,
  }))
);
const Dashboard = React.lazy(() =>
  import("./pages/Dashboard").catch(() => ({
    default: PageLoadError,
  }))
);
const Marketplace = React.lazy(() =>
  import("./pages/Marketplace").catch(() => ({
    default: PageLoadError,
  }))
);
const Cart = React.lazy(() =>
  import("./pages/Cart").catch(() => ({
    default: PageLoadError,
  }))
);
const Checkout = React.lazy(() =>
  import("./pages/Checkout").catch(() => ({
    default: PageLoadError,
  }))
);
const Favorites = React.lazy(() =>
  import("./pages/Favorites").catch(() => ({
    default: PageLoadError,
  }))
);
const AuthPage = React.lazy(() =>
  import("./components/auth/AuthPage").catch(() => ({
    default: PageLoadError,
  }))
);
const SignupPage = React.lazy(() =>
  import("./components/auth/SignupPage").catch(() => ({
    default: PageLoadError,
  }))
);
const TestSignup = React.lazy(() =>
  import("./pages/TestSignup").catch(() => ({
    default: PageLoadError,
  }))
);
const Admin = React.lazy(() =>
  import("./pages/Admin").catch(() => ({
    default: PageLoadError,
  }))
);
const LearnMore = React.lazy(() =>
  import("./pages/LearnMore").catch(() => ({
    default: PageLoadError,
  }))
);
const Notifications = React.lazy(() =>
  import("./pages/Notifications").catch(() => ({
    default: PageLoadError,
  }))
);
const VerificationRequest = React.lazy(() =>
  import("./pages/VerificationRequest").catch(() => ({
    default: PageLoadError,
  }))
);
const Wallet = React.lazy(() =>
  import("./pages/Wallet").catch(() => ({
    default: PageLoadError,
  }))
);
const Chat = React.lazy(() =>
  import("./pages/Chat").catch(() => ({
    default: PageLoadError,
  }))
);
const TermsOfService = React.lazy(() =>
  import("./pages/TermsOfService").catch(() => ({
    default: PageLoadError,
  }))
);
const PrivacyPolicy = React.lazy(() =>
  import("./pages/PrivacyPolicy").catch(() => ({
    default: PageLoadError,
  }))
);
const Suggestions = React.lazy(() =>
  import("./pages/Suggestions").catch(() => ({
    default: PageLoadError,
  }))
);
const LiveFeed = React.lazy(() =>
  import("./pages/LiveFeed").catch(() => ({
    default: PageLoadError,
  }))
);
const Games = React.lazy(() =>
  import("./pages/Games").catch(() => ({
    default: PageLoadError,
  }))
);

// Clear all caches on app start
const clearAllCaches = async () => {
  if ("caches" in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }
};

// Clear caches on load
clearAllCaches();

// Memory-optimized query client for low memory devices
const isLowMemory =
  (navigator as any).deviceMemory < 2 || navigator.hardwareConcurrency < 4;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: isLowMemory ? 0 : 30000, // No cache on low memory
      retry: 0, // No retries on low memory
      refetchOnWindowFocus: !isLowMemory,
      refetchOnReconnect: true,
      refetchOnMount: true,
      networkMode: "online",
      refetchInterval: false,
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
  // Limit cache size for memory efficiency
  queryCache: new QueryCache({
    onError: (error) => {
      // Secure error logging without exposing sensitive data
      const errorMessage =
        error instanceof Error ? error.message : "Unknown query error";
      console.error("[QUERY_ERROR]", errorMessage.replace(/[\r\n]/g, ""));
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      // Secure error logging without exposing sensitive data
      const errorMessage =
        error instanceof Error ? error.message : "Unknown mutation error";
      console.error("[MUTATION_ERROR]", errorMessage.replace(/[\r\n]/g, ""));
    },
  }),
});

// Clear cache more frequently on low memory devices
setInterval(
  () => {
    queryClient.clear();
  },
  isLowMemory ? 60 * 1000 : 5 * 60 * 1000
); // 1 min vs 5 min

const AppContent = () => {
  useScrollToTop();
  useBackgroundSync();
  useRealTimeUpdates();
  useLiteMode();
  useAutoReload();
  const { metrics } = usePerformanceOptimization();
  const { showModal, missingFields, dismissModal, completeProfile } =
    useProfileCompletion();
  const { isBanned, banReason, userEmail } = useBanCheck();
  const { showOnboarding, closeOnboarding } = useOnboarding();

  useEffect(() => {
    const setupNotifications = async () => {
      // Register service worker
      if ("serviceWorker" in navigator) {
        try {
          await navigator.serviceWorker.register("/sw.js");
          console.log("Service worker registered");
        } catch (error) {
          console.error("Service worker registration failed:", error);
        }
      }

      // Setup notification click handlers
      setupNotificationClickHandler();

      // Initialize push notifications (skip on localhost)
      if (
        window.location.hostname !== "localhost" &&
        window.location.hostname !== "127.0.0.1"
      ) {
        await initializePushNotifications();
        await requestNotificationPermission();
        await initializeOneSignal();
      } else {
        console.log("Push notifications skipped on localhost");
      }
    };
    setupNotifications();
  }, []);

  if (isBanned) {
    return (
      <BannedUserModal
        open={true}
        userEmail={userEmail}
        banReason={banReason}
      />
    );
  }

  return (
    <>
      <PerformanceMonitor />
      <NetworkNotification />
      <Header />
      {/* Content container with proper layout structure */}
      <div
        className={`min-h-screen ${
          metrics.isLowEndDevice ? "low-end-device" : ""
        }`}
        style={{ overscrollBehaviorY: "none" }}
      >
        <AuthGuard>
          <NavigationPreloader>
            <Suspense fallback={<LoadingSkeleton />}>
              <div className="page-transition student-focus">
                <Routes>
                  <Route path={ROUTES.home} element={<Index />} />
                  <Route path={ROUTES.auth} element={<SignupPage />} />
                  <Route path="/old-auth" element={<AuthPage />} />
                  <Route path="/test-signup" element={<TestSignup />} />
                  <Route path="/learn-more" element={<LearnMore />} />
                  <Route path="/notifications" element={<Notifications />} />
                  <Route path={ROUTES.marketplace} element={<Marketplace />} />
                  <Route path="/product/:id" element={<ProductDetails />} />
                  <Route path={ROUTES.profile} element={<Profile />} />
                  <Route path="/seller/:sellerId" element={<SellerProfile />} />
                  <Route path="/messages" element={<Messages />} />
                  <Route path="/chat/:conversationId" element={<Chat />} />
                  <Route path={ROUTES.orders} element={<Orders />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="/sellers" element={<SellerSearch />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route
                    path={ROUTES.sell}
                    element={
                      <ProtectedSellerRoute>
                        <Sell />
                      </ProtectedSellerRoute>
                    }
                  />
                  <Route
                    path={ROUTES.dashboard}
                    element={
                      <ProtectedSellerRoute>
                        <Dashboard />
                      </ProtectedSellerRoute>
                    }
                  />
                  <Route path="/favorites" element={<Favorites />} />
                  <Route path={ROUTES.cart} element={<Cart />} />
                  <Route path={ROUTES.checkout} element={<Checkout />} />
                  <Route path={ROUTES.admin} element={<Admin />} />
                  <Route
                    path="/verification-request"
                    element={<VerificationRequest />}
                  />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route
                    path="/terms-of-service"
                    element={<TermsOfService />}
                  />
                  <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                  <Route path="/suggestions" element={<Suggestions />} />
                  <Route path="/live-feed" element={<LiveFeed />} />
                  <Route path="/games" element={<Games />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </div>
            </Suspense>
          </NavigationPreloader>
        </AuthGuard>
      </div>
      <BottomNav />
      <MessagePopup />
      <OfflineNotification />
      {/* <AIChatbot /> */}

      <PWAInstallPrompt />
      <OnboardingModal open={showOnboarding} onClose={closeOnboarding} />

      <ProfileCompletionModal
        open={showModal && !isBanned}
        onClose={dismissModal}
        missingFields={missingFields}
        onComplete={completeProfile}
      />
      <DevToolsProtection />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
      <BrowserRouter>
        <AccessibilityProvider>
          <ThemeProvider defaultTheme="light">
            <SecurityProvider>
              <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <WelcomeModalProvider>
                    <ProfileProvider>
                      <RealTimeProvider>
                        <MessageCountProvider>
                          <AppContent />
                        </MessageCountProvider>
                      </RealTimeProvider>
                    </ProfileProvider>
                  </WelcomeModalProvider>
                </TooltipProvider>
              </QueryClientProvider>
            </SecurityProvider>
          </ThemeProvider>
        </AccessibilityProvider>
      </BrowserRouter>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
