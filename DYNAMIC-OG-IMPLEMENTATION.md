# Dynamic Open Graph Meta Tags Implementation

## Overview

This implementation provides dynamic Open Graph (OG) meta tags for product pages, ensuring that when product links are shared on social media platforms (WhatsApp, Facebook, Twitter/X, Google), they display the correct product image, title, and description instead of the default UniMarket branding.

## Key Features

✅ **Dynamic Meta Tags**: Product-specific OG tags generated on page load  
✅ **Social Media Compatibility**: Works with WhatsApp, Facebook, Twitter/X, Google  
✅ **Absolute URLs**: All image URLs are converted to absolute URLs for social platforms  
✅ **Fallback Images**: Default UniMarket preview image when product has no image  
✅ **SEO Optimization**: Comprehensive meta tags for better search engine visibility  
✅ **Structured Data**: Rich snippets for Google search results  
✅ **Performance Optimized**: Uses react-helmet-async for efficient meta tag management  

## Implementation Details

### 1. Core Components

#### `ProductSEO` Component (`src/components/common/ProductSEO.tsx`)
- Generates dynamic meta tags for each product
- Uses react-helmet-async for efficient DOM manipulation
- Includes Open Graph, Twitter Card, and structured data

#### `seoUtils` (`src/utils/seoUtils.ts`)
- Utility functions for URL conversion and SEO content generation
- Ensures all image URLs are absolute
- Generates SEO-optimized descriptions and keywords

### 2. Meta Tags Generated

#### Open Graph Tags
```html
<meta property="og:type" content="product" />
<meta property="og:title" content="Product Name - ₦Price | UniMarket" />
<meta property="og:description" content="Product description..." />
<meta property="og:image" content="https://unimarket.com.ng/product-image.jpg" />
<meta property="og:url" content="https://unimarket.com.ng/product/123" />
<meta property="product:price:amount" content="15000" />
<meta property="product:price:currency" content="NGN" />
<meta property="product:availability" content="in stock" />
```

#### Twitter Card Tags
```html
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Product Name - ₦Price | UniMarket" />
<meta name="twitter:description" content="Product description..." />
<meta name="twitter:image" content="https://unimarket.com.ng/product-image.jpg" />
```

#### Structured Data (JSON-LD)
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://unimarket.com.ng/product-image.jpg",
  "offers": {
    "@type": "Offer",
    "price": "15000",
    "priceCurrency": "NGN",
    "availability": "https://schema.org/InStock"
  }
}
```

### 3. URL Handling

#### Absolute URL Conversion
All product images are converted to absolute URLs:
- Relative URLs: `/image.jpg` → `https://unimarket.com.ng/image.jpg`
- Already absolute: `https://example.com/image.jpg` → unchanged
- Missing images: → `https://unimarket.com.ng/social-preview.png`

### 4. Integration Points

#### App.tsx
```tsx
import { HelmetProvider } from 'react-helmet-async';

const App = () => (
  <HelmetProvider>
    {/* App content */}
  </HelmetProvider>
);
```

#### ProductDetails.tsx
```tsx
import { ProductSEO } from '@/components/common/ProductSEO';

const ProductDetails = () => {
  return (
    <div>
      {product && <ProductSEO product={product} />}
      {/* Page content */}
    </div>
  );
};
```

## Testing & Debugging

### Development Debugger
The `SEODebugger` component shows current meta tags in development mode:
- Appears as a floating panel in bottom-right corner
- Only visible when `import.meta.env.DEV` is true
- Real-time updates when meta tags change

### Social Media Testing Tools
1. **Facebook Debugger**: https://developers.facebook.com/tools/debug/
2. **Twitter Card Validator**: https://cards-dev.twitter.com/validator
3. **WhatsApp Preview**: Share link in WhatsApp to test
4. **Google Rich Results**: https://search.google.com/test/rich-results

### Manual Testing
1. Navigate to any product page: `/product/[id]`
2. View page source to verify meta tags
3. Share the URL on social platforms
4. Check that product image, title, and description appear correctly

## Expected Behavior

### ✅ Correct Behavior
- Product links show product image, not UniMarket logo
- Product title appears as link title
- Product description (or generated description) appears as preview text
- Price and availability information included in structured data
- Works on WhatsApp, Facebook, Twitter/X, Google search results

### ❌ Fallback Behavior
- If product has no image: Shows UniMarket social preview image
- If product has no description: Generates description from title + price + condition
- If image URL is invalid: Falls back to default preview image

## Performance Considerations

### Optimizations
- Uses `react-helmet-async` for efficient meta tag updates
- Minimal re-renders with proper dependency arrays
- Absolute URL conversion cached per component instance
- Structured data generated once per product load

### Bundle Impact
- `react-helmet-async`: ~15KB gzipped
- Utility functions: ~2KB
- Total overhead: ~17KB for comprehensive social sharing support

## Maintenance

### Adding New Meta Tags
1. Update `ProductSEO` component with new meta tags
2. Add utility functions to `seoUtils.ts` if needed
3. Test with social media debugging tools

### Updating Structured Data
1. Modify `generateProductStructuredData` in `seoUtils.ts`
2. Test with Google Rich Results testing tool
3. Verify JSON-LD syntax is valid

### Image URL Changes
1. Update `getAbsoluteImageUrl` function
2. Ensure all image URLs remain absolute
3. Test fallback behavior with missing images

## Troubleshooting

### Common Issues

#### Meta Tags Not Updating
- Ensure `HelmetProvider` wraps the app
- Check that `ProductSEO` component receives valid product data
- Verify no duplicate meta tags in `index.html`

#### Images Not Showing on Social Media
- Confirm image URLs are absolute (start with `https://`)
- Check image accessibility (not behind authentication)
- Verify image dimensions (recommended: 1200x630px)
- Test image URL directly in browser

#### Social Platforms Not Updating
- Social platforms cache previews for 24-48 hours
- Use platform-specific debugging tools to force refresh
- Facebook: Use Facebook Debugger "Scrape Again" button
- Twitter: Use Twitter Card Validator

### Debug Steps
1. Check browser dev tools for meta tags in `<head>`
2. Use SEO debugger component in development
3. Test with social media debugging tools
4. Verify image URLs are accessible
5. Check structured data with Google's testing tool

## Future Enhancements

### Potential Improvements
- Server-side rendering for better SEO crawling
- Image optimization for social media dimensions
- A/B testing for different preview formats
- Analytics tracking for social media shares
- Dynamic image generation for products without images

### Advanced Features
- Category-specific meta tags
- Seller-specific social previews
- Localized content for different regions
- Video previews for products with videos
- Real-time inventory status in previews