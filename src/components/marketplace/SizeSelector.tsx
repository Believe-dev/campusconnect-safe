import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

interface SizeSelectorProps {
  availableSizes: string[];
  selectedSize?: string;
  onSizeSelect: (size: string) => void;
  required?: boolean;
}

export const SizeSelector: React.FC<SizeSelectorProps> = ({
  availableSizes,
  selectedSize,
  onSizeSelect,
  required = false,
}) => {
  if (!availableSizes || availableSizes.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Select Size {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="flex flex-wrap gap-2">
        {availableSizes.map((size) => (
          <Button
            key={size}
            variant={selectedSize === size ? "default" : "outline"}
            size="sm"
            onClick={() => onSizeSelect(size)}
            className="min-w-[60px]"
          >
            {size}
          </Button>
        ))}
      </div>
      {selectedSize && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Selected:</span>
          <Badge variant="secondary">{selectedSize}</Badge>
        </div>
      )}
    </div>
  );
};