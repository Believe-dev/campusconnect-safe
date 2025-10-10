/**
 * Utility functions for SEO and social media sharing
 */

/**
 * Converts relative URLs to absolute URLs for social media sharing
 * Social platforms require absolute URLs for images
 */
export const getAbsoluteImageUrl = (imageUrl: string | undefined): string => {
  if (!imageUrl) {
    return 'https://unimarket.com.ng/social-preview.png';
  }

  // If already absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  // If relative URL, make it absolute
  if (imageUrl.startsWith('/')) {
    return `https://unimarket.com.ng${imageUrl}`;
  }

  // If no leading slash, add it
  return `https://unimarket.com.ng/${imageUrl}`;
};

/**
 * Generates SEO-friendly description with proper length
 */
export const generateSEODescription = (
  title: string, 
  description?: string, 
  price?: number, 
  condition?: string
): string => {
  if (description && description.length > 10) {
    // Truncate description to 150 characters for optimal SEO
    const truncated = description.length > 150 
      ? `${description.slice(0, 147)}...` 
      : description;
    return `${truncated} - Available on UniMarket, Nigeria's trusted university marketplace.`;
  }

  // Fallback description if no product description
  const fallback = `${title}${price ? ` for ₦${price.toLocaleString()}` : ''}${condition ? ` - ${condition} condition` : ''}. Buy safely from verified student sellers on UniMarket, Nigeria's #1 university marketplace.`;
  
  return fallback.length > 160 ? `${fallback.slice(0, 157)}...` : fallback;
};

/**
 * Generates SEO-friendly keywords
 */
export const generateSEOKeywords = (
  title: string,
  category: string,
  condition: string,
  campus?: string
): string => {
  const baseKeywords = [
    'unimarket',
    'university marketplace nigeria',
    'student marketplace',
    'buy sell nigeria',
    'verified sellers',
    'secure payments',
    'campus marketplace'
  ];

  const productKeywords = [
    title.toLowerCase(),
    category.toLowerCase(),
    condition.toLowerCase()
  ];

  if (campus) {
    productKeywords.push(campus.toLowerCase());
  }

  return [...productKeywords, ...baseKeywords].join(', ');
};

/**
 * Generates structured data for rich snippets
 */
export const generateProductStructuredData = (product: {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: string[];
  stock_quantity: number;
  seller_id: string;
  seller?: {
    full_name: string;
    rating: number;
    total_reviews: number;
  };
}) => {
  const imageUrl = getAbsoluteImageUrl(product.images?.[0]);
  const productUrl = `https://unimarket.com.ng/product/${product.id}`;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.title,
    "description": generateSEODescription(product.title, product.description, product.price, product.condition),
    "image": imageUrl,
    "url": productUrl,
    "category": product.category,
    "condition": product.condition === 'new' 
      ? 'https://schema.org/NewCondition' 
      : 'https://schema.org/UsedCondition',
    "offers": {
      "@type": "Offer",
      "price": product.price,
      "priceCurrency": "NGN",
      "availability": product.stock_quantity > 0 
        ? "https://schema.org/InStock" 
        : "https://schema.org/OutOfStock",
      "seller": {
        "@type": "Organization",
        "name": product.seller?.full_name || "UniMarket Seller",
        "url": `https://unimarket.com.ng/seller/${product.seller_id}`
      },
      "itemCondition": product.condition === 'new' 
        ? "https://schema.org/NewCondition" 
        : "https://schema.org/UsedCondition"
    },
    "brand": {
      "@type": "Brand",
      "name": "UniMarket"
    },
    ...(product.seller?.rating && product.seller?.total_reviews > 0 && {
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": product.seller.rating,
        "reviewCount": product.seller.total_reviews
      }
    })
  };
};