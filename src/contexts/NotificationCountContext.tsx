import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface NotificationCountContextType {
  unreadCount: number;
  refetch: () => void;
}

const NotificationCountContext = createContext<NotificationCountContextType | undefined>(
  undefined
);

// Was a plain hook (useNotifications) that every consumer called
// independently — Header's own bell and useProfileMenuItems (rendered by
// both Header's and BottomNav's ProfileSheet) each ran their own instance.
// Every instance subscribed to a Supabase channel named identically
// (`notifications-${user.id}`, no per-instance suffix), so with 2-3 live
// instances on any logged-in page, they were competing for the same
// channel name — the same class of bug CartCountContext replaced, just
// showing up as a channel collision instead of a global-function
// overwrite. One provider means one subscription, one piece of state.
export const NotificationCountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false)
        .neq("type", "message"); // Exclude message notifications from count

      if (error) {
        console.warn("Error fetching notification count:", error);
        setUnreadCount(0);
        return;
      }

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Unexpected error fetching notification count:", error);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    fetchUnreadCount();

    const channel = supabase
      .channel(`notifications_count_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Notifications.tsx (mark as read), the OneSignal push integration, and
    // a couple of realtime/test helpers all dispatch this after touching
    // notifications outside this context, so it still needs a listener.
    const handleNotificationUpdate = () => fetchUnreadCount();
    window.addEventListener("notificationsUpdated", handleNotificationUpdate);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("notificationsUpdated", handleNotificationUpdate);
    };
  }, [user]);

  return (
    <NotificationCountContext.Provider value={{ unreadCount, refetch: fetchUnreadCount }}>
      {children}
    </NotificationCountContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationCountContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationCountProvider");
  }
  return context;
};
