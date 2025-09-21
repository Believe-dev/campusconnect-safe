import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, TrendingUp, Clock, Tag } from 'lucide-react';
import { expandSearchTerms } from '@/utils/searchUtils';

interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'category' | 'recent' | 'trending';
  count?: number;
}

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: (query: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  autoFocus?: boolean;
}

const SmartSearchInput = ({ 
  value, 
  onChange, 
  onSubmit,
  placeholder = "Search products, categories...",
  showSuggestions = true,
  autoFocus = false 
}: SmartSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length >= 1 && showSuggestions) {
      const timeoutId = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setSuggestions([]);
    }
  }, [value, showSuggestions]);

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const searchTerms = query.toLowerCase().trim();
      const expandedTerms = expandSearchTerms(searchTerms);
      
      // Build smart search conditions
      const searchConditions = expandedTerms.map(term => 
        `title.ilike.%${term}%,description.ilike.%${term}%,category.ilike.%${term}%`
      ).join(',');
      
      // Get product suggestions with smart matching
      const { data: products } = await supabase
        .from('products')
        .select('title, category, price')
        .eq('is_active', true)
        .or(searchConditions)
        .order('created_at', { ascending: false })
        .limit(8);

      // Get popular categories
      const { data: categoryData } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .or(expandedTerms.map(term => `category.ilike.%${term}%`).join(','))
        .limit(5);

      const newSuggestions: SearchSuggestion[] = [];
      const addedTexts = new Set<string>();

      // Add exact product matches first
      if (products) {
        products.forEach(product => {
          const titleLower = product.title.toLowerCase();
          if (!addedTexts.has(titleLower) && newSuggestions.length < 6) {
            newSuggestions.push({
              id: `product-${product.title}`,
              text: product.title,
              type: 'product'
            });
            addedTexts.add(titleLower);
          }
        });
      }

      // Add category suggestions
      if (categoryData) {
        const uniqueCategories = [...new Set(categoryData.map(c => c.category))]
          .filter(cat => cat && !addedTexts.has(cat.toLowerCase()));
        
        uniqueCategories.slice(0, 3).forEach(category => {
          newSuggestions.push({
            id: `category-${category}`,
            text: category,
            type: 'category'
          });
          addedTexts.add(category.toLowerCase());
        });
      }

      // Add smart trending suggestions
      if (newSuggestions.length < 6) {
        const smartSuggestions = [
          'iPhone', 'MacBook', 'Samsung', 'Textbooks', 'Laptop', 'Headphones',
          'Nike Shoes', 'Backpack', 'Calculator', 'Notebook', 'Charger', 'Books'
        ].filter(item => {
          const itemLower = item.toLowerCase();
          return !addedTexts.has(itemLower) && 
                 (itemLower.includes(searchTerms) || searchTerms.includes(itemLower.slice(0, 3)));
        });
        
        smartSuggestions.slice(0, 6 - newSuggestions.length).forEach(suggestion => {
          newSuggestions.push({
            id: `trending-${suggestion}`,
            text: suggestion,
            type: 'trending'
          });
        });
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    setIsOpen(false);
    if (onSubmit) {
      onSubmit(suggestion.text);
    } else {
      navigate(`/search?q=${encodeURIComponent(suggestion.text)}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    inputRef.current?.blur(); // Dismiss keyboard on mobile
    if (onSubmit) {
      onSubmit(value);
    } else if (value.trim()) {
      navigate(`/search?q=${encodeURIComponent(value.trim())}`);
    }
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'trending':
        return <TrendingUp className="h-4 w-4 text-muted-foreground" />;
      case 'recent':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'category':
        return <Tag className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Search className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="relative w-full">
      <form onSubmit={handleSubmit} className="relative flex gap-2 w-full">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setIsOpen(e.target.value.length >= 1 && showSuggestions);
            }}
            onFocus={() => setIsOpen(value.length >= 1 && suggestions.length > 0 && showSuggestions)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className="pl-10 pr-4"
            autoFocus={autoFocus}
          />
        </div>
        <Button type="submit" variant="brand" size="sm">
          Search
        </Button>
      </form>
      
      {isOpen && (suggestions.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg max-h-80 overflow-y-auto">
          <Command>
            <CommandEmpty>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="ml-2 text-sm">Searching...</span>
                </div>
              ) : "No suggestions found"}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                  className="flex items-center gap-3 cursor-pointer px-3 py-2 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {getSuggestionIcon(suggestion.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{suggestion.text}</span>
                  </div>
                  <div className="flex-shrink-0">
                    {suggestion.type === 'category' && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">Category</span>
                    )}
                    {suggestion.type === 'trending' && (
                      <span className="text-xs text-muted-foreground bg-orange-100 text-orange-600 px-2 py-1 rounded-full">Trending</span>
                    )}
                    {suggestion.type === 'product' && (
                      <span className="text-xs text-muted-foreground bg-blue-100 text-blue-600 px-2 py-1 rounded-full">Product</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </div>
      )}
    </div>
  );
};

export default SmartSearchInput;