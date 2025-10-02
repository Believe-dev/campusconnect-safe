import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface NavigationPreloaderState {
  isLoading: boolean;
  message: string;
}

export const useNavigationPreloader = () => {
  const [state, setState] = useState<NavigationPreloaderState>({
    isLoading: false,
    message: 'Loading UniMarket...'
  });
  
  const location = useLocation();

  // Route-specific loading messages
  const getLoadingMessage = (pathname: string): string => {
    const routeMessages: Record<string, string> = {
      '/': 'Loading Home...',
      '/marketplace': 'Loading Marketplace...',
      '/profile': 'Loading Profile...',
      '/messages': 'Loading Messages...',
      '/orders': 'Loading Orders...',
      '/search': 'Loading Search...',
      '/sellers': 'Loading Sellers...',
      '/settings': 'Loading Settings...',
      '/sell': 'Loading Seller Dashboard...',
      '/dashboard': 'Loading Dashboard...',
      '/favorites': 'Loading Favorites...',
      '/cart': 'Loading Cart...',
      '/checkout': 'Loading Checkout...',
      '/admin': 'Loading Admin Panel...',
      '/wallet': 'Loading Wallet...',
      '/notifications': 'Loading Notifications...',
      '/live-feed': 'Loading Live Feed...',
      '/games': 'Loading Games...',
      '/suggestions': 'Loading Suggestions...',
      '/auth': 'Loading Authentication...',
    };

    // Handle dynamic routes
    if (pathname.startsWith('/product/')) return 'Loading Product...';
    if (pathname.startsWith('/seller/')) return 'Loading Seller Profile...';
    if (pathname.startsWith('/chat/')) return 'Loading Chat...';
    
    return routeMessages[pathname] || 'Loading UniMarket...';
  };

  useEffect(() => {
    // Show preloader when route changes
    setState({
      isLoading: true,
      message: getLoadingMessage(location.pathname)
    });

    // Minimum loading time for smooth UX (optimized for low-end devices)
    const minLoadTime = 300; // Reduced from typical 500ms for better performance
    
    const timer = setTimeout(() => {
      setState(prev => ({ ...prev, isLoading: false }));
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Manual control for programmatic navigation
  const showPreloader = (message?: string) => {
    setState({
      isLoading: true,
      message: message || 'Loading UniMarket...'
    });
  };

  const hidePreloader = () => {
    setState(prev => ({ ...prev, isLoading: false }));
  };

  return {
    ...state,
    showPreloader,
    hidePreloader
  };
};