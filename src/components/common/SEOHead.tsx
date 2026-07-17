import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'product';
  price?: string;
  currency?: string;
  availability?: 'in stock' | 'out of stock';
  category?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

export const SEOHead = ({
  title = 'UniMarket - Nigeria\'s Trusted University Marketplace',
  description = 'Buy and sell safely with fellow Nigerian university students on UniMarket. Verified sellers, secure payments, escrow protection.',
  keywords = 'unimarket, university marketplace Nigeria, student marketplace, buy sell textbooks Nigeria',
  image = 'https://unimarket.com.ng/logo.png',
  url = 'https://unimarket.com.ng',
  type = 'website',
  price,
  currency = 'NGN',
  availability,
  category,
  author,
  publishedTime,
  modifiedTime
}: SEOHeadProps) => {
  useEffect(() => {
    // Update document title
    document.title = title;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property?: boolean) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };

    // Basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    updateMetaTag('og:site_name', 'UniMarket', true);
    updateMetaTag('og:locale', 'en_NG', true);

    // Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    updateMetaTag('twitter:site', '@unimarket_ng');

    // Product-specific meta tags
    if (type === 'product' && price) {
      updateMetaTag('product:price:amount', price, true);
      updateMetaTag('product:price:currency', currency, true);
      
      if (availability) {
        updateMetaTag('product:availability', availability, true);
      }
      
      if (category) {
        updateMetaTag('product:category', category, true);
      }
    }

    // Article-specific meta tags
    if (type === 'article') {
      if (author) {
        updateMetaTag('article:author', author, true);
      }
      if (publishedTime) {
        updateMetaTag('article:published_time', publishedTime, true);
      }
      if (modifiedTime) {
        updateMetaTag('article:modified_time', modifiedTime, true);
      }
    }

    // Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // JSON-LD structured data
    const updateStructuredData = () => {
      let script = document.querySelector('script[type="application/ld+json"]#dynamic-seo');
      if (!script) {
        script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.setAttribute('id', 'dynamic-seo');
        document.head.appendChild(script);
      }

      let structuredData: any = {
        '@context': 'https://schema.org',
        '@type': type === 'product' ? 'Product' : 'WebPage',
        name: title,
        description: description,
        url: url,
        image: image
      };

      if (type === 'product' && price) {
        structuredData = {
          ...structuredData,
          '@type': 'Product',
          offers: {
            '@type': 'Offer',
            price: price,
            priceCurrency: currency,
            availability: availability === 'in stock' 
              ? 'https://schema.org/InStock' 
              : 'https://schema.org/OutOfStock',
            seller: {
              '@type': 'Organization',
              name: 'UniMarket'
            }
          }
        };

        if (category) {
          structuredData.category = category;
        }
      }

      script.textContent = JSON.stringify(structuredData);
    };

    updateStructuredData();

    // Cleanup function
    return () => {
      // Remove dynamic structured data on unmount
      const script = document.querySelector('script[type="application/ld+json"]#dynamic-seo');
      if (script) {
        script.remove();
      }
    };
  }, [title, description, keywords, image, url, type, price, currency, availability, category, author, publishedTime, modifiedTime]);

  return null;
};