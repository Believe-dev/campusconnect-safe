import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/enhanced-button';
import { Command, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, TrendingUp, Clock, Tag } from 'lucide-react';

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
  autoFocus = true 
}: SmartSearchInputProps) => {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (value.length >= 2 && showSuggestions) {
      fetchSuggestions(value);
    } else {
      setSuggestions([]);
    }
  }, [value, showSuggestions]);

  const fetchSuggestions = async (query: string) => {
    setLoading(true);
    try {
      const searchTerms = query.toLowerCase().trim();
      
      // Get product suggestions
      const { data: products } = await supabase
        .from('products')
        .select('title, category')
        .eq('is_active', true)
        .or(`title.ilike.%${searchTerms}%,description.ilike.%${searchTerms}%,category.ilike.%${searchTerms}%`)
        .limit(5);

      // Get category suggestions
      const { data: categories } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true)
        .ilike('category', `%${searchTerms}%`)
        .limit(3);

      const newSuggestions: SearchSuggestion[] = [];

      // Add product suggestions
      if (products) {
        products.forEach(product => {
          if (newSuggestions.length < 8 && product.title.toLowerCase().includes(searchTerms)) {
            newSuggestions.push({
              id: `product-${product.title}`,
              text: product.title,
              type: 'product'
            });
          }
        });
      }

      // Add category suggestions
      if (categories) {
        const uniqueCategories = [...new Set(categories.map(c => c.category))];
        uniqueCategories.forEach(category => {
          if (newSuggestions.length < 8 && category && category.toLowerCase().includes(searchTerms)) {
            newSuggestions.push({
              id: `category-${category}`,
              text: category,
              type: 'category'
            });
          }
        });
      }

      // Add trending suggestions if no matches
      if (newSuggestions.length === 0) {
        const trendingSuggestions = [
          'Electronics', 'Books & Textbooks', 'Fashion & Accessories', 
          'Food & Beverages', 'Services', 'Sports & Recreation'
        ].filter(item => item.toLowerCase().includes(searchTerms));
        
        trendingSuggestions.forEach(suggestion => {
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
              setIsOpen(e.target.value.length >= 2 && suggestions.length > 0);
            }}
            onFocus={() => setIsOpen(value.length >= 2 && suggestions.length > 0)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            className="pl-10 pr-4"
            autoFocus={autoFocus}
          />
        </div>
        <Button type="submit" variant="brand" size="sm">
          Search
        </Button>
      </form>
      
      {isOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-md shadow-lg">
          <Command>
            <CommandEmpty>
              {loading ? "Searching..." : "No suggestions found"}
            </CommandEmpty>
            <CommandGroup>
              {suggestions.map((suggestion) => (
                <CommandItem
                  key={suggestion.id}
                  onSelect={() => handleSuggestionSelect(suggestion)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  {getSuggestionIcon(suggestion.type)}
                  <span>{suggestion.text}</span>
                  {suggestion.type === 'category' && (
                    <span className="text-xs text-muted-foreground ml-auto">Category</span>
                  )}
                  {suggestion.type === 'trending' && (
                    <span className="text-xs text-muted-foreground ml-auto">Trending</span>
                  )}
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