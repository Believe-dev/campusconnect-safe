import React, { Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useScrollToTop } from "@/hooks/useScrollToTop";
import { useBackgroundSync } from "@/hooks/useBackgroundSync";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { LoadingSkeleton } from "@/components/common/LoadingState";
import { ROUTES } from "@/lib/constants";
import BottomNav from "@/components/layout/BottomNav";
import ProtectedSellerRoute from "./components/auth/ProtectedSellerRoute";
import { ProfileProvider } from "@/contexts/ProfileContext";

// Lazy load pages for better performance
const Index = React.lazy(() => import('./pages/Index'));
const NotFound = React.lazy(() => import('./pages/NotFound'));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails'));
const Profile = React.lazy(() => import('./pages/Profile'));
const SellerProfile = React.lazy(() => import('./components/profiles/SellerProfile'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Orders = React.lazy(() => import('./pages/Orders'));
const Search = React.lazy(() => import('./pages/Search'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Sell = React.lazy(() => import('./pages/Sell'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Marketplace = React.lazy(() => import('./pages/Marketplace'));
const Cart = React.lazy(() => import('./pages/Cart'));
const Checkout = React.lazy(() => import('./pages/Checkout'));
const Favorites = React.lazy(() => import('./pages/Favorites'));
const AuthPage = React.lazy(() => import('./components/auth/AuthPage'));
const Admin = React.lazy(() => import('./pages/Admin'));
const LearnMore = React.lazy(() => import('./pages/LearnMore'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const VerificationRequest = React.lazy(() => import('./pages/VerificationRequest'));
const Wallet = React.lazy(() => import('./pages/Wallet'));

// Optimized query client for slow connections
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15 * 60 * 1000, // 15 minutes - keep data fresh longer
      cacheTime: 60 * 60 * 1000, // 1 hour - cache longer for slow connections
      retry: (failureCount, error: any) => {
        if (error?.status >= 400 && error?.status < 500) return false;
        return failureCount < 2; // Fewer retries for slow connections
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: 'always',
      refetchOnMount: false, // Don't refetch on mount if data exists
      networkMode: 'offlineFirst', // Work offline first
      // Background refetch with lower priority
      refetchInterval: 30 * 60 * 1000, // 30 minutes background refresh
      refetchIntervalInBackground: true,
    },
    mutations: {
      retry: 1,
      networkMode: 'offlineFirst',
    },
  },
});

const AppContent = () => {
  useScrollToTop();
  useBackgroundSync();
  
  return (
    <div className="pb-16 md:pb-0 layout-stable">
      <Suspense fallback={<LoadingSkeleton />}>
        <div className="page-transition">
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
          <Route path={ROUTES.orders} element={<Orders />} />
          <Route path="/search" element={<Search />} />
          <Route path="/settings" element={<Settings />} />
          <Route path={ROUTES.sell} element={
            <ProtectedSellerRoute>
              <Sell />
            </ProtectedSellerRoute>
          } />
          <Route path={ROUTES.dashboard} element={
            <ProtectedSellerRoute>
              <Dashboard />
            </ProtectedSellerRoute>
          } />
          <Route path="/favorites" element={<Favorites />} />
          <Route path={ROUTES.cart} element={<Cart />} />
          <Route path={ROUTES.checkout} element={<Checkout />} />
          <Route path={ROUTES.admin} element={<Admin />} />
          <Route path="/verification-request" element={<VerificationRequest />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </Suspense>
      <BottomNav />
    </div>
  );
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ProfileProvider>
            <AppContent />
          </ProfileProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;