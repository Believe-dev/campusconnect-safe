import { NextRequest } from 'next/server';

export const config = {
  runtime: 'edge',
};

interface Product {
  id: string;
  title: string;
  description?: string;
  price: number;
  category: string;
  condition: string;
  images?: string[];
  seller_id: string;
  stock_quantity: number;
  created_at: string;
}

export default async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return new Response('Product ID required', { status: 400 });
  }

  try {
    // Fetch product data from Supabase
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }

    const products = await response.json();
    const product: Product = products[0];

    if (!product) {
      return new Response('Product not found', { status: 404 });
    }

    // Generate meta tags
    const title = `${product.title} - ₦${product.price.toLocaleString()} | UniMarket`;
    const description = product.description 
      ? `${product.description.slice(0, 150)}... - Available on UniMarket, Nigeria's trusted university marketplace.`
      : `${product.title} for ₦${product.price.toLocaleString()} - ${product.condition} condition. Buy safely from verified student sellers on UniMarket.`;
    
    const imageUrl = product.images?.[0] 
      ? (product.images[0].startsWith('http') 
          ? product.images[0] 
          : `https://unimarket.com.ng${product.images[0]}`)
      : 'https://unimarket.com.ng/social-preview.png';
    
    const productUrl = `https://unimarket.com.ng/product/${product.id}`;

    // Generate HTML with meta tags
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <meta name="description" content="${description}">
    
    <!-- Open Graph Meta Tags -->
    <meta property="og:type" content="product">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:image:alt" content="${product.title}">
    <meta property="og:url" content="${productUrl}">
    <meta property="og:site_name" content="UniMarket">
    <meta property="og:locale" content="en_NG">
    
    <!-- Product-specific Open Graph Tags -->
    <meta property="product:price:amount" content="${product.price}">
    <meta property="product:price:currency" content="NGN">
    <meta property="product:availability" content="${product.stock_quantity > 0 ? 'in stock' : 'out of stock'}">
    <meta property="product:condition" content="${product.condition}">
    <meta property="product:category" content="${product.category}">
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    <meta name="twitter:image:alt" content="${product.title}">
    <meta name="twitter:site" content="@unimarket_ng">
    
    <!-- WhatsApp/Telegram Preview Tags -->
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta name="thumbnail" content="${imageUrl}">
    
    <!-- Redirect to actual product page -->
    <script>
        window.location.href = "${productUrl}";
    </script>
    <meta http-equiv="refresh" content="0; url=${productUrl}">
</head>
<body>
    <p>Redirecting to <a href="${productUrl}">${product.title}</a>...</p>
</body>
</html>`;

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });

  } catch (error) {
    console.error('Error generating OG tags:', error);
    
    // Fallback HTML
    const fallbackHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>UniMarket - Nigeria's University Marketplace</title>
    <meta name="description" content="Buy and sell safely on Nigeria's trusted university marketplace">
    <meta property="og:title" content="UniMarket - Nigeria's University Marketplace">
    <meta property="og:description" content="Buy and sell safely on Nigeria's trusted university marketplace">
    <meta property="og:image" content="https://unimarket.com.ng/social-preview.png">
    <meta property="og:url" content="https://unimarket.com.ng">
    <script>window.location.href = "https://unimarket.com.ng/product/${id}";</script>
</head>
<body>
    <p>Redirecting to UniMarket...</p>
</body>
</html>`;

    return new Response(fallbackHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  }
}