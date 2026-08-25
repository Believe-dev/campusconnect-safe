import { Badge } from '@/components/ui/badge';
import { Trophy, Star } from 'lucide-react';

interface GameBadgeProps {
  level: number;
  isGolden?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const GameBadge = ({ level, isGolden = false, size = 'md' }: GameBadgeProps) => {
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4', 
    lg: 'h-5 w-5'
  };

  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} ${
        isGolden 
          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-yellow-500' 
          : 'bg-blue-50 text-blue-700 border-blue-300'
      }`}
    >
      {isGolden ? (
        <Star className={`${iconSizes[size]} mr-1 fill-current`} />
      ) : (
        <Trophy className={`${iconSizes[size]} mr-1`} />
      )}
      Level {level}
    </Badge>
  );
};