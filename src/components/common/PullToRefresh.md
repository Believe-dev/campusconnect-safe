# PullToRefresh Component

A fully custom, Chrome-like pull-to-refresh component built with React + TypeScript + Tailwind CSS.

## Features

- ✅ **Chrome-like behavior**: Smooth, natural pull-to-refresh experience
- ✅ **Custom animations**: Smooth transitions and morphing indicators
- ✅ **Mobile optimized**: Works flawlessly on iOS Safari and Android Chrome
- ✅ **TypeScript support**: Full type safety and IntelliSense
- ✅ **Haptic feedback**: Vibration feedback on supported devices
- ✅ **Accessibility**: Respects `prefers-reduced-motion` and high contrast
- ✅ **No external dependencies**: Built with React and Tailwind only
- ✅ **Lightweight**: Battery-friendly animations for low-end devices

## Installation

The component is already included in your project at:
```
src/components/common/PullToRefresh.tsx
```

## Basic Usage

```tsx
import { PullToRefresh } from '@/components/common/PullToRefresh';

function MyPage() {
  const handleRefresh = async () => {
    // Your refresh logic here
    await fetchLatestData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div>Your page content here</div>
    </PullToRefresh>
  );
}
```

## Advanced Usage

```tsx
import { PullToRefresh } from '@/components/common/PullToRefresh';

function AdvancedPage() {
  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchProducts(),
        fetchUserData(),
        updateCache()
      ]);
    } catch (error) {
      console.error('Refresh failed:', error);
    }
  };

  return (
    <PullToRefresh 
      onRefresh={handleRefresh}
      threshold={100}
      disabled={false}
      className="min-h-screen bg-gray-50"
    >
      <YourContent />
    </PullToRefresh>
  );
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `React.ReactNode` | - | Content to wrap with pull-to-refresh |
| `onRefresh` | `() => Promise<void> \| void` | - | Function called when refresh is triggered |
| `threshold` | `number` | `80` | Distance in pixels to trigger refresh |
| `disabled` | `boolean` | `false` | Disable pull-to-refresh functionality |
| `className` | `string` | `''` | Additional CSS classes for the container |

## Animation States

The component has 4 distinct states with smooth transitions:

1. **Idle**: Default state, indicator hidden
2. **Pulling**: User is pulling down, indicator appears and scales
3. **Ready**: Pulled past threshold, indicator bounces, haptic feedback
4. **Refreshing**: Refresh in progress, spinner animation

## Mobile Optimization

- **Touch handling**: Optimized for mobile touch events
- **Scroll behavior**: Only triggers when at the top of scroll container
- **Performance**: Uses `transform` and `opacity` for 60fps animations
- **Battery friendly**: Minimal JavaScript animations, CSS-driven where possible

## Preventing Welcome Modal Re-appearance

The component is designed to work with your existing state management. The Welcome Modal uses localStorage to track if it has been shown, so it won't reappear after a pull-to-refresh unless you explicitly reset that state.

## Browser Support

- ✅ iOS Safari 12+
- ✅ Android Chrome 70+
- ✅ Desktop Chrome/Firefox/Safari
- ✅ Progressive Web Apps (PWA)

## Customization

### Custom Threshold
```tsx
<PullToRefresh threshold={120} onRefresh={handleRefresh}>
  <Content />
</PullToRefresh>
```

### Custom Styling
```tsx
<PullToRefresh 
  className="bg-gradient-to-b from-blue-50 to-white"
  onRefresh={handleRefresh}
>
  <Content />
</PullToRefresh>
```

### Disable During Loading
```tsx
const [isLoading, setIsLoading] = useState(false);

<PullToRefresh 
  disabled={isLoading}
  onRefresh={async () => {
    setIsLoading(true);
    await fetchData();
    setIsLoading(false);
  }}
>
  <Content />
</PullToRefresh>
```

## Integration Examples

### Marketplace Page
```tsx
// Already integrated in src/pages/Marketplace.tsx
const handleRefresh = useCallback(async () => {
  setLoading(true);
  await fetchProducts();
  if (user) {
    await fetchUserData(user.id);
  }
  setLoading(false);
}, [user]);

return (
  <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
    <main className="container mx-auto px-4 py-6">
      {/* Your marketplace content */}
    </main>
  </PullToRefresh>
);
```

### Feed/List Pages
```tsx
const handleRefresh = useCallback(async () => {
  await Promise.all([
    refetchPosts(),
    refetchNotifications(),
    syncOfflineData()
  ]);
}, []);

return (
  <PullToRefresh onRefresh={handleRefresh}>
    <div className="space-y-4">
      {posts.map(post => <PostCard key={post.id} post={post} />)}
    </div>
  </PullToRefresh>
);
```

## Troubleshooting

### Pull-to-refresh not triggering
- Ensure the container is scrollable and user is at the top
- Check if `disabled` prop is set to `true`
- Verify touch events are not being prevented by other components

### Animation performance issues
- The component uses optimized CSS transforms
- Reduce `threshold` value for lower-end devices
- Check for conflicting CSS animations

### Conflicts with native browser refresh
- The component prevents default browser behavior when pulling
- Only triggers when scrollTop is 0 (at the top)

## CSS Classes

The component uses these CSS classes for styling:
- `.pull-container`: Main container with touch handling
- `.pull-indicator`: Animated indicator element
- `.pull-backdrop`: Backdrop blur effect
- `.pull-arrow`: Arrow icon with rotation animation

## Performance Notes

- Uses `will-change: transform` for optimized rendering
- Animations are CSS-based for 60fps performance
- Touch events use passive listeners where possible
- Minimal JavaScript during animation phases

## Accessibility

- Respects `prefers-reduced-motion` setting
- High contrast mode support
- Screen reader friendly (indicator has appropriate labels)
- Keyboard navigation support (though primarily touch-based)