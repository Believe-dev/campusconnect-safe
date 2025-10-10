import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Home,
  Package,
  Heart,
  MessageCircle,
  Store,
  User,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useCartCount } from "@/hooks/useCartCount";
import { useAuth } from "@/hooks/useAuth";
import { useUniMarketNavigation } from "@/hooks/useUniMarketNavigation";

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCartCount();
  const { goToMarketplace, goToOrders, goToLiveFeed, goToCart, goToProfile } =
    useUniMarketNavigation();
  const [isScrolled, setIsScrolled] = useState(false);

  // Hide bottom nav only on chat pages
  const isInChat = location.pathname.startsWith("/chat/");

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!user || isInChat) return null;

  const GamepadIcon = () => (
    <svg
      className="h-5 w-5"
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
  );

  const navItems = [
    {
      to: "/marketplace",
      icon: Store,
      label: "Shop",
      onClick: goToMarketplace,
    },
    { to: "/orders", icon: Package, label: "Orders", onClick: goToOrders },
    { to: "/live-feed", icon: Zap, label: "Live", onClick: goToLiveFeed },
    {
      to: "/cart",
      icon: ShoppingCart,
      label: "Cart",
      badge: cartCount,
      onClick: goToCart,
    },
    { to: "/profile", icon: User, label: "Profile", onClick: goToProfile },
  ];

  return (
    /*
     * Fixed bottom navigation - always visible at bottom of viewport
     * Uses position: fixed with bottom: 0 to stay at screen bottom
     * z-index: 1050 ensures it appears above other content
     * Content padding prevents overlap with scrollable content
     */
    <nav className="force-fixed-bottom px-2 transition-all duration-300 ease-out">
      <div
        className={`transition-all duration-300 ease-out ${
          isScrolled
            ? "bg-white/90 backdrop-blur-md border border-primary/20 rounded-xl shadow-lg mx-1 mb-2"
            : "bg-white border-t border-gray-200 shadow-sm "
        }`}
        style={{
          /* Add safe area padding for devices with home indicators */
          paddingBottom: isScrolled
            ? "8px"
            : "max(8px, env(safe-area-inset-bottom))",
          /* Ensure minimum height for touch targets */
          minHeight: "64px",
        }}
      >
        {/* Navigation items container with proper spacing */}
        <div className="flex justify-around items-center py-2 px-1">
          {navItems.map(({ to, icon: Icon, label, badge, onClick }) => {
            const isActive =
              location.pathname === to ||
              (to === "/marketplace" &&
                location.pathname.startsWith("/marketplace"));

            return (
              <button
                key={to}
                onClick={onClick}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg min-w-0 flex-1 relative transition-all duration-200",
                  isActive ? "text-university-green" : "text-gray-500"
                )}
              >
                <div className="relative">
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-all duration-200",
                      isActive ? "text-university-green" : "text-gray-500"
                    )}
                    style={{ WebkitAppearance: "none", appearance: "none" }}
                  />
                  {badge !== undefined && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-red-500 text-white border border-white shadow-sm notification-badge"
                      style={{
                        WebkitAppearance: "none",
                        appearance: "none",
                        minWidth: "16px",
                        minHeight: "16px",
                      }}
                    >
                      {badge > 99 ? "99+" : badge}
                    </Badge>
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs font-medium truncate w-full text-center transition-all duration-200",
                    isActive
                      ? "text-university-green font-semibold"
                      : "text-gray-500"
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
