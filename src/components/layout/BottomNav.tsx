import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  Heart, 
  MessageCircle,
  Store
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCartCount } from '@/hooks/useCartCount';
import { useAuth } from '@/hooks/useAuth';

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCartCount();

  if (!user) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/marketplace', icon: Store, label: 'Shop' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/messages', icon: MessageCircle, label: 'Messages' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t shadow-lg" style={{ position: 'fixed' }}>
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.pathname === to || (to === '/marketplace' && location.pathname.startsWith('/marketplace'));
          
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 flex-1 relative transition-colors",
                isActive 
                  ? "text-primary bg-primary/10" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {badge && badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>
              <span className="text-xs font-medium truncate w-full text-center">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;