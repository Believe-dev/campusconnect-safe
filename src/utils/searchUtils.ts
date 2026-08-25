// Enhanced synonym mapping with brand names, common misspellings, and Nigerian context
const synonymMap: Record<string, string[]> = {
  // Electronics & Brands
  'phone': ['mobile', 'smartphone', 'cell phone', 'iphone', 'android', 'samsung', 'tecno', 'infinix', 'itel'],
  'iphone': ['phone', 'apple phone', 'ios', 'smartphone'],
  'samsung': ['phone', 'galaxy', 'android', 'smartphone'],
  'laptop': ['computer', 'notebook', 'macbook', 'pc', 'hp', 'dell', 'lenovo', 'asus'],
  'macbook': ['laptop', 'apple laptop', 'mac', 'computer'],
  'headphones': ['earphones', 'earbuds', 'headset', 'airpods', 'beats', 'audio'],
  'charger': ['cable', 'adapter', 'power bank', 'charging cable', 'usb'],
  
  // Books & Education (Nigerian context)
  'book': ['textbook', 'novel', 'manual', 'guide', 'ebook', 'handout', 'material'],
  'textbook': ['book', 'coursebook', 'study guide', 'academic book', 'course material'],
  'jamb': ['utme', 'university entrance', 'admission', 'joint admission'],
  'waec': ['wassce', 'senior secondary', 'o level', 'west african'],
  'gns': ['general studies', 'use of english', 'general english'],
  'handout': ['note', 'material', 'courseware', 'lecture note'],
  
  // Fashion & Brands
  'shirt': ['t-shirt', 'tee', 'blouse', 'top', 'polo', 'jersey'],
  'nike': ['shoes', 'sneakers', 'sportswear', 'athletic'],
  'adidas': ['shoes', 'sneakers', 'sportswear', 'athletic'],
  'shoes': ['sneakers', 'boots', 'sandals', 'footwear', 'nike', 'adidas'],
  'bag': ['backpack', 'satchel', 'tote', 'purse', 'handbag', 'messenger', 'school bag'],
  
  // Food & Beverages (Nigerian context)
  'food': ['snack', 'meal', 'groceries', 'edibles', 'jollof', 'rice', 'beans'],
  'rice': ['jollof', 'fried rice', 'food', 'meal'],
  'garri': ['cassava', 'food', 'meal', 'snack'],
  'indomie': ['noodles', 'instant noodles', 'food'],
  
  // Common misspellings and variations
  'cloths': ['clothes', 'clothing', 'fashion'],
  'cloth': ['clothes', 'clothing', 'fabric'],
  'fone': ['phone', 'mobile'],
  'computa': ['computer', 'laptop'],
  'buk': ['book', 'textbook'],
  
  // Nigerian slang and local terms
  'kpali': ['slippers', 'flip flops', 'shoes'],
  'biro': ['pen', 'ballpoint', 'writing'],
  'torch': ['flashlight', 'light'],
  'motor': ['car', 'vehicle', 'automobile'],
  'keke': ['tricycle', 'transport'],
  
  // Academic terms
  'assignment': ['homework', 'project', 'coursework'],
  'exam': ['test', 'examination', 'quiz'],
  'lecture': ['class', 'lesson', 'course'],
  
  // Live feed / auction terms
  'auction': ['bid', 'bidding', 'live bid', 'live auction', 'sale'],
  'bid': ['auction', 'bidding', 'live bid', 'offer', 'price'],
  'urgent': ['asap', 'quick', 'fast', 'immediate'],
};

// Simple Levenshtein distance for typo detection
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Smart search term expansion with fuzzy matching and context detection
export const expandSearchTerms = (query: string): string[] => {
  const terms = query.toLowerCase().split(/\s+/).filter(term => term.length > 1);
  const expandedTerms = new Set<string>();
  
  // Add original terms
  terms.forEach(term => {
    expandedTerms.add(term);
    
    // Add partial matches for longer terms
    if (term.length > 4) {
      expandedTerms.add(term.slice(0, -1)); // Remove last character
      expandedTerms.add(term.slice(0, -2)); // Remove last 2 characters
    }
    
    // Add common variations
    expandedTerms.add(term + 's'); // Plural
    expandedTerms.add(term + 'es'); // Plural variation
    if (term.endsWith('s')) {
      expandedTerms.add(term.slice(0, -1)); // Singular
    }
  });
  
  // Add synonyms and related terms
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
    
    // Fuzzy matching for common typos
    Object.keys(synonymMap).forEach(key => {
      if (levenshteinDistance(term, key) <= 1 && term.length > 3) {
        expandedTerms.add(key);
        synonymMap[key].forEach(synonym => expandedTerms.add(synonym));
      }
    });
  });
  
  return Array.from(expandedTerms).filter(term => term.length > 1);
};

// Smart search with context detection and intelligent ranking
export const searchProducts = (items: any[], query: string) => {
  if (!query.trim()) return items;
  
  const searchTerms = expandSearchTerms(query);
  const queryLower = query.toLowerCase();
  
  return items
    .map(item => {
      const searchableText = [
        item.title,
        item.description,
        item.category,
        item.condition,
        item.campus || item.location
      ].join(' ').toLowerCase();
      
      let score = 0;
      
      // Exact matches get highest priority
      if (item.title.toLowerCase() === queryLower) score += 200;
      else if (item.title.toLowerCase().includes(queryLower)) score += 100;
      
      // Brand detection bonus
      const brands = ['iphone', 'samsung', 'nike', 'adidas', 'hp', 'dell', 'macbook'];
      brands.forEach(brand => {
        if (queryLower.includes(brand) && searchableText.includes(brand)) {
          score += 80;
        }
      });
      
      // Category relevance
      if (item.category && item.category.toLowerCase().includes(queryLower)) {
        score += 60;
      }
      
      // Condition matching (new vs used)
      if (queryLower.includes('new') && item.condition === 'new') score += 40;
      if (queryLower.includes('used') && item.condition === 'used') score += 40;
      
      // Synonym and expanded term matches
      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          score += term.length > 4 ? 30 : 20; // Longer terms get higher score
        }
      });
      
      // Price range detection
      const priceMatch = queryLower.match(/\d+k?/);
      if (priceMatch && item.price) {
        const queryPrice = parseInt(priceMatch[0].replace('k', '000'));
        const priceDiff = Math.abs(item.price - queryPrice) / queryPrice;
        if (priceDiff < 0.2) score += 50; // Within 20% of queried price
      }
      
      // Urgency detection for live feeds
      const urgentWords = ['urgent', 'asap', 'quick', 'fast', 'now'];
      if (urgentWords.some(word => queryLower.includes(word)) && item.type === 'live_feed') {
        score += 60;
      }
      
      // Recency boost
      const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 1) score += 15;
      else if (daysSinceCreated < 7) score += 8;
      
      // Live feed urgency boost
      if (item.type === 'live_feed') {
        score += 20;
        const hoursUntilExpiry = (new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilExpiry < 1) score += 40;
        else if (hoursUntilExpiry < 6) score += 20;
      }
      
      return { ...item, searchScore: score };
    })
    .filter(item => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
};