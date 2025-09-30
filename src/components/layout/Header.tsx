import { useState, useEffect } from "react";
import { TestNotificationButton } from "@/components/notifications/TestNotificationButton";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "../theme/ThemeProvider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  ShoppingCart,
  MessageCircle,
  Plus,
  User,
  Settings,
  LogOut,
  Shield,
  Package,
  Heart,
  Bell,
  Menu,
  Store,
  Wifi,
  WifiOff,
  Signal,
  Lightbulb,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCartCount } from "@/hooks/useCartCount";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useNotifications } from "@/hooks/useNotifications";
import { useOrdersCount } from "@/hooks/useOrdersCount";
import { useMessagesCount } from "@/hooks/useMessagesCount";
import { useProfile } from "@/contexts/ProfileContext";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import SmartSearchInput from "@/components/search/SmartSearchInput";
import MobileSearchDialog from "@/components/search/MobileSearchDialog";

interface Profile {
  full_name: string;
  is_verified: boolean;
  account_type: string;
  verification_status?: string;
  avatar_url?: string;
}

const Header = () => {
  const { user, isAdmin, loading } = useAuth();
  const { profile } = useProfile();
  const { cartCount } = useCartCount();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { unreadCount } = useNotifications();
  const { ordersCount } = useOrdersCount();
  const { messagesCount } = useMessagesCount();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  const { theme, setTheme } = useTheme();

  // Enable real-time updates
  useRealTimeUpdates();

  const NetworkIndicator = () => {
    const [connectionStrength, setConnectionStrength] = useState(5);

    useEffect(() => {
      const updateConnectionStrength = () => {
        if (!isOnline) {
          setConnectionStrength(0);
          return;
        }

        const connection =
          (navigator as any).connection ||
          (navigator as any).mozConnection ||
          (navigator as any).webkitConnection;
        if (connection) {
          const { effectiveType, downlink } = connection;
          if (effectiveType === "4g" && downlink > 10) setConnectionStrength(5);
          else if (effectiveType === "4g" || downlink > 5)
            setConnectionStrength(4);
          else if (effectiveType === "3g" || downlink > 1)
            setConnectionStrength(3);
          else if (effectiveType === "2g" || downlink > 0.5)
            setConnectionStrength(2);
          else setConnectionStrength(1);
        } else {
          setConnectionStrength(isSlowConnection ? 2 : 4);
        }
      };

      updateConnectionStrength();
      const interval = setInterval(updateConnectionStrength, 5000);
      return () => clearInterval(interval);
    }, [isOnline, isSlowConnection]);

    const getBarColor = (barIndex: number) => {
      if (connectionStrength === 0) return "bg-gray-300";
      if (barIndex <= connectionStrength) {
        if (connectionStrength >= 4) return "bg-green-500";
        if (connectionStrength >= 2) return "bg-orange-500";
        return "bg-red-500";
      }
      return "bg-gray-300";
    };

    return (
      <div className="flex items-end gap-0.5 px-2 py-1">
        {[1, 2, 3, 4, 5].map((bar) => (
          <div
            key={bar}
            className={`w-1 transition-colors duration-300 ${getBarColor(bar)}`}
            style={{ height: `${bar * 2 + 2}px` }}
          />
        ))}
      </div>
    );
  };

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) {
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
        window.location.href = "/";
      }
    } catch (error) {
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

  const getInitials = (name: string | undefined) => {
    if (!name || name.trim() === "") return "U";

    const words = name
      .trim()
      .split(" ")
      .filter((word) => word.length > 0);
    if (words.length === 0) return "U";

    return words
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden h-10 w-10">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-full sm:w-96 md:w-[28rem] lg:w-80 h-full flex flex-col overflow-hidden bg-background"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="UniMarket Logo"
              className="h-6 w-6 object-contain"
            />
            <span className="text-lg font-bold text-university-green">
              UniMarket
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6 flex-1 overflow-y-auto scrollbar-thin pb-4">
          {/* User Profile Section */}
          {user && profile && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Avatar className="h-12 w-12 avatar-stable">
                <AvatarImage
                  src={profile?.avatar_url}
                  alt={profile?.full_name}
                />
                <AvatarFallback className="bg-university-green text-white">
                  {profile?.full_name ? getInitials(profile.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="font-medium">{profile?.full_name}</p>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge variant="outline" className="text-xs verified-badge">
                    {profile?.account_type}
                  </Badge>
                  {profile?.is_verified && (
                    <div className="trust-badge">
                      <div className="verification-badge-inline">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <span className="text-xs font-medium">Verified</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          {user ? (
            <nav className="flex flex-col gap-2">
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/marketplace">
                  <Store className="mr-3 h-5 w-5" />
                  Marketplace
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/sellers">
                  <User className="mr-3 h-5 w-5" />
                  Find Sellers
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/learn-more">
                  <img
                    src="/logo.png"
                    alt="UniMarket Logo"
                    className="mr-3 h-5 w-5 object-contain"
                  />
                  Learn More
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/suggestions">
                  <Lightbulb className="mr-3 h-5 w-5" />
                  Suggestions
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start relative"
              >
                <Link to="/notifications">
                  <Bell className="mr-3 h-5 w-5" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/favorites">
                  <Heart className="mr-3 h-5 w-5" />
                  Favorites
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start relative"
              >
                <Link to="/cart">
                  <ShoppingCart className="mr-3 h-5 w-5" />
                  Cart
                  {cartCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              {profile?.account_type !== "buyer" &&
                profile?.seller_status === "approved" && (
                  <Button
                    variant="ghost"
                    size="lg"
                    asChild
                    className="justify-start"
                  >
                    <Link to="/sell" className="text-seller">
                      <Plus className="mr-3 h-5 w-5" />
                      Sell Item
                    </Link>
                  </Button>
                )}

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start relative"
              >
                <Link to="/messages">
                  <MessageCircle className="mr-3 h-5 w-5" />
                  Messages
                  {messagesCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {messagesCount > 99 ? "99+" : messagesCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start relative"
              >
                <Link to="/orders">
                  <Package className="mr-3 h-5 w-5" />
                  Orders
                  {ordersCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {ordersCount > 99 ? "99+" : ordersCount}
                    </Badge>
                  )}
                </Link>
              </Button>

              <div className="border-t my-2" />

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/profile">
                  <User className="mr-3 h-5 w-5" />
                  Profile
                </Link>
              </Button>

              {profile?.account_type !== "buyer" && (
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="justify-start"
                >
                  <Link to="/dashboard">
                    <Shield className="mr-3 h-5 w-5" />
                    Dashboard
                  </Link>
                </Button>
              )}

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="justify-start"
                >
                  <Link to="/admin">
                    <Shield className="mr-3 h-5 w-5" />
                    Admin Panel
                  </Link>
                </Button>
              )}

              {profile?.account_type !== "buyer" && (
                <Button
                  variant="ghost"
                  size="lg"
                  asChild
                  className="justify-start"
                >
                  <Link to="/dashboard?tab=wallet">
                    <svg
                      className="mr-3 h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                      />
                    </svg>
                    Wallet
                  </Link>
                </Button>
              )}

              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start"
              >
                <Link to="/settings">
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </Link>
              </Button>

              <ThemeToggle />

              <div className="border-t my-2" />

              <Button
                variant="ghost"
                size="lg"
                onClick={handleSignOut}
                className="justify-start text-destructive hover:text-destructive"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </nav>
          ) : (
            <nav className="flex flex-col gap-3 mt-auto">
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
    <header className="sticky top-0 z-50 w-full border-b border-primary/10 bg-background/95 backdrop-blur-sm shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Mobile Menu */}
          <MobileNav />

          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-2 flex-shrink-0 hover-lift micro-bounce transition-all duration-200 hover:scale-105"
          >
            <div className="relative">
              <img
                src="/logo.png"
                alt="UniMarket Logo"
                className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-sm object-contain"
              />
              <div className="absolute inset-0 bg-university-green/20 rounded-full blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
            <span className="text-sm sm:text-lg md:text-xl font-bold bg-gradient-to-r from-university-green to-university-green/80 bg-clip-text text-transparent">
              UniMarket
            </span>
          </Link>

          {/* Desktop Search - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4 xl:mx-8">
            <SmartSearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              placeholder="Search products, categories..."
              autoFocus={false}
            />
          </div>

          {/* Mobile Actions - Only show essential items */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Network Status */}
            <NetworkIndicator />

            {/* Theme Toggle - Desktop only */}

            {/* Mobile Search Dialog */}
            <div className="lg:hidden">
              <MobileSearchDialog />
            </div>

            {/* Mobile Cart and Message Icons */}
            {user && (
              <div className="lg:hidden flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative h-9 w-9 sm:h-10 sm:w-10"
                >
                  <Link to="/favorites">
                    <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  className="relative h-9 w-9 sm:h-10 sm:w-10"
                >
                  <Link to="/messages">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    {messagesCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background"
                      >
                        {messagesCount > 99 ? "99+" : messagesCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-muted rounded animate-pulse"></div>
                <div className="h-9 w-16 sm:h-10 sm:w-20 bg-muted rounded animate-pulse"></div>
              </div>
            ) : user ? (
              <>
                {/* Desktop Navigation - Hidden on mobile */}
                <div className="hidden lg:flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to="/marketplace">
                          <Store className="mr-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Marketplace</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative"
                      >
                        <Link to="/notifications">
                          <Bell
                            className="h-5 w-5"
                            style={{
                              WebkitAppearance: "none",
                              appearance: "none",
                            }}
                          />
                          {unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background shadow-sm"
                              style={{
                                WebkitAppearance: "none",
                                appearance: "none",
                                minWidth: "20px",
                                minHeight: "20px",
                              }}
                            >
                              {unreadCount > 99 ? "99+" : unreadCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Notifications</p>
                    </TooltipContent>
                  </Tooltip>
                  {/* Cart - Always visible */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative h-9 w-9 sm:h-10 sm:w-10 hover-lift micro-bounce"
                      >
                        <Link to="/cart">
                          <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 transition-all duration-200" />
                          {cartCount !== undefined && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-background shadow-sm"
                            >
                              {cartCount > 99 ? "99+" : cartCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Shopping Cart</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to="/favorites">
                          <Heart className="h-5 w-5" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Favorites</p>
                    </TooltipContent>
                  </Tooltip>

                  {profile?.account_type !== "buyer" &&
                    profile?.seller_status === "approved" && (
                      <Button variant="seller" size="sm" asChild>
                        <Link to="/sell">
                          <Plus className="mr-1 h-4 w-4" />
                          Sell
                        </Link>
                      </Button>
                    )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative"
                      >
                        <Link to="/messages">
                          <MessageCircle className="h-5 w-5" />
                          {messagesCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background"
                            >
                              {messagesCount > 99 ? "99+" : messagesCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Messages</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        className="relative"
                      >
                        <Link to="/orders">
                          <Package className="h-5 w-5" />
                          {ordersCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background"
                            >
                              {ordersCount > 99 ? "99+" : ordersCount}
                            </Badge>
                          )}
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Orders</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Desktop User Menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        className="relative h-10 w-10 rounded-full"
                      >
                        <Avatar className="h-10 w-10 avatar-stable">
                          <AvatarImage
                            src={profile?.avatar_url}
                            alt={profile?.full_name}
                          />
                          <AvatarFallback className="bg-university-green text-white">
                            {profile?.full_name
                              ? getInitials(profile.full_name)
                              : "U"}
                          </AvatarFallback>
                        </Avatar>
                        {profile?.is_verified && (
                          <div className="verification-tick">
                            <svg fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      align="end"
                      forceMount
                    >
                      <div className="flex items-center justify-start gap-2 p-2">
                        <div className="flex flex-col space-y-0.5 leading-none">
                          <p className="font-medium">{profile?.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {profile?.account_type}
                            </Badge>
                            {profile?.is_verified && (
                              <div className="trust-badge">
                                <div className="verification-badge-inline">
                                  <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                </div>
                                <span className="text-xs font-medium">
                                  Verified
                                </span>
                              </div>
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
                      {profile?.account_type !== "buyer" && (
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
                      <DropdownMenuItem asChild>
                        <Link to="/suggestions">Suggestions</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/sellers">
                          <User className="mr-1 h-4 w-4" />
                          Sellers
                        </Link>
                      </DropdownMenuItem>

                      <DropdownMenuItem asChild>
                        <Link to="/learn-more">Learn More</Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <ThemeToggle />
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
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-9 text-xs sm:h-10 sm:text-sm px-2 sm:px-4 hover-lift micro-bounce"
                >
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  asChild
                  className="h-9 text-xs sm:h-10 sm:text-sm px-2 sm:px-4 hover-lift micro-bounce shadow-sm hover:shadow-md"
                >
                  <Link to="/auth">Join</Link>
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
