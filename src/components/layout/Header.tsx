import { useState, useEffect } from "react";
import { TestNotificationButton } from "@/components/notifications/TestNotificationButton";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/enhanced-button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Lightbulb,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCartCount } from "@/hooks/useCartCount";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useNotifications } from "@/hooks/useNotifications";
import { useOrdersCount } from "@/hooks/useOrdersCount";
import { useMessageCount } from "@/contexts/MessageCountContext";
import { useLiveFeedNotifications } from "@/hooks/useLiveFeedNotifications";
import { useProfile } from "@/contexts/ProfileContext";
import { useRealTimeUpdates } from "@/hooks/useRealTimeUpdates";
import SmartSearchInput from "@/components/search/SmartSearchInput";
import MobileExpandableSearch from "@/components/search/MobileExpandableSearch";
import { PremiumGameBadge } from "@/components/games/PremiumGameBadge";

interface Profile {
  full_name: string;
  is_verified: boolean;
  account_type: string;
  verification_status?: string;
  avatar_url?: string;
}

interface GameBadgeData {
  overall_level: number;
  badge_type: "bronze" | "silver" | "gold" | "none";
  is_premium: boolean;
}

const Header = () => {
  const { user, isAdmin, loading } = useAuth();
  const { profile } = useProfile();
  const location = useLocation();
  const { cartCount } = useCartCount();
  const { isOnline, isSlowConnection } = useNetworkStatus();
  const { unreadCount } = useNotifications();
  const { ordersCount } = useOrdersCount();
  const { messagesCount } = useMessageCount();
  const { unreadCount: liveFeedUnreadCount, markAsRead: markLiveFeedAsRead } =
    useLiveFeedNotifications();
  const [searchQuery, setSearchQuery] = useState("");
  const [gameBadge, setGameBadge] = useState<GameBadgeData | null>(null);

  const navigate = useNavigate();
  const { toast } = useToast();

  // Enable real-time updates
  useRealTimeUpdates();

  const fetchGameBadge = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_game_badge", {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setGameBadge(data[0]);
      }
    } catch (error) {
      console.error("Error fetching game badge:", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGameBadge();
    }
  }, [user]);

  // Hide header on chat pages
  if (location.pathname.startsWith("/chat/")) {
    return null;
  }

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
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-6 w-6 sm:h-7 sm:w-7 p-0 gap-0 rounded-md"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="mobile-sheet w-full sm:w-96 md:w-[28rem] lg:w-80 h-full flex flex-col bg-white"
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

        <div className="flex flex-col gap-4 mt-6 flex-1 overflow-y-auto scrollbar-thin pb-4 min-h-0">
          {/* Network Status */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <span className="text-sm font-medium text-muted-foreground">
              Connection
            </span>
            <NetworkIndicator />
          </div>

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
              <Button
                variant="ghost"
                size="lg"
                asChild
                className="justify-start relative"
              >
                <Link to="/live-feed" onClick={markLiveFeedAsRead}>
                  <Zap className="mr-3 h-5 w-5" />
                  Live Feed
                  {liveFeedUnreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="ml-auto h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white"
                    >
                      {liveFeedUnreadCount > 99 ? "99+" : liveFeedUnreadCount}
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
                <Link to="/games">
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
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                    />
                  </svg>
                  UniGames
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
                className="justify-start"
              >
                <Link to="/settings">
                  <Settings className="mr-3 h-5 w-5" />
                  Settings
                </Link>
              </Button>

              <div className="border-t my-2" />

              <Button
                variant="ghost"
                size="lg"
                onClick={handleSignOut}
                className="justify-start text-destructive"
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
    <header className="force-fixed-header">
      <div className="bg-white border-b border-primary/10">
        <div className="container mx-auto px-2">
          <div className="flex h-16 items-center justify-between">
            {/* Mobile Menu */}
            <MobileNav />

            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 flex-shrink-0 micro-bounce transition-all duration-200"
            >
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="UniMarket Logo"
                  className="h-6 w-6 sm:h-7 sm:w-7 drop-shadow-sm object-contain"
                />
                <div className="absolute inset-0 bg-university-green/20 rounded-full blur-lg opacity-0 transition-opacity duration-300"></div>
              </div>
              <span className="text-sm sm:text-base font-bold bg-gradient-to-r from-university-green to-university-green/80 bg-clip-text text-transparent">
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
            <div className="flex items-center gap-0 sm:gap-0.5 md:gap-1">
              {/* Mobile Search */}
              <div className="lg:hidden">
                <MobileExpandableSearch />
              </div>

              {/* Mobile Cart and Message Icons */}
              {user && (
                <div className="lg:hidden flex items-center -space-x-2 sm:-space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 gap-0 rounded-md"
                  >
                    <Link to="/notifications">
                      <Bell className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      {unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full bg-red-500 text-white border border-background"
                        >
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                  {/* Cart for sellers, Favorites for buyers */}
                  {profile?.account_type !== "buyer" ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 gap-0 rounded-md"
                    >
                      <Link to="/cart">
                        <ShoppingCart className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                        {cartCount > 0 && (
                          <Badge
                            variant="destructive"
                            className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full bg-red-500 text-white border border-background"
                          >
                            {cartCount > 99 ? "99+" : cartCount}
                          </Badge>
                        )}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 gap-0 rounded-md"
                    >
                      <Link to="/favorites">
                        <Heart className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      </Link>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="relative h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 p-0 gap-0 rounded-md"
                  >
                    <Link to="/messages">
                      <MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                      {messagesCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full bg-red-500 text-white border border-background"
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
                          <Link to="/live-feed" onClick={markLiveFeedAsRead}>
                            <Zap className="h-5 w-5" />
                            {liveFeedUnreadCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border-2 border-background shadow-sm"
                              >
                                {liveFeedUnreadCount > 99
                                  ? "99+"
                                  : liveFeedUnreadCount}
                              </Badge>
                            )}
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Live Feed</p>
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
                          className="relative h-7 w-7 sm:h-8 sm:w-8 p-0.5 micro-bounce"
                        >
                          <Link to="/cart">
                            <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-all duration-200" />
                            {cartCount > 0 && (
                              <Badge
                                variant="destructive"
                                className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center p-0 text-[10px] font-bold rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white border border-background shadow-sm"
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
                          className="relative h-12 w-auto min-w-16 rounded-full px-2 hover:bg-primary/5 transition-all duration-200 focus:ring-2 focus:ring-primary/20 focus:ring-offset-2"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-10 w-10 avatar-stable ring-2 ring-primary/10 hover:ring-primary/20 transition-all duration-200">
                              <AvatarImage
                                src={profile?.avatar_url}
                                alt={profile?.full_name}
                              />
                              <AvatarFallback className="bg-university-green text-white font-semibold">
                                {profile?.full_name
                                  ? getInitials(profile.full_name)
                                  : "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="hidden xl:flex flex-col items-start text-left">
                              <span className="text-sm font-medium text-foreground truncate max-w-24">
                                {profile?.full_name?.split(" ")[0] || "User"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {profile?.account_type}
                              </span>
                            </div>
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
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-64 py-2 shadow-lg border border-primary/10"
                        align="end"
                        sideOffset={8}
                        forceMount
                      >
                        <div className="flex items-center justify-start gap-3 p-3 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg mx-2 mb-2">
                          <Avatar className="h-12 w-12 avatar-stable ring-2 ring-primary/20">
                            <AvatarImage
                              src={profile?.avatar_url}
                              alt={profile?.full_name}
                            />
                            <AvatarFallback className="bg-university-green text-white font-semibold">
                              {profile?.full_name
                                ? getInitials(profile.full_name)
                                : "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col space-y-1 leading-none flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">
                              {profile?.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge
                                variant="outline"
                                className="text-xs px-2 py-0.5 bg-white/50"
                              >
                                {profile?.account_type}
                              </Badge>
                              {profile?.is_verified && (
                                <div className="trust-badge">
                                  <div className="verification-badge-inline">
                                    <svg
                                      fill="currentColor"
                                      viewBox="0 0 20 20"
                                    >
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
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link
                            to="/profile"
                            className="flex items-center gap-3"
                          >
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-medium">Profile</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link to="/games" className="flex items-center gap-3">
                            <svg
                              className="h-4 w-4 text-primary"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                              />
                            </svg>
                            <span className="font-medium">UniGames</span>
                          </Link>
                        </DropdownMenuItem>
                        {profile?.account_type !== "buyer" && (
                          <DropdownMenuItem
                            asChild
                            className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                          >
                            <Link
                              to="/dashboard"
                              className="flex items-center gap-3"
                            >
                              <Shield className="h-4 w-4 text-primary" />
                              <span className="font-medium">Dashboard</span>
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {isAdmin && (
                          <DropdownMenuItem
                            asChild
                            className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                          >
                            <Link
                              to="/admin"
                              className="flex items-center gap-3"
                            >
                              <Shield className="h-4 w-4 text-primary" />
                              <span className="font-medium">Admin Panel</span>
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link
                            to="/settings"
                            className="flex items-center gap-3"
                          >
                            <Settings className="h-4 w-4 text-primary" />
                            <span className="font-medium">Settings</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 mx-2" />
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link
                            to="/suggestions"
                            className="flex items-center gap-3"
                          >
                            <Lightbulb className="h-4 w-4 text-primary" />
                            <span className="font-medium">Suggestions</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link
                            to="/sellers"
                            className="flex items-center gap-3"
                          >
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-medium">Find Sellers</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          asChild
                          className="py-2.5 px-3 hover:bg-primary/5 transition-colors"
                        >
                          <Link
                            to="/learn-more"
                            className="flex items-center gap-3"
                          >
                            <img
                              src="/logo.png"
                              alt="UniMarket Logo"
                              className="h-4 w-4 object-contain"
                            />
                            <span className="font-medium">Learn More</span>
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-2 mx-2" />
                        <DropdownMenuItem
                          onClick={handleSignOut}
                          className="py-2.5 px-3 hover:bg-destructive/10 text-destructive hover:text-destructive transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <LogOut className="h-4 w-4" />
                            <span className="font-medium">Sign Out</span>
                          </div>
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
                    className="h-9 text-xs sm:h-10 sm:text-sm px-2 sm:px-4 micro-bounce"
                  >
                    <Link to="/auth">Sign In</Link>
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    asChild
                    className="h-9 text-xs sm:h-10 sm:text-sm px-2 sm:px-4 micro-bounce shadow-sm"
                  >
                    <Link to="/auth">Join</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
