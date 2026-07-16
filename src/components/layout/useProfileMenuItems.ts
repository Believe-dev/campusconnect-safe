import { ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Package,
  Heart,
  Shield,
  Lightbulb,
  LogOut,
  Bell,
  LayoutDashboard,
} from "lucide-react";
import { GamesIcon, LearnMoreIcon } from "@/components/ui/heroicons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useOrdersCount } from "@/hooks/useOrdersCount";
import { useNotifications } from "@/contexts/NotificationCountContext";

export interface ProfileMenuItem {
  key: string;
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: number;
  onClick?: () => void;
}

/**
 * Single source of truth for the profile menu's content, shared by the
 * desktop avatar trigger and the mobile "Profile" tab — both open the same
 * full-page ProfileSheet, so there's one item list instead of two.
 *
 * Deliberately account-scoped only: Shop/Live/Chat/Sell are already reachable
 * from the header and bottom nav, so they don't belong here too — repeating
 * them added noise, not access. Wallet and "My Store" are folded into the
 * single promoted `sellerDashboard` entry instead of being separate rows.
 */
export const useProfileMenuItems = () => {
  const { user, isAdmin } = useAuth();
  const { profile } = useProfile();
  const { ordersCount } = useOrdersCount();
  const { unreadCount } = useNotifications();
  const { toast } = useToast();

  const isSeller = profile?.account_type !== "buyer";

  // Rendered as its own promoted card above the list, not a row within it —
  // gated on isSeller (not the stricter "approved" canSell) so a pending
  // seller still has one click back to their dashboard, where
  // SellerRegistrationCard/SellerSubscriptionCard already surface the
  // pending-approval state.
  const sellerDashboard: ProfileMenuItem | null = isSeller
    ? { key: "seller-dashboard", to: "/dashboard", label: "Seller Dashboard", icon: LayoutDashboard }
    : null;

  const primary: ProfileMenuItem[] = [
    { key: "profile", to: "/profile", label: "Profile", icon: User },
    { key: "notifications", to: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { key: "orders", to: "/orders", label: "Orders", icon: Package, badge: ordersCount },
  ];

  const secondary: ProfileMenuItem[] = [
    { key: "saved", to: "/favorites", label: "Saved Items", icon: Heart },
    ...(isAdmin ? [{ key: "admin", to: "/admin", label: "Admin Panel", icon: Shield }] : []),
    { key: "sellers", to: "/sellers", label: "Find Sellers", icon: User },
    { key: "games", to: "/games", label: "UniGames", icon: GamesIcon },
    { key: "learn-more", to: "/learn-more", label: "Learn More", icon: LearnMoreIcon },
    { key: "suggestions", to: "/suggestions", label: "Suggestions", icon: Lightbulb },
  ];

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
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return { user, profile, sellerDashboard, primary, secondary, handleSignOut, SignOutIcon: LogOut };
};
