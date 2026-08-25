export default async function handler(req, res) {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ error: 'Product ID required' });
  }

  try {
    const supabaseUrl = 'https://ssqplkrxtrvfptrsnpow.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNzcXBsa3J4dHJ2ZnB0cnNucG93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5NDY5NjAsImV4cCI6MjA3MTUyMjk2MH0.pUr4tPv_BolqhaNjUukRfLmUzmAPcAQEm8jy6ifBMeg';

    const response = await fetch(`${supabaseUrl}/rest/v1/products?id=eq.${id}&select=*`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    });

    const products = await response.json();
    const product = products[0];

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Return raw product data for debugging
    res.status(200).json({
      id: product.id,
      title: product.title,
      images: product.images,
      raw_product: product
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}