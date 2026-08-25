import { Helmet } from 'react-helmet-async';
import { 
  getAbsoluteImageUrl, 
  generateSEODescription, 
  generateSEOKeywords, 
  generateProductStructuredData 
} from '@/utils/seoUtils';

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  campus?: string;
  condition: string;
  images?: string[];
  seller_id: string;
  stock_quantity: number;
  created_at: string;
  seller?: {
    full_name: string;
    avatar_url?: string;
    is_verified: boolean;
    rating: number;
    total_reviews: number;
    campus?: string;
  };
}

interface ProductSEOProps {
  product: Product;
}

export const ProductSEO = ({ product }: ProductSEOProps) => {
  // Generate SEO-optimized content using utility functions
  const title = `${product.title} - ₦${product.price.toLocaleString()} | UniMarket`;
  const description = generateSEODescription(product.title, product.description, product.price, product.condition);
  const imageUrl = getAbsoluteImageUrl(product.images?.[0]);
  const productUrl = `https://unimarket.com.ng/product/${product.id}`;
  const keywords = generateSEOKeywords(product.title, product.category, product.condition, product.seller?.campus);
  const structuredData = generateProductStructuredData(product);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={productUrl} />

      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={product.title} />
      <meta property="og:url" content={productUrl} />
      <meta property="og:site_name" content="UniMarket" />
      <meta property="og:locale" content="en_NG" />

      {/* Product-specific Open Graph Tags */}
      <meta property="product:price:amount" content={product.price.toString()} />
      <meta property="product:price:currency" content="NGN" />
      <meta property="product:availability" content={product.stock_quantity > 0 ? "in stock" : "out of stock"} />
      <meta property="product:condition" content={product.condition} />
      <meta property="product:category" content={product.category} />
      <meta property="product:retailer_item_id" content={product.id} />

      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      <meta name="twitter:image:alt" content={product.title} />
      <meta name="twitter:site" content="@unimarket_ng" />
      <meta name="twitter:creator" content="@unimarket_ng" />

      {/* WhatsApp/Telegram Preview Tags */}
      <meta property="og:image:secure_url" content={imageUrl} />
      <meta name="thumbnail" content={imageUrl} />

      {/* Additional Meta Tags for Better SEO */}
      <meta name="author" content={product.seller?.full_name || "UniMarket Seller"} />
      <meta name="robots" content="index, follow" />
      <meta name="googlebot" content="index, follow" />
      <meta name="bingbot" content="index, follow" />
      
      {/* Geographic Tags */}
      <meta name="geo.region" content="NG" />
      <meta name="geo.country" content="Nigeria" />
      {product.seller?.campus && (
        <meta name="geo.placename" content={product.seller.campus} />
      )}

      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify(structuredData)}
      </script>
    </Helmet>
  );
};