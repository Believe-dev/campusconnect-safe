import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { generateId } from "@/lib/utils";

export const useLiveFeedNotifications = () => {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const instanceId = useRef(generateId()).current;

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    try {
      // Get user's last visit to live feed from localStorage
      const lastVisit = localStorage.getItem(`liveFeedLastVisit_${user.id}`);
      const lastVisitDate = lastVisit ? new Date(lastVisit) : new Date(0);

      // Count new live feed items since last visit
      const { count, error } = await supabase
        .from("live_feed")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .gt("created_at", lastVisitDate.toISOString())
        .neq("seller_id", user.id); // Don't count user's own posts

      if (error) throw error;

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching live feed unread count:", error);
      setUnreadCount(0);
    }
  }, [user]);

  const markAsRead = useCallback(() => {
    if (!user) return;

    // Update last visit timestamp
    localStorage.setItem(`liveFeedLastVisit_${user.id}`, new Date().toISOString());
    setUnreadCount(0);
  }, [user]);

  useEffect(() => {
    fetchUnreadCount();

    if (!user) return;

    // Set up real-time subscription for new live feed items
    const subscription = supabase
      .channel(`live_feed_notifications_${user.id}_${instanceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_feed" },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    // Refresh count every 5 minutes
    const interval = setInterval(fetchUnreadCount, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user, instanceId, fetchUnreadCount]);

  return { unreadCount, markAsRead };
};