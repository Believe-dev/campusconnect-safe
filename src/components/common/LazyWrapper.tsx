import React, { Suspense, lazy } from 'react';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
  </div>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({ 
  children, 
  fallback = <DefaultFallback /> 
}) => {
  return (
    <Suspense fallback={fallback}>
      {children}
    </Suspense>
  );
};

// Helper function to create lazy components
export const createLazyComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
) => {
  return lazy(importFn);
};

// Pre-built lazy components for common heavy components
export const LazyChat = createLazyComponent(() => import('@/pages/Chat'));
export const LazyMarketplace = createLazyComponent(() => import('@/pages/Marketplace'));
export const LazyWallet = createLazyComponent(() => import('@/pages/Wallet'));
export const LazyAdmin = createLazyComponent(() => import('@/pages/Admin'));