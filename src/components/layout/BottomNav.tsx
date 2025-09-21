import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Home, 
  Package, 
  Heart, 
  MessageCircle,
  Store,
  User
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useCartCount } from '@/hooks/useCartCount';
import { useAuth } from '@/hooks/useAuth';
import { useMessagesCount } from '@/hooks/useMessagesCount';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCartCount();
  const { messagesCount } = useMessagesCount();
  const [userProfile, setUserProfile] = useState<any>(null);
  
  // Hide bottom nav when in messages page (both list and chat)
  const isInMessages = location.pathname === '/messages';

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url, full_name')
        .eq('user_id', user.id)
        .single();
      setUserProfile(data);
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user || isInMessages) return null;

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/marketplace', icon: Store, label: 'Shop' },
    { to: '/orders', icon: Package, label: 'Orders' },
    { to: '/favorites', icon: Heart, label: 'Favorites' },
    { to: '/profile', icon: User, label: 'Profile', badge: messagesCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-primary/10 shadow-lg" style={{ position: 'fixed', bottom: 0 }}>
      <div className="flex justify-around items-center py-2 px-1 safe-area-pb">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive = location.pathname === to || (to === '/marketplace' && location.pathname.startsWith('/marketplace'));
          
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-xl min-w-0 flex-1 relative micro-bounce hover-lift transition-all duration-200",
                isActive 
                  ? "text-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-sm scale-105" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5 hover:scale-105"
              )}
            >
              <div className="relative">
                {label === 'Profile' ? (
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={userProfile?.avatar_url} />
                    <AvatarFallback className="bg-university-green text-white text-xs">
                      {userProfile?.full_name ? getInitials(userProfile.full_name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? "drop-shadow-sm" : ""
                  )} />
                )}
                {badge && badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-background shadow-sm animate-pulse"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-xs font-medium truncate w-full text-center transition-all duration-200",
                isActive ? "font-semibold" : ""
              )}>
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