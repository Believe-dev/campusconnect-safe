import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  showMessageNotification,
  showInfoNotification,
} from "@/utils/popupNotifications";

export const useRealTimeUpdates = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    subscriberCount++;

    // Subscribe to cart changes (singleton)
    if (!sharedCartChannel) {
      sharedCartChannel = supabase.channel(`cart:updates:${user.id}`);
      sharedCartChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cart",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          window.dispatchEvent(new CustomEvent("cartUpdated"));
        },
      );
      sharedCartChannel.subscribe();
    }

    // Subscribe to order changes (singleton)
    if (!sharedOrderChannel) {
      sharedOrderChannel = supabase.channel(`orders:updates:${user.id}`);
      sharedOrderChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          window.dispatchEvent(new CustomEvent("ordersUpdated"));
        },
      );
      sharedOrderChannel.subscribe();
    }

    // Subscribe to message changes (singleton)
    if (!sharedMessageChannel) {
      sharedMessageChannel = supabase.channel(`messages:updates:${user.id}`);
      sharedMessageChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          window.dispatchEvent(new CustomEvent("messagesUpdated"));

          if (payload.new && payload.new.sender_id !== user.id) {
            showMessageNotification(
              "New Message",
              "You have received a new message",
            );
          }
        },
      );
      sharedMessageChannel.subscribe();
    }

    // Subscribe to notification changes (singleton)
    if (!sharedNotificationChannel) {
      sharedNotificationChannel = supabase.channel(
        `notifications:updates:${user.id}`,
      );
      sharedNotificationChannel.on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          window.dispatchEvent(new CustomEvent("notificationsUpdated"));

          if (payload.new) {
            const title = payload.new.title || "Notification";
            const message =
              payload.new.message || "You have a new notification";

            sendNativeNotification(title, message, {
              type: payload.new.type,
              action_url: payload.new.action_url,
              notification_id: payload.new.id,
            });

            showInfoNotification(title, message, payload.new.action_url);
          }
        },
      );
      sharedNotificationChannel.subscribe();
    }

    return () => {
      cartSubscription.unsubscribe();
      orderSubscription.unsubscribe();
      messageSubscription.unsubscribe();
      notificationSubscription.unsubscribe();
    };
  }, [user]);
};
