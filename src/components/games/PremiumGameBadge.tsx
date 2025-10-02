import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';

interface PremiumGameBadgeProps {
  level: number;
  badgeType: 'bronze' | 'silver' | 'gold' | 'none';
  isPremium: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const PremiumGameBadge = ({ 
  level, 
  badgeType, 
  isPremium, 
  size = 'md' 
}: PremiumGameBadgeProps) => {
  if (!isPremium || badgeType === 'none') {
    return null;
  }

  const sizeClasses = {
    sm: 'text-xs px-2 py-1 h-6',
    md: 'text-sm px-3 py-1.5 h-8',
    lg: 'text-base px-4 py-2 h-10'
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const getBadgeStyles = () => {
    const baseStyles = `${sizeClasses[size]} font-bold border-2 shadow-lg transform transition-all duration-200 hover:scale-105`;
    
    switch (badgeType) {
      case 'bronze':
        return `${baseStyles} bg-gradient-to-br from-amber-600 via-amber-700 to-amber-800 text-white border-amber-500 shadow-amber-500/30`;
      case 'silver':
        return `${baseStyles} bg-gradient-to-br from-gray-300 via-gray-400 to-gray-500 text-gray-900 border-gray-300 shadow-gray-400/30`;
      case 'gold':
        return `${baseStyles} bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-yellow-900 border-yellow-400 shadow-yellow-500/40`;
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    const iconClass = `${iconSizes[size]} mr-1.5`;
    
    switch (badgeType) {
      case 'bronze':
        return <Medal className={iconClass} />;
      case 'silver':
        return <Trophy className={iconClass} />;
      case 'gold':
        return <Award className={iconClass} />;
      default:
        return <Trophy className={iconClass} />;
    }
  };

  const getBadgeText = () => {
    switch (badgeType) {
      case 'bronze':
        return `Bronze Gamer L${level}`;
      case 'silver':
        return `Silver Gamer L${level}`;
      case 'gold':
        return `Gold Gamer L${level}`;
      default:
        return `Level ${level}`;
    }
  };

  return (
    <Badge className={getBadgeStyles()}>
      {getIcon()}
      {getBadgeText()}
    </Badge>
  );
};