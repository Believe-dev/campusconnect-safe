import React from 'react';
import { Button } from '@/components/ui/button';
import { Book, Laptop, Shirt, Utensils, ShoppingBag, Dumbbell, Home, PenTool, Users, Sparkles } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

interface ProductFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const categoryIcons = {
  Book,
  Laptop,
  Shirt,
  Utensils,
  ShoppingBag,
  Dumbbell,
  Home,
  PenTool,
  Users,
  Sparkles,
};

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  selectedCategory,
  onCategoryChange,
}) => {
  const categories = [
    { id: 'all', name: 'All Categories', icon: 'ShoppingBag', keywords: [] },
    ...CATEGORIES,
  ];

  return (
    <div className="mb-6 sm:mb-8">
      {/* Categories */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || ShoppingBag;
            const isActive = selectedCategory === category.id;
            return (
              <Button
                key={category.id}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(category.id)}
                className={`gap-2 flex-shrink-0 micro-bounce transition-all duration-200 hover:scale-105 ${
                  isActive 
                    ? 'bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-md' 
                    : 'hover:bg-primary/5 hover:text-primary hover:border-primary/30'
                }`}
              >
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};