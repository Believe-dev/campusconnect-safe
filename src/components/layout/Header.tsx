import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { 
  ShoppingCart, 
  MessageCircle, 
  Plus, 
  User, 
  Settings, 
  LogOut, 
  GraduationCap,
  Shield,
  Package,
  Heart,
  Bell,
  Menu
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useCartCount } from '@/hooks/useCartCount';
import SmartSearchInput from '@/components/search/SmartSearchInput';
import MobileSearchDialog from '@/components/search/MobileSearchDialog';

interface Profile {
  full_name: string;
  is_verified: boolean;
  account_type: string;
  avatar_url?: string;
}

const Header = () => {
  const { user, isAdmin } = useAuth();
  const { cartCount } = useCartCount();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchUserProfile(user.id);
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, is_verified, account_type, avatar_url')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear local profile state first
      setProfile(null);
      
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) {
        console.error('Sign out error:', error);
        toast({
          title: "Error",
          description: "Failed to sign out. Please try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Signed Out",
          description: "You've been successfully signed out",
        });
        // Force navigation and page reload to clear any cached auth state
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (query: string) => {
    if (query.trim()) {
      navigate(`/search?q=${encodeURIComponent(query.trim())}`);
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

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-university-green" />
            <span className="text-lg font-bold text-university-green">UniMarket</span>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col gap-4 mt-6">
          {/* User Profile Section */}
          {user && profile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                <AvatarFallback className="bg-university-green text-white">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs">
                    {profile?.account_type}
                  </Badge>
                  {profile?.is_verified && (
                    <Badge variant="outline" className="text-xs text-verified-blue">
                      Verified
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="px-2">
            <SmartSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              placeholder="Search products, categories..."
            />
          </div>

          {/* Navigation Links */}
          {user ? (
            <nav className="flex flex-col gap-2">
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/learn-more">
                  <GraduationCap className="mr-3 h-5 w-5" />
                  Learn More
                </Link>
              </Button>
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/notifications">
                  <Bell className="mr-3 h-5 w-5" />
                  Notifications
                </Link>
              </Button>
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/favorites">
                  <Heart className="mr-3 h-5 w-5" />
                  Favorites
                </Link>
              </Button>
              
              <Button variant="ghost" size="lg" asChild className="justify-start relative">
                <Link to="/cart">
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Cart
                  {cartCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>
              
              {profile?.account_type !== 'buyer' && (
                <Button variant="ghost" size="lg" asChild className="justify-start">
                  <Link to="/sell" className="text-seller">
                    <Plus className="mr-3 h-5 w-5" />
                    Sell Item
                  </Link>
                </Button>
              )}
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/messages">
                  <MessageCircle className="mr-3 h-5 w-5" />
                  Messages
                </Link>
              </Button>
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/orders">
                  <Package className="mr-3 h-5 w-5" />
                  Orders
                </Link>
              </Button>

              <div className="border-t my-2" />
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/profile">
                  <User className="mr-3 h-5 w-5" />
                  Profile
                </Link>
              </Button>
              
              {profile?.account_type !== 'buyer' && (
                <Button variant="ghost" size="lg" asChild className="justify-start">
                  <Link to="/dashboard">
                    <Shield className="mr-3 h-5 w-5" />
                    Dashboard
                  </Link>
                </Button>
              )}
              
              {isAdmin && (
                <Button variant="ghost" size="lg" asChild className="justify-start">
                  <Link to="/admin">
                    <Shield className="mr-3 h-5 w-5" />
                    Admin Panel
                  </Link>
                </Button>
              )}
              
              <Button variant="ghost" size="lg" asChild className="justify-start">
                <Link to="/settings">
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </Link>
              </Button>
              
              <div className="border-t my-2" />
              
              <Button variant="ghost" size="lg" onClick={handleSignOut} className="justify-start text-destructive hover:text-destructive">
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </nav>
          ) : (
            <nav className="flex flex-col gap-3">
              <Button variant="outline" size="lg" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button variant="brand" size="lg" asChild>
                <Link to="/auth">Join UniMarket</Link>
              </Button>
            </nav>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu */}
          <MobileNav />
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-university-green" />
            <span className="text-xl font-bold text-university-green hidden xs:inline">UniMarket</span>
          </Link>

          {/* Desktop Search - Hidden on mobile */}
          <div className="hidden md:flex flex-1 max-w-lg mx-8">
            <SmartSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              placeholder="Search products, categories..."
            />
          </div>

          {/* Mobile Actions - Only show essential items */}
          <div className="flex items-center gap-2">
            {/* Mobile Search Dialog */}
            <div className="md:hidden">
              <MobileSearchDialog />
            </div>

            {user ? (
              <>
                {/* Cart - Always visible */}
                <Button variant="ghost" size="icon" asChild className="relative h-10 w-10">
                  <Link to="/cart">
                    <ShoppingCart className="h-5 w-5" />
                    {cartCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background"
                      >
                        {cartCount > 99 ? '99+' : cartCount}
                      </Badge>
                    )}
                  </Link>
                </Button>

                {/* Desktop Navigation - Hidden on mobile */}
                <div className="hidden md:flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/learn-more">Learn More</Link>
                  </Button>

                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/notifications">
                      <Bell className="h-5 w-5" />
                    </Link>
                  </Button>

                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/favorites">
                      <Heart className="h-5 w-5" />
                    </Link>
                  </Button>

                  {profile?.account_type !== 'buyer' && (
                    <Button variant="seller" size="sm" asChild>
                      <Link to="/sell">
                        <Plus className="mr-1 h-4 w-4" />
                        Sell
                      </Link>
                    </Button>
                  )}

                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/messages">
                      <MessageCircle className="h-5 w-5" />
                    </Link>
                  </Button>

                  <Button variant="ghost" size="icon" asChild>
                    <Link to="/orders">
                      <Package className="h-5 w-5" />
                    </Link>
                  </Button>

                  {/* Desktop User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                          <AvatarFallback className="bg-university-green text-white">
                            {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        {profile?.is_verified && (
                          <div className="absolute -bottom-1 -right-1 bg-verified-blue rounded-full p-1">
                            <Shield className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-1 leading-none">
                          <p className="font-medium">{profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-xs">
                              {profile?.account_type}
                            </Badge>
                            {profile?.is_verified && (
                              <Badge variant="outline" className="text-xs text-verified-blue">
                                Verified
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/profile">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      {profile?.account_type !== 'buyer' && (
                        <DropdownMenuItem asChild>
                          <Link to="/dashboard">
                            <Shield className="mr-2 h-4 w-4" />
                            Dashboard
                          </Link>
                        </DropdownMenuItem>
                      )}
                      {isAdmin && (
                        <DropdownMenuItem asChild>
                          <Link to="/admin">
                            <Shield className="mr-2 h-4 w-4" />
                            Admin Panel
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link to="/settings">
                          <Settings className="mr-2 h-4 w-4" />
                          Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" asChild className="h-10 text-sm">
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button variant="brand" size="sm" asChild className="h-10 text-sm">
                  <Link to="/auth">Join UniMarket</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;