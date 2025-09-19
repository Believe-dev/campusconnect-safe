// Synonym mapping for better search results
const synonymMap: Record<string, string[]> = {
  // Bags & Backpacks
  'bag': ['backpack', 'satchel', 'tote', 'purse', 'handbag', 'messenger', 'duffel', 'laptop bag'],
  'backpack': ['bag', 'rucksack', 'knapsack', 'school bag', 'hiking bag'],
  'purse': ['handbag', 'bag', 'clutch', 'wallet'],
  
  // Electronics
  'phone': ['mobile', 'smartphone', 'cell phone', 'iphone', 'android'],
  'laptop': ['computer', 'notebook', 'macbook', 'pc'],
  'computer': ['laptop', 'pc', 'desktop', 'mac'],
  'headphones': ['earphones', 'earbuds', 'headset', 'airpods'],
  'charger': ['cable', 'adapter', 'power bank', 'charging cable'],
  
  // Books & Education
  'book': ['textbook', 'novel', 'manual', 'guide', 'ebook'],
  'textbook': ['book', 'coursebook', 'study guide', 'academic book'],
  'notebook': ['journal', 'diary', 'notepad', 'exercise book'],
  
  // Clothing
  'shirt': ['t-shirt', 'tee', 'blouse', 'top'],
  'pants': ['trousers', 'jeans', 'slacks', 'bottoms'],
  'shoes': ['sneakers', 'boots', 'sandals', 'footwear'],
  'jacket': ['coat', 'hoodie', 'blazer', 'cardigan'],
  
  // Furniture
  'chair': ['seat', 'stool', 'armchair', 'desk chair'],
  'table': ['desk', 'workstation', 'study table'],
  'bed': ['mattress', 'bedframe', 'sleeping'],
  
  // Kitchen & Food
  'cup': ['mug', 'glass', 'tumbler', 'drinkware'],
  'plate': ['dish', 'bowl', 'dinnerware'],
  'food': ['snack', 'meal', 'groceries', 'edibles'],
  
  // Sports & Recreation
  'ball': ['football', 'basketball', 'soccer ball', 'tennis ball'],
  'bike': ['bicycle', 'cycle', 'mountain bike'],
  'gym': ['fitness', 'workout', 'exercise', 'sports'],
  
  // Stationery
  'pen': ['pencil', 'marker', 'highlighter', 'writing'],
  'paper': ['notebook', 'sheets', 'stationery'],
  'calculator': ['calc', 'scientific calculator'],
};

// Generate all possible search terms including synonyms
export const expandSearchTerms = (query: string): string[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  const expandedTerms = new Set<string>();
  
  // Add original terms
  terms.forEach(term => expandedTerms.add(term));
  
  // Add synonyms
  terms.forEach(term => {
    if (synonymMap[term]) {
      synonymMap[term].forEach(synonym => expandedTerms.add(synonym));
    }
    
    // Check if term is a synonym of any key
    Object.entries(synonymMap).forEach(([key, synonyms]) => {
      if (synonyms.includes(term)) {
        expandedTerms.add(key);
        synonyms.forEach(synonym => expandedTerms.add(synonym));
      }
    });
  });
  
  return Array.from(expandedTerms);
};

// Enhanced search function for products
export const searchProducts = (products: any[], query: string) => {
  if (!query.trim()) return products;
  
  const searchTerms = expandSearchTerms(query);
  
  return products.filter(product => {
    const searchableText = [
      product.title,
      product.description,
      product.category,
      product.condition
    ].join(' ').toLowerCase();
    
    return searchTerms.some(term => 
      searchableText.includes(term) ||
      // Fuzzy matching for typos
      searchableText.includes(term.slice(0, -1)) ||
      searchableText.includes(term + 's') ||
      searchableText.includes(term.slice(0, -1) + 'ing')
    );
  });
};