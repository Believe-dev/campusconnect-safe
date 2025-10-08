import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, ArrowRight } from 'lucide-react';

interface MobileExpandableSearchProps {
  onExpand?: (expanded: boolean) => void;
}

const MobileExpandableSearch = ({ onExpand }: MobileExpandableSearchProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions] = useState([
    'Electronics', 'Textbooks', 'Fashion', 'Furniture', 'Sports Equipment'
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleExpand = () => {
    setIsExpanded(true);
    onExpand?.(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    setSearchQuery('');
    onExpand?.(false);
  };

  const handleSearch = (query?: string) => {
    const searchTerm = query || searchQuery;
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      handleCollapse();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      handleCollapse();
    }
  };

  useEffect(() => {
    if (isExpanded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isExpanded]);

  return (
    <>
      {/* Backdrop blur - rendered at body level */}
      {isExpanded && createPortal(
        <div 
          className="fixed inset-0 bg-black/30 backdrop-blur-md z-[9999] lg:hidden transition-all duration-300 opacity-100"
          onClick={handleCollapse}
        />,
        document.body
      )}
      
      {/* Search trigger button */}
      <Button 
        variant="ghost" 
        size="icon" 
        className={`h-8 w-8 sm:h-10 sm:w-10 transition-all duration-300 ${
          isExpanded ? 'opacity-0 scale-75' : 'opacity-100 scale-100'
        }`}
        onClick={handleExpand}
      >
        <Search className="h-4 w-4 sm:h-5 sm:w-5" />
      </Button>
      
      {/* Expanded search bar */}
      {isExpanded && createPortal(
        <div className="fixed top-0 left-0 right-0 z-[10000] bg-white border-b border-gray-200 shadow-lg lg:hidden animate-in slide-in-from-top duration-300">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCollapse}
            className="h-8 w-8 flex-shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Search products, categories..."
              className="w-full pr-10 border-2 border-gray-200 focus:border-university-green rounded-full"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleSearch()}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Smart suggestions */}
        {searchQuery.length > 0 && (
          <div className="border-t border-gray-100 bg-white max-h-60 overflow-y-auto">
            {suggestions
              .filter(suggestion => 
                suggestion.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{suggestion}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-gray-400" />
                </button>
              ))
            }
            
            {/* Search query option */}
            <button
              onClick={() => handleSearch()}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left border-t border-gray-100"
            >
              <div className="flex items-center gap-3">
                <Search className="h-4 w-4 text-university-green" />
                <span className="text-sm">Search for "<span className="font-medium">{searchQuery}</span>"</span>
              </div>
              <ArrowRight className="h-4 w-4 text-university-green" />
            </button>
          </div>
        )}
        
        {/* Popular searches when no query */}
        {searchQuery.length === 0 && (
          <div className="border-t border-gray-100 bg-gray-50 p-4">
            <p className="text-xs text-gray-500 mb-3 font-medium">Popular searches</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(suggestion)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs hover:border-university-green hover:text-university-green transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
        </div>,
        document.body
      )}
    </>
  );
};

export default MobileExpandableSearch;