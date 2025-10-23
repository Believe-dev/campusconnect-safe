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
  
  // Auction/Bidding terms
  'auction': ['bid', 'bidding', 'live bid', 'live auction'],
  'bid': ['auction', 'bidding', 'live bid', 'offer'],
  'bidding': ['auction', 'bid', 'live bid', 'competitive'],
  
  // Nigerian university specific terms
  'jamb': ['utme', 'university entrance', 'admission'],
  'waec': ['wassce', 'senior secondary', 'o level'],
  'gns': ['general studies', 'use of english'],
  'hostel': ['accommodation', 'lodge', 'room'],
  'handout': ['note', 'material', 'courseware'],
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

// Enhanced search function with smart ranking for both products and live bids
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
        item.condition
      ].join(' ').toLowerCase();
      
      let score = 0;
      
      // Exact title match gets highest score
      if (item.title.toLowerCase().includes(queryLower)) {
        score += 100;
      }
      
      // Category match
      if (item.category.toLowerCase().includes(queryLower)) {
        score += 50;
      }
      
      // Synonym and expanded term matches
      searchTerms.forEach(term => {
        if (searchableText.includes(term)) {
          score += 25;
        }
        // Fuzzy matching for typos
        if (searchableText.includes(term.slice(0, -1)) || 
            searchableText.includes(term + 's') ||
            searchableText.includes(term.slice(0, -1) + 'ing')) {
          score += 10;
        }
      });
      
      // Boost newer items slightly
      const daysSinceCreated = (Date.now() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated < 7) score += 5;
      
      // Boost live feed items slightly for urgency
      if (item.type === 'live_feed') {
        score += 15;
        // Boost items expiring soon
        const hoursUntilExpiry = (new Date(item.expires_at).getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursUntilExpiry < 2) score += 20;
        else if (hoursUntilExpiry < 6) score += 10;
      }
      
      return { ...item, searchScore: score };
    })
    .filter(item => item.searchScore > 0)
    .sort((a, b) => b.searchScore - a.searchScore);
};