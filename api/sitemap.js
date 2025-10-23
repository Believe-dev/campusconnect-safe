export default async function handler(req, res) {
  try {
    const supabaseUrl = 'https://ssqplkrxtrvfptrsnpow.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg';

    // Fetch active products
    const response = await fetch(`${supabaseUrl}/rest/v1/products?is_active=eq.true&select=id,title,created_at,updated_at&limit=1000`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    const products = await response.json();

    // Generate sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://unimarket.com.ng</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://unimarket.com.ng/marketplace</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  ${products.map(product => `
  <url>
    <loc>https://unimarket.com.ng/product/${product.id}</loc>
    <lastmod>${new Date(product.updated_at || product.created_at).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`).join('')}
</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
    res.status(200).send(sitemap);

  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).send('Error generating sitemap');
  }
}