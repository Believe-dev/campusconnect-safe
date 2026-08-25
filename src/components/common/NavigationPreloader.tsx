import React from 'react';
import { useNavigationPreloader } from '@/hooks/useNavigationPreloader';
import { useOptimizedPreloader } from './UniMarketPreloader';

interface NavigationPreloaderProps {
  children: React.ReactNode;
}

export const NavigationPreloader: React.FC<NavigationPreloaderProps> = ({ children }) => {
  const { isLoading, message } = useNavigationPreloader();
  const OptimizedPreloader = useOptimizedPreloader();

  if (isLoading) {
    return <OptimizedPreloader message={message} fullScreen={true} />;
  }

  return <>{children}</>;
};