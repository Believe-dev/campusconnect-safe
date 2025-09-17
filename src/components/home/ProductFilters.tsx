import React from 'react';
import { Button } from '@/components/ui/button';
import { Book, Laptop, Shirt, Utensils, MapPin, ShoppingBag } from 'lucide-react';
import { CATEGORIES, CAMPUSES } from '@/lib/constants';

interface ProductFiltersProps {
  selectedCategory: string;
  selectedCampus: string;
  onCategoryChange: (category: string) => void;
  onCampusChange: (campus: string) => void;
}

const categoryIcons = {
  Book,
  Laptop,
  Shirt,
  Utensils,
  ShoppingBag,
};

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  selectedCategory,
  selectedCampus,
  onCategoryChange,
  onCampusChange,
}) => {
  const categories = [
    { id: 'all', name: 'All Categories', icon: 'ShoppingBag' },
    ...CATEGORIES,
  ];

  const campuses = [
    { id: 'all', name: 'All Campuses' },
    ...CAMPUSES,
  ];

  return (
    <div className="flex flex-col gap-4 mb-6 sm:mb-8">
      {/* Categories */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {categories.map((category) => {
            const IconComponent = categoryIcons[category.icon as keyof typeof categoryIcons] || ShoppingBag;
            return (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "marketplace" : "outline"}
                size="sm"
                onClick={() => onCategoryChange(category.id)}
                className="gap-2 flex-shrink-0"
              >
                <IconComponent className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{category.name}</span>
              </Button>
            );
          })}
        </div>
      </div>
      
      {/* Campus Filter */}
      <div className="overflow-x-auto">
        <div className="flex gap-2 pb-2 min-w-max">
          {campuses.map((campus) => (
            <Button
              key={campus.id}
              variant={selectedCampus === campus.id ? "marketplace" : "outline"}
              size="sm"
              onClick={() => onCampusChange(campus.id)}
              className="gap-2 flex-shrink-0"
            >
              <MapPin className="h-3 w-3" />
              <span className="text-xs sm:text-sm">{campus.name}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};