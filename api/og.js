export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Product ID required' });
  }

  try {
    // Fetch product data from Supabase
    const supabaseUrl = 'https://ssqplkrxtrvfptrsnpow.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg';

    const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch product');
    }

    const products = await response.json();
    const product = products[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Generate meta tags
    const title = `${product.title} - ₦${product.price.toLocaleString()} | UniMarket`;
    const description = product.description 
      ? `${product.description.slice(0, 150)}... - Available on UniMarket, Nigeria's trusted university marketplace.`
      : `${product.title} for ₦${product.price.toLocaleString()} - ${product.condition} condition. Buy safely from verified student sellers on UniMarket.`;
    
    const imageUrl = product.images && product.images[0] 
      ? (product.images[0].startsWith('http') ? product.images[0] : `https://unimarket.com.ng${product.images[0]}`)
      : 'https://unimarket.com.ng/social-preview.png';
    
    const productUrl = `https://unimarket.com.ng/product/${product.id}`;

    // Generate HTML with meta tags
    const html = `<!DOCTYPE html>
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
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
    
    <!-- Redirect to actual product page -->
    <meta http-equiv="refresh" content="0; url=${productUrl}">
    <script>window.location.href = "${productUrl}";</script>
</head>
<body>
    <p>Redirecting to <a href="${productUrl}">${product.title}</a>...</p>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(html);

  } catch (error) {
    console.error('Error generating OG tags:', error);
    
    // Fallback HTML
    const fallbackHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>UniMarket - Nigeria's University Marketplace</title>
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

    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(fallbackHtml);
  }
}