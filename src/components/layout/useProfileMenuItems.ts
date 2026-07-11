import { ComponentType } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Package,
  Store,
  Heart,
  Settings,
  Shield,
  Lightbulb,
  LogOut,
  Bell,
  Zap,
  MessageCircle,
  Plus,
  LayoutDashboard,
} from "lucide-react";
import { WalletIcon, GamesIcon, LearnMoreIcon } from "@/components/ui/heroicons";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { useOrdersCount } from "@/hooks/useOrdersCount";
import { useNotifications } from "@/contexts/NotificationCountContext";
import { useLiveFeedNotifications } from "@/hooks/useLiveFeedNotifications";
import { useMessageCount } from "@/contexts/MessageCountContext";

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
 * full-page ProfileSheet now, so there's one item list instead of two
 * (previously a small desktop dropdown vs. a mobile full-page sheet with
 * duplicated content). Shop/Live/Chat/Notifications/Sell moved in here
 * from the desktop header's icon bar, which now only keeps Cart standalone.
 */
export const useProfileMenuItems = () => {
  const { user, isAdmin } = useAuth();
  const { profile } = useProfile();
  const { ordersCount } = useOrdersCount();
  const { unreadCount } = useNotifications();
  const { unreadCount: liveFeedUnreadCount, markAsRead: markLiveFeedAsRead } =
    useLiveFeedNotifications();
  const { messagesCount } = useMessageCount();
  const { toast } = useToast();

  const isSeller = profile?.account_type !== "buyer";
  const canSell = isSeller && profile?.seller_status === "approved";

  const primary: ProfileMenuItem[] = [
    { key: "profile", to: "/profile", label: "Profile", icon: User },
    { key: "shop", to: "/marketplace", label: "Shop", icon: Store },
    {
      key: "live",
      to: "/live-feed",
      label: "Live",
      icon: Zap,
      badge: liveFeedUnreadCount,
      onClick: markLiveFeedAsRead,
    },
    { key: "chat", to: "/messages", label: "Chat", icon: MessageCircle, badge: messagesCount },
    { key: "notifications", to: "/notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { key: "orders", to: "/orders", label: "Orders", icon: Package, badge: ordersCount },
    ...(canSell ? [{ key: "sell", to: "/sell", label: "Sell", icon: Plus }] : []),
  ];

  const secondary: ProfileMenuItem[] = [
    ...(isSeller
      ? [{ key: "store", to: "/dashboard", label: "My Store", icon: LayoutDashboard }]
      : []),
    { key: "saved", to: "/favorites", label: "Saved Items", icon: Heart },
    { key: "settings", to: "/settings", label: "Settings", icon: Settings },
    ...(isAdmin ? [{ key: "admin", to: "/admin", label: "Admin Panel", icon: Shield }] : []),
    ...(isSeller
      ? [{ key: "wallet", to: "/dashboard?tab=wallet", label: "Wallet", icon: WalletIcon }]
      : []),
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

  return { user, profile, primary, secondary, handleSignOut, SignOutIcon: LogOut };
};
