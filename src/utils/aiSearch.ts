// AI-powered semantic search utility
interface SearchProduct {
  id: string;
  title: string;
  description: string;
  category: string;
  condition?: string;
  images?: string[];
  [key: string]: any;
}

// Color mappings for better matching
const colorKeywords = {
  red: ['red', 'crimson', 'scarlet', 'burgundy', 'maroon'],
  blue: ['blue', 'navy', 'azure', 'cobalt', 'indigo'],
  black: ['black', 'dark', 'ebony', 'charcoal'],
  white: ['white', 'cream', 'ivory', 'pearl'],
  green: ['green', 'emerald', 'olive', 'forest'],
  yellow: ['yellow', 'gold', 'amber', 'lemon'],
  orange: ['orange', 'tangerine', 'peach', 'coral'],
  purple: ['purple', 'violet', 'lavender', 'plum'],
  pink: ['pink', 'rose', 'magenta', 'fuchsia'],
  brown: ['brown', 'tan', 'beige', 'chocolate'],
  gray: ['gray', 'grey', 'silver', 'slate'],
};

// Category mappings for better understanding
const categoryMappings = {
  // Electronics
  phone: ['phone', 'mobile', 'smartphone', 'iphone', 'android', 'cell'],
  laptop: ['laptop', 'computer', 'notebook', 'macbook', 'pc'],
  headphones: ['headphones', 'earphones', 'earbuds', 'headset', 'airpods'],
  charger: ['charger', 'cable', 'adapter', 'power bank'],
  
  // Fashion & Accessories
  bag: ['bag', 'backpack', 'purse', 'handbag', 'satchel', 'tote'],
  shoes: ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats'],
  shirt: ['shirt', 'top', 'blouse', 'tee', 't-shirt', 'polo'],
  pants: ['pants', 'trousers', 'jeans', 'shorts', 'leggings'],
  dress: ['dress', 'gown', 'frock', 'sundress'],
  watch: ['watch', 'timepiece', 'smartwatch'],
  
  // Books & Education
  book: ['book', 'textbook', 'novel', 'manual', 'guide'],
  notebook: ['notebook', 'journal', 'diary', 'notepad'],
  
  // Transportation
  car: ['car', 'vehicle', 'automobile', 'sedan', 'suv'],
  bike: ['bike', 'bicycle', 'motorcycle', 'scooter'],
  
  // Home & Living
  furniture: ['chair', 'table', 'desk', 'bed', 'sofa', 'couch'],
  kitchen: ['plate', 'cup', 'bowl', 'pot', 'pan', 'utensil'],
};

// Extract keywords and context from natural language query
function parseNaturalLanguageQuery(query: string): {
  colors: string[];
  categories: string[];
  keywords: string[];
  modifiers: string[];
} {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);
  
  const colors: string[] = [];
  const categories: string[] = [];
  const keywords: string[] = [];
  const modifiers: string[] = [];
  
  // Extract colors
  Object.entries(colorKeywords).forEach(([color, variants]) => {
    if (variants.some(variant => lowerQuery.includes(variant))) {
      colors.push(color);
    }
  });
  
  // Extract categories
  Object.entries(categoryMappings).forEach(([category, variants]) => {
    if (variants.some(variant => lowerQuery.includes(variant))) {
      categories.push(category);
    }
  });
  
  // Extract modifiers (condition, size, etc.)
  const conditionWords = ['new', 'used', 'excellent', 'good', 'fair', 'mint'];
  const sizeWords = ['small', 'medium', 'large', 'xl', 'xs', 'big', 'tiny'];
  const qualityWords = ['premium', 'luxury', 'cheap', 'expensive', 'quality'];
  
  words.forEach(word => {
    if (conditionWords.includes(word)) modifiers.push(word);
    if (sizeWords.includes(word)) modifiers.push(word);
    if (qualityWords.includes(word)) modifiers.push(word);
  });
  
  // Remaining words as general keywords
  words.forEach(word => {
    if (word.length > 2 && 
        !colors.some(color => colorKeywords[color as keyof typeof colorKeywords]?.includes(word)) &&
        !Object.values(categoryMappings).flat().includes(word) &&
        !modifiers.includes(word)) {
      keywords.push(word);
    }
  });
  
  return { colors, categories, keywords, modifiers };
}

// Calculate semantic similarity score
function calculateSemanticScore(product: SearchProduct, parsedQuery: {
  colors: string[];
  categories: string[];
  keywords: string[];
  modifiers: string[];
}): number {
  let score = 0;
  const productText = `${product.title} ${product.description} ${product.category}`.toLowerCase();
  
  // Color matching (high weight)
  parsedQuery.colors.forEach(color => {
    const colorVariants = colorKeywords[color as keyof typeof colorKeywords] || [color];
    if (colorVariants.some(variant => productText.includes(variant))) {
      score += 50;
    }
  });
  
  // Category matching (high weight)
  parsedQuery.categories.forEach(category => {
    const categoryVariants = categoryMappings[category as keyof typeof categoryMappings] || [category];
    if (categoryVariants.some(variant => productText.includes(variant))) {
      score += 40;
    }
  });
  
  // Condition matching
  parsedQuery.modifiers.forEach(modifier => {
    if (productText.includes(modifier)) {
      score += 20;
    }
  });
  
  // Keyword matching
  parsedQuery.keywords.forEach(keyword => {
    if (productText.includes(keyword)) {
      score += 15;
    }
    // Partial matching
    if (product.title.toLowerCase().includes(keyword)) {
      score += 10;
    }
  });
  
  // Exact phrase matching (bonus)
  const originalQuery = parsedQuery.keywords.join(' ');
  if (productText.includes(originalQuery)) {
    score += 30;
  }
  
  return score;
}

// Main AI search function
export function performAISearch(products: SearchProduct[], query: string): SearchProduct[] {
  if (!query.trim()) return products;
  
  const parsedQuery = parseNaturalLanguageQuery(query);
  
  // Calculate scores for all products
  const scoredProducts = products.map(product => ({
    product,
    score: calculateSemanticScore(product, parsedQuery)
  }));
  
  // Filter products with meaningful scores and sort by relevance
  return scoredProducts
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.product);
}

// Enhanced search terms expansion for fallback
export function expandAISearchTerms(query: string): string[] {
  const parsedQuery = parseNaturalLanguageQuery(query);
  const expandedTerms: string[] = [];
  
  // Add original query
  expandedTerms.push(query);
  
  // Add color variants
  parsedQuery.colors.forEach(color => {
    const variants = colorKeywords[color as keyof typeof colorKeywords] || [];
    expandedTerms.push(...variants);
  });
  
  // Add category variants
  parsedQuery.categories.forEach(category => {
    const variants = categoryMappings[category as keyof typeof categoryMappings] || [];
    expandedTerms.push(...variants);
  });
  
  // Add individual keywords
  expandedTerms.push(...parsedQuery.keywords);
  expandedTerms.push(...parsedQuery.modifiers);
  
  return [...new Set(expandedTerms)]; // Remove duplicates
}