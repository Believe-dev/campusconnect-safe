# UniMarket Preloader System

## Overview

The UniMarket preloader system provides a beautiful, branded loading experience optimized for low-end devices. It automatically shows during navigation and can be used throughout the app for consistent loading states.

## Features

- **Beautiful UniMarket Branding**: Custom logo animation with the UniMarket name
- **Low-End Device Optimization**: Automatically detects device capabilities and shows appropriate preloader
- **Automatic Navigation Loading**: Shows preloader during route transitions
- **Route-Specific Messages**: Different loading messages for different pages
- **Performance Optimized**: Minimal animations on low-end devices, respects reduced motion preferences
- **Consistent API**: Easy to use throughout the app

## Components

### 1. UniMarketPreloader
Main preloader component with full branding and animations.

```tsx
import { UniMarketPreloader } from '@/components/common/UniMarketPreloader';

<UniMarketPreloader 
  message="Loading UniMarket..." 
  size="md" 
  fullScreen={true} 
/>
```

### 2. UniMarketPreloaderLite
Lightweight version for low-end devices.

```tsx
import { UniMarketPreloaderLite } from '@/components/common/UniMarketPreloader';

<UniMarketPreloaderLite 
  message="Loading..." 
  fullScreen={true} 
/>
```

### 3. useOptimizedPreloader Hook
Automatically chooses the right preloader based on device capabilities.

```tsx
import { useOptimizedPreloader } from '@/components/common/UniMarketPreloader';

const OptimizedPreloader = useOptimizedPreloader();
return <OptimizedPreloader message="Loading..." />;
```

## Navigation System

### useUniMarketNavigation Hook
Provides consistent navigation with automatic preloader integration.

```tsx
import { useUniMarketNavigation } from '@/hooks/useUniMarketNavigation';

const { 
  goToHome, 
  goToMarketplace, 
  goToProfile,
  goToProduct,
  navigateTo 
} = useUniMarketNavigation();

// Predefined navigation
const handleGoToMarketplace = () => goToMarketplace();

// Dynamic navigation
const handleGoToProduct = (id: string) => goToProduct(id);

// Custom navigation
const handleCustomNavigation = () => navigateTo('/custom-route');
```

### Available Navigation Functions

- `goToHome()` - Navigate to home page
- `goToMarketplace()` - Navigate to marketplace
- `goToProfile()` - Navigate to profile
- `goToMessages()` - Navigate to messages
- `goToOrders()` - Navigate to orders
- `goToSearch()` - Navigate to search
- `goToSettings()` - Navigate to settings
- `goToSell()` - Navigate to sell page
- `goToDashboard()` - Navigate to dashboard
- `goToFavorites()` - Navigate to favorites
- `goToCart()` - Navigate to cart
- `goToWallet()` - Navigate to wallet
- `goToNotifications()` - Navigate to notifications
- `goToGames()` - Navigate to games
- `goToLiveFeed()` - Navigate to live feed
- `goToProduct(id: string)` - Navigate to specific product
- `goToSeller(id: string)` - Navigate to specific seller
- `goToChat(id: string)` - Navigate to specific chat

## Automatic Features

### Route-Specific Messages
The system automatically shows appropriate loading messages:

- `/marketplace` → "Loading Marketplace..."
- `/profile` → "Loading Profile..."
- `/product/123` → "Loading Product..."
- `/messages` → "Loading Messages..."
- And more...

### Device Optimization
The system automatically detects:

- **Device Memory**: Uses lite version if < 2GB RAM
- **CPU Cores**: Uses lite version if < 4 cores
- **Network Speed**: Uses lite version on slow connections
- **Reduced Motion**: Disables animations if user prefers reduced motion

### Performance Optimizations

#### Low-End Device Optimizations
- Simplified animations
- Reduced animation duration
- No complex gradients
- Minimal DOM manipulation

#### CSS Optimizations
- Hardware acceleration with `transform: translateZ(0)`
- Efficient keyframe animations
- Conditional animation disabling
- Memory-efficient rendering

## Usage Examples

### 1. Basic Navigation Button
```tsx
import { useUniMarketNavigation } from '@/hooks/useUniMarketNavigation';

const NavigationButton = () => {
  const { goToMarketplace } = useUniMarketNavigation();
  
  return (
    <button onClick={goToMarketplace}>
      Go to Marketplace
    </button>
  );
};
```

### 2. Custom Loading State
```tsx
import { useOptimizedPreloader } from '@/components/common/UniMarketPreloader';

const MyComponent = () => {
  const [loading, setLoading] = useState(true);
  const OptimizedPreloader = useOptimizedPreloader();
  
  if (loading) {
    return <OptimizedPreloader message="Loading data..." fullScreen={false} />;
  }
  
  return <div>Content loaded!</div>;
};
```

### 3. Manual Preloader Control
```tsx
import { useNavigationPreloader } from '@/hooks/useNavigationPreloader';

const MyComponent = () => {
  const { showPreloader, hidePreloader } = useNavigationPreloader();
  
  const handleAsyncAction = async () => {
    showPreloader("Processing...");
    await someAsyncOperation();
    hidePreloader();
  };
  
  return <button onClick={handleAsyncAction}>Process</button>;
};
```

## CSS Classes

### Animation Classes
- `.unimarket-spinner` - Optimized spin animation
- `.unimarket-bounce` - Optimized bounce animation
- `.unimarket-pulse` - Optimized pulse animation
- `.unimarket-preloader` - Container optimizations

### Performance Classes
- `.low-end-device` - Applied automatically on low-end devices
- `.reduce-motion` - Applied when user prefers reduced motion

## Browser Support

- **Modern Browsers**: Full feature set with all animations
- **Older Browsers**: Graceful degradation with simplified animations
- **Low-End Devices**: Automatic optimization for performance
- **Reduced Motion**: Respects user accessibility preferences

## Best Practices

1. **Use Navigation Hook**: Always use `useUniMarketNavigation` for consistent experience
2. **Let System Decide**: Use `useOptimizedPreloader` to automatically choose the right preloader
3. **Meaningful Messages**: Provide context-specific loading messages
4. **Respect Performance**: The system automatically optimizes for device capabilities
5. **Test on Low-End**: Always test on slower devices to ensure good performance

## Integration

The preloader system is automatically integrated into:

- **Route Navigation**: Shows during page transitions
- **Loading States**: Used in `LoadingSkeleton` component
- **Bottom Navigation**: Integrated into navigation buttons
- **Suspense Fallbacks**: Used as fallback for lazy-loaded components

## Customization

### Custom Messages
```tsx
const { navigateTo } = useUniMarketNavigation();

// Custom navigation with specific message
navigateTo('/custom-route', { 
  preloaderMessage: 'Loading custom content...' 
});
```

### Custom Styling
The preloader respects the app's design system and automatically adapts to:
- Light/Dark themes
- Brand colors (Nigerian Green & Academic Gold)
- Mobile/Desktop layouts
- Accessibility preferences

## Performance Metrics

The system is optimized for:
- **Load Time**: < 300ms preloader display
- **Memory Usage**: Minimal DOM manipulation
- **CPU Usage**: Efficient animations
- **Battery Life**: Reduced animations on mobile
- **Network**: Works on slow connections

This preloader system ensures a consistent, beautiful, and performant loading experience across all devices while maintaining the UniMarket brand identity.