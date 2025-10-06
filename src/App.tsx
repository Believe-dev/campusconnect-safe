import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import ProtectedSellerRoute from "./components/auth/ProtectedSellerRoute";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { RealTimeProvider } from "@/contexts/RealTimeContext";

import { MessagePopup } from "@/components/notifications/MessagePopup";
import { OfflineNotification } from "@/components/common/OfflineNotification";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
// import { AIChatbot } from "@/components/chatbot/AIChatbot";
import { SecurityProvider } from "@/components/security/SecurityProvider";
import { ProfileCompletionModal } from "@/components/profile/ProfileCompletionModal";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import FloatingBackButton from "@/components/ui/back-button";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { BannedUserModal } from "@/components/auth/BannedUserModal";
import { useBanCheck } from "@/hooks/useBanCheck";
import {
  initializeOneSignal,
  requestNotificationPermission,
} from "@/utils/oneSignal";
import { PWAInstallPrompt } from "@/components/common/PWAInstallPrompt";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useLiteMode } from "@/hooks/useLiteMode";
import { useOnboarding } from "@/hooks/useOnboarding";
import { DevToolsProtection } from "@/components/security/DevToolsProtection";
import { useEffect } from "react";
import { NetworkNotification } from "@/components/notifications/NetworkNotification";
import { useAutoReload } from "@/hooks/useAutoReload";
import { PerformanceMonitor } from "@/components/common/PerformanceMonitor";
import { AccessibilityProvider } from "@/components/common/AccessibilityProvider";
import { usePerformanceOptimization } from "@/hooks/usePerformanceOptimization";
import { NavigationPreloader } from "@/components/common/NavigationPreloader";
import PullToRefresh from "@/components/common/PullToRefresh";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import "@/styles/mobile-fixes.css";
import "@/styles/pull-to-refresh.css";

// Lazy load pages for better performance with error boundaries
const Index = React.lazy(() =>
  import("./pages/Index").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const NotFound = React.lazy(() =>
  import("./pages/NotFound").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const ProductDetails = React.lazy(() =>
  import("./pages/ProductDetails").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Profile = React.lazy(() =>
  import("./pages/Profile").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const SellerProfile = React.lazy(() =>
  import("./components/profiles/SellerProfile").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Messages = React.lazy(() =>
  import("./pages/Messages").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Orders = React.lazy(() =>
  import("./pages/Orders").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Search = React.lazy(() =>
  import("./pages/Search").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const SellerSearch = React.lazy(() =>
  import("./pages/SellerSearch").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Settings = React.lazy(() =>
  import("./pages/Settings").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Sell = React.lazy(() =>
  import("./pages/Sell").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Dashboard = React.lazy(() =>
  import("./pages/Dashboard").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Marketplace = React.lazy(() =>
  import("./pages/Marketplace").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Cart = React.lazy(() =>
  import("./pages/Cart").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Checkout = React.lazy(() =>
  import("./pages/Checkout").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Favorites = React.lazy(() =>
  import("./pages/Favorites").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const AuthPage = React.lazy(() =>
  import("./components/auth/AuthPage").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Admin = React.lazy(() =>
  import("./pages/Admin").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const LearnMore = React.lazy(() =>
  import("./pages/LearnMore").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Notifications = React.lazy(() =>
  import("./pages/Notifications").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const VerificationRequest = React.lazy(() =>
  import("./pages/VerificationRequest").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Wallet = React.lazy(() =>
  import("./pages/Wallet").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Chat = React.lazy(() =>
  import("./pages/Chat").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const TermsOfService = React.lazy(() =>
  import("./pages/TermsOfService").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const PrivacyPolicy = React.lazy(() =>
  import("./pages/PrivacyPolicy").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Suggestions = React.lazy(() =>
  import("./pages/Suggestions").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const LiveFeed = React.lazy(() =>
  import("./pages/LiveFeed").catch(() => ({
    default: () => <div>Error loading page</div>,
  }))
);
const Games = React.lazy(() =>
  import("./pages/Games").catch(() => ({
    default: () => <div>Error loading page</div>,
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
  const { handleRefresh } = usePullToRefresh();

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

      await requestNotificationPermission();
      await initializeOneSignal();
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
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <div className={`pb-24 lg:pb-0 layout-stable ${metrics.isLowEndDevice ? 'low-end-device' : ''}`}>
          <AuthGuard>
            <NavigationPreloader>
              <Suspense fallback={<LoadingSkeleton />}>
                <div className="page-transition student-focus">
                  <Routes>
                <Route path={ROUTES.home} element={<Index />} />
                <Route path={ROUTES.auth} element={<AuthPage />} />
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
                <Route path="/terms-of-service" element={<TermsOfService />} />
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
      </PullToRefresh>
      <BottomNav />
      <MessagePopup />
      <OfflineNotification />
      {/* <AIChatbot /> */}
      <FloatingBackButton />
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
    <BrowserRouter>
      <AccessibilityProvider>
        <ThemeProvider defaultTheme="light">
          <SecurityProvider>
            <QueryClientProvider client={queryClient}>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ProfileProvider>
                  <RealTimeProvider>
                    <AppContent />
                  </RealTimeProvider>
                </ProfileProvider>
              </TooltipProvider>
            </QueryClientProvider>
          </SecurityProvider>
        </ThemeProvider>
      </AccessibilityProvider>
    </BrowserRouter>
  </ErrorBoundary>
);

export default App;
