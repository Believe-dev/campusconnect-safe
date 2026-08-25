import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

interface NavigationOptions {
  showPreloader?: boolean;
  preloaderMessage?: string;
  replace?: boolean;
}

export const useUniMarketNavigation = () => {
  const navigate = useNavigate();

  const navigateTo = useCallback((
    path: string, 
    options: NavigationOptions = {}
  ) => {
    const { 
      showPreloader = true, 
      preloaderMessage,
      replace = false 
    } = options;

    // The preloader will automatically show due to route change
    // This hook provides a consistent interface for navigation
    navigate(path, { replace });
  }, [navigate]);

  // Predefined navigation functions for common routes
  const goToHome = useCallback(() => navigateTo('/'), [navigateTo]);
  const goToMarketplace = useCallback(() => navigateTo('/marketplace'), [navigateTo]);
  const goToProfile = useCallback(() => navigateTo('/profile'), [navigateTo]);
  const goToMessages = useCallback(() => navigateTo('/messages'), [navigateTo]);
  const goToOrders = useCallback(() => navigateTo('/orders'), [navigateTo]);
  const goToSearch = useCallback(() => navigateTo('/search'), [navigateTo]);
  const goToSettings = useCallback(() => navigateTo('/settings'), [navigateTo]);
  const goToSell = useCallback(() => navigateTo('/sell'), [navigateTo]);
  const goToDashboard = useCallback(() => navigateTo('/dashboard'), [navigateTo]);
  const goToFavorites = useCallback(() => navigateTo('/favorites'), [navigateTo]);
  const goToCart = useCallback(() => navigateTo('/cart'), [navigateTo]);
  const goToWallet = useCallback(() => navigateTo('/wallet'), [navigateTo]);
  const goToNotifications = useCallback(() => navigateTo('/notifications'), [navigateTo]);
  const goToGames = useCallback(() => navigateTo('/games'), [navigateTo]);
  const goToLiveFeed = useCallback(() => navigateTo('/live-feed'), [navigateTo]);

  // Dynamic route navigation
  const goToProduct = useCallback((productId: string) => 
    navigateTo(`/product/${productId}`), [navigateTo]);
  
  const goToSeller = useCallback((sellerId: string) => 
    navigateTo(`/seller/${sellerId}`), [navigateTo]);
  
  const goToChat = useCallback((conversationId: string) => 
    navigateTo(`/chat/${conversationId}`), [navigateTo]);

  return {
    navigateTo,
    goToHome,
    goToMarketplace,
    goToProfile,
    goToMessages,
    goToOrders,
    goToSearch,
    goToSettings,
    goToSell,
    goToDashboard,
    goToFavorites,
    goToCart,
    goToWallet,
    goToNotifications,
    goToGames,
    goToLiveFeed,
    goToProduct,
    goToSeller,
    goToChat,
  };
};