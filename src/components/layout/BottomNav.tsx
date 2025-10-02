import { Link, useLocation } from "react-router-dom";
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

const BottomNav = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { cartCount } = useCartCount();

  // Hide bottom nav only on chat pages
  const isInChat = location.pathname.startsWith("/chat/");

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
    { to: "/marketplace", icon: Store, label: "Shop" },
    { to: "/orders", icon: Package, label: "Orders" },
    { to: "/live-feed", icon: Zap, label: "Live" },
    { to: "/cart", icon: ShoppingCart, label: "Cart", badge: cartCount },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-primary/10 shadow-lg"
      style={{ position: "fixed", bottom: 0 }}
    >
      <div className="flex justify-around items-center py-2 px-1 safe-area-pb">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const isActive =
            location.pathname === to ||
            (to === "/marketplace" &&
              location.pathname.startsWith("/marketplace"));

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
                <Icon
                  className={cn(
                    "h-5 w-5 transition-all duration-200",
                    isActive ? "drop-shadow-sm" : ""
                  )}
                  style={{ WebkitAppearance: "none", appearance: "none" }}
                />
                {badge !== undefined && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 w-4 flex items-center justify-center p-0 text-xs font-bold rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white border-2 border-background shadow-sm notification-badge"
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
                  isActive ? "font-semibold" : ""
                )}
              >
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
