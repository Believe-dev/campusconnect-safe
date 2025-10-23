# Dynamic Open Graph Implementation for UniMarket

## Overview
This implementation adds dynamic Open Graph (OG) meta tags for product pages that work with all major social media platforms including WhatsApp, Telegram, Twitter, Facebook, and Snapchat.

## How It Works

### 1. Edge Function for Crawlers
- **File**: `api/og/[id].ts`
- **Purpose**: Serves HTML with proper OG meta tags to social media crawlers
- **Detection**: Uses User-Agent detection to identify bots/crawlers
- **Fallback**: Redirects regular users to the React app

### 2. Vercel Configuration
- **File**: `vercel.json`
- **Purpose**: Routes crawler requests to the Edge Function
- **Regex**: Detects bots using User-Agent patterns
- **Caching**: Implements 1-hour cache for better performance

### 3. Share Utilities
- **File**: `src/utils/shareUtils.ts`
- **Purpose**: Provides optimized sharing functions
- **Features**: Web Share API with clipboard fallback

## Files Modified/Created

### New Files:
1. `api/og/[id].ts` - Edge Function for OG tags
2. `src/utils/shareUtils.ts` - Share utilities
3. `src/components/debug/OGTestComponent.tsx` - Testing component

### Modified Files:
1. `vercel.json` - Added crawler routing
2. `src/pages/ProductDetails.tsx` - Updated share function
3. `src/utils/seoUtils.ts` - Enhanced image URL handling
4. `.env` - Added Edge Function environment variables

## Environment Variables Required

Add these to your Vercel project settings:

```bash
SUPABASE_URL=https://ssqplkrxtrvfptrsnpow.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg
```

## Deployment Steps

### 1. Deploy to Vercel
```bash
# Commit all changes
git add .
git commit -m "Add dynamic OG tags implementation"
git push

# Deploy will happen automatically if connected to Vercel
```

### 2. Set Environment Variables
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add the SUPABASE_URL and SUPABASE_ANON_KEY variables
3. Redeploy the project

### 3. Test the Implementation

#### Using the Debug Component:
1. Add the OGTestComponent to any page temporarily
2. Enter a valid product ID
3. Use the testing tools to verify OG tags

#### Manual Testing:
1. Share a product link on WhatsApp/Telegram
2. Check if the preview shows:
   - Product image
   - Product title with price
   - Product description
   - UniMarket branding

#### Testing URLs:
- **OpenGraph.xyz**: `https://www.opengraph.xyz/url/https%3A//unimarket.com.ng/product/YOUR_PRODUCT_ID`
- **Facebook Debugger**: `https://developers.facebook.com/tools/debug/`
- **Twitter Validator**: `https://cards-dev.twitter.com/validator`

## Technical Details

### User-Agent Detection
The system detects crawlers using this regex pattern:
```regex
(?i).*(bot|crawler|spider|scraper|whatsapp|telegram|twitter|facebook|linkedin|pinterest|slack|discord).*
```

### Image Requirements
- **Minimum Size**: 1200×630 pixels (recommended for all platforms)
- **Format**: JPG, PNG, or WebP
- **URL**: Must be absolute HTTPS URL
- **Fallback**: Uses `/social-preview.png` if no product image

### Meta Tags Generated
- `og:type` - "product"
- `og:title` - Product title with price
- `og:description` - Product description (truncated to 150 chars)
- `og:image` - Product image URL
- `og:url` - Canonical product URL
- `twitter:card` - "summary_large_image"
- Product-specific tags (price, availability, condition)

## Performance Optimizations

### Caching
- Edge Function responses cached for 1 hour
- Reduces Supabase API calls
- Faster loading for repeated shares

### Error Handling
- Graceful fallback to default OG tags
- Automatic redirect to React app on errors
- Proper HTTP status codes

### Memory Efficiency
- Minimal data fetching (only required fields)
- No heavy processing in Edge Function
- Quick response times

## Troubleshooting

### Common Issues:

1. **OG tags not showing**
   - Check if environment variables are set in Vercel
   - Verify product ID exists in database
   - Test with OpenGraph.xyz

2. **Images not loading**
   - Ensure images are publicly accessible
   - Check if URLs are absolute (HTTPS)
   - Verify Supabase storage permissions

3. **Crawler not detected**
   - Check User-Agent regex in vercel.json
   - Test with different social platforms
   - Verify Vercel deployment

### Debug Steps:
1. Check Vercel Function logs
2. Test Edge Function directly: `/api/og/PRODUCT_ID`
3. Use browser dev tools to inspect meta tags
4. Validate with social media debugging tools

## Browser Compatibility

### Supported Platforms:
- ✅ WhatsApp (iOS/Android)
- ✅ Telegram (iOS/Android/Web)
- ✅ Twitter/X (iOS/Android/Web)
- ✅ Facebook (iOS/Android/Web)
- ✅ LinkedIn (iOS/Android/Web)
- ✅ Snapchat (iOS/Android)
- ✅ Discord (iOS/Android/Web)
- ✅ Slack (iOS/Android/Web)

### Web Share API Support:
- ✅ Mobile browsers (iOS Safari, Chrome Android)
- ✅ Desktop Chrome/Edge (with flag)
- ❌ Desktop Safari/Firefox (clipboard fallback)

## Security Considerations

### Data Protection:
- Only public product data exposed
- No sensitive user information in OG tags
- Proper input sanitization
- Rate limiting via Vercel

### Access Control:
- Uses public Supabase API key (safe for client-side)
- No authentication required for product viewing
- Respects product visibility settings

## Future Enhancements

### Possible Improvements:
1. **Dynamic Images**: Generate custom OG images with product info
2. **A/B Testing**: Test different OG tag formats
3. **Analytics**: Track share performance
4. **Localization**: Multi-language OG tags
5. **Rich Snippets**: Enhanced structured data

### Performance Monitoring:
- Monitor Edge Function response times
- Track social media click-through rates
- Analyze share conversion metrics
- Monitor Supabase API usage

## Support

For issues or questions:
1. Check Vercel Function logs
2. Test with debugging tools
3. Verify environment variables
4. Contact development team

---

**Note**: This implementation is production-ready and optimized for Vercel hosting. All social media platforms should now show proper previews when UniMarket product links are shared.