# Google SEO Setup for UniMarket

## What Was Added

✅ **Google-Friendly Product Pages**
- Google crawlers get full HTML content (not redirects)
- Structured data (JSON-LD) for rich snippets
- Proper meta tags and canonical URLs

✅ **Dynamic Sitemap** (`/api/sitemap`)
- Auto-generates from active products
- Updates hourly with new products
- Includes all important pages

✅ **Enhanced robots.txt**
- Allows Google to crawl product pages
- Points to dynamic sitemap
- Blocks private areas

## How It Works

1. **Google visits product page** → `/product/123`
2. **Detects Googlebot** → Routes to `/api/og?id=123`
3. **Serves full content** → HTML with product details
4. **Includes structured data** → For rich snippets
5. **Google indexes page** → Shows in search results

## Deploy & Test

```bash
git add .
git commit -m "Add Google SEO indexing"
git push
```

## Verify Setup

1. **Check sitemap**: `https://unimarket.com.ng/api/sitemap`
2. **Test product page**: `https://unimarket.com.ng/product/YOUR_ID`
3. **Google Search Console**: Submit sitemap
4. **Rich Results Test**: Test structured data

## Submit to Google

1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `https://unimarket.com.ng`
3. Submit sitemap: `https://unimarket.com.ng/api/sitemap`
4. Request indexing for key pages

## Expected Results

- Products appear in Google search
- Rich snippets with price/availability
- Better search rankings
- More organic traffic

Products will start appearing in Google within 1-7 days.