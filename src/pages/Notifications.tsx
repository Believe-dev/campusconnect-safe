import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Bell,
  Check,
  CheckCheck,
  Settings,
  Package,
  Wallet,
  CreditCard,
  Store,
  MessageCircle,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isYesterday, isThisWeek } from "date-fns";
import { PullToRefresh } from "@/components/common/PullToRefresh";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, typeof Bell> = {
  success: CheckCircle2,
  subscription_activated: CheckCircle2,
  seller_approved: Store,
  seller: Store,
  warning: AlertTriangle,
  subscription_expiring: AlertTriangle,
  error: AlertCircle,
  subscription_expired: AlertCircle,
  order: Package,
  order_shipped: Package,
  order_delivered: Package,
  payment: Wallet,
  payout: Wallet,
  subscription: CreditCard,
  message: MessageCircle,
};

const TYPE_TONE: Record<string, string> = {
  success: "bg-flora-tagBg text-flora-tagText",
  subscription_activated: "bg-flora-tagBg text-flora-tagText",
  seller_approved: "bg-flora-tagBg text-flora-tagText",
  warning: "bg-amber-50 text-amber-600",
  subscription_expiring: "bg-amber-50 text-amber-600",
  error: "bg-red-50 text-red-600",
  subscription_expired: "bg-red-50 text-red-600",
};

const TYPE_LABEL: Record<string, string> = {
  order: "Orders",
  order_shipped: "Order shipped",
  order_delivered: "Order delivered",
  payment: "Payment",
  payout: "Payout",
  seller: "Seller",
  seller_approved: "Seller",
  subscription: "Subscription",
  subscription_expiring: "Subscription",
  subscription_expired: "Subscription",
  subscription_activated: "Subscription",
  warning: "Warning",
  error: "Alert",
};

const getTypeIcon = (type: string) => TYPE_ICON[type] || Bell;
const getTypeTone = (type: string) =>
  TYPE_TONE[type] || "bg-flora-chip text-flora-ink";
// No fallback string — generic notifications (success/info) just show the
// date/time with no category tag, instead of a label ("Update") that
// repeated no information the title and message didn't already say.
const getTypeLabel = (type: string) => TYPE_LABEL[type];

interface Tab {
  key: string;
  label: string;
  types?: string[];
}

const TABS: Tab[] = [
  { key: "all", label: "All" },
  {
    key: "orders",
    label: "Orders",
    types: ["order", "order_shipped", "order_delivered"],
  },
  { key: "payments", label: "Payments", types: ["payment", "payout"] },
  {
    key: "seller",
    label: "Seller",
    types: [
      "seller",
      "seller_approved",
      "subscription",
      "subscription_expiring",
      "subscription_expired",
      "subscription_activated",
    ],
  },
  {
    key: "account",
    label: "Account",
    types: ["success", "warning", "error", "info"],
  },
];

type Group = "Today" | "Yesterday" | "This week" | "Earlier";
const GROUP_ORDER: Group[] = ["Today", "Yesterday", "This week", "Earlier"];

const groupOf = (createdAt: string): Group => {
  const date = new Date(createdAt);
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  if (isThisWeek(date, { weekStartsOn: 1 })) return "This week";
  return "Earlier";
};

export default function Notifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<
    Set<string>
  >(new Set());
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (user) {
      fetchNotifications();

      const channel = supabase
        .channel("notifications-changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id},type=neq.message`,
          },
          () => {
            fetchNotifications();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user?.id) {
      setLoadingNotifications(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .neq("type", "message")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        if (
          error.code === "42P01" ||
          error.message?.includes("relation") ||
          error.message?.includes("does not exist")
        ) {
          console.warn(
            "Notifications table not found, creating welcome notification",
          );
          await createWelcomeNotification();
          return;
        }

        if (
          error.code === "42501" ||
          error.message?.includes("permission denied")
        ) {
          console.warn("Permission denied for notifications table");
          setNotifications([]);
          return;
        }

        if (
          error.code === "23514" ||
          error.message?.includes("check constraint")
        ) {
          console.warn("Constraint violation in notifications table");
          setNotifications([]);
          return;
        }

        throw error;
      }

      setNotifications(data || []);

      if (!data || data.length === 0) {
        await createWelcomeNotification();
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      if (
        !error.message?.includes("relation") &&
        !error.message?.includes("permission")
      ) {
        toast.error(`Failed to load notifications: ${error.message}`);
      }
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const createWelcomeNotification = async () => {
    if (!user?.id) return;

    try {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert({
          user_id: user.id,
          title: "Welcome to UniMarket! 🎉",
          message:
            "Your notification system is working! You'll receive updates about orders, messages, and account activities here.",
          type: "success",
        });

      if (insertError) {
        console.warn("Could not create welcome notification:", insertError);
      } else {
        setTimeout(fetchNotifications, 1000);
      }
    } catch (error) {
      console.warn("Error creating welcome notification:", error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", user?.id);

      if (error) {
        console.error("Error marking notification as read:", error);
        return;
      }

      setNotifications((prev) =>
        prev.map((notif) =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif,
        ),
      );

      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
    } catch (error) {
      console.error("Error in markAsRead:", error);
      toast.error("Failed to update notification");
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.is_read) {
      setExpandedNotifications((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(notification.id)) {
          newSet.delete(notification.id);
        } else {
          newSet.add(notification.id);
        }
        return newSet;
      });
      return;
    }

    markAsRead(notification.id);

    if (
      notification.type === "order_shipped" ||
      notification.type === "order_delivered"
    ) {
      navigate("/orders");
    } else if (notification.type === "seller_approved") {
      navigate("/dashboard");
    } else if (
      notification.type === "success" &&
      notification.title.includes("Payout")
    ) {
      navigate("/wallet");
    } else if (
      notification.type === "warning" &&
      notification.title.includes("Payout")
    ) {
      navigate("/wallet");
    } else if (
      notification.type === "subscription_expiring" ||
      notification.type === "subscription_expired"
    ) {
      navigate("/dashboard");
    } else if (notification.message.toLowerCase().includes("subscription")) {
      navigate("/dashboard");
    } else if (notification.message.toLowerCase().includes("order")) {
      navigate("/orders");
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        toast.error("Failed to update notifications");
        return;
      }

      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, is_read: true })),
      );
      window.dispatchEvent(new CustomEvent("notificationsUpdated"));
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error in markAllAsRead:", error);
      toast.error("Failed to update notifications");
    }
  };

  const handleRefresh = useCallback(async () => {
    await fetchNotifications();
  }, [user]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const visibleNotifications = useMemo(() => {
    const tab = TABS.find((t) => t.key === activeTab);
    if (!tab?.types) return notifications;
    return notifications.filter((n) => tab.types.includes(n.type));
  }, [notifications, activeTab]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<Group, Notification[]> = {
      Today: [],
      Yesterday: [],
      "This week": [],
      Earlier: [],
    };
    for (const notification of visibleNotifications) {
      groups[groupOf(notification.created_at)].push(notification);
    }
    return groups;
  }, [visibleNotifications]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="mx-auto max-w-2xl px-4 py-8 text-center text-flora-muted">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-flora-muted">
                Stay updated on orders, payments, and your account.
              </p>
            </div>
            <Link
              to="/settings"
              aria-label="Notification settings"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-flora-ink transition hover:bg-flora-chip">
              <Settings className="h-5 w-5" />
            </Link>
          </div>

          {/* Same chip-row pattern as the Marketplace filters: a horizontally
              scrollable row of pills, the active one filled dark, the rest
              bordered and light. */}
          <div className="mb-3 flex gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-medium leading-none transition ${
                  activeTab === tab.key
                    ? "bg-flora-ink text-white"
                    : "border border-flora-ink/10 bg-white/70 text-flora-ink hover:bg-white"
                }`}>
                {tab.label}
                {tab.key === "all" && unreadCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                      activeTab === "all"
                        ? "bg-white/20 text-white"
                        : "bg-red-500 text-white"
                    }`}>
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {unreadCount > 0 && (
            <div className="mb-6 flex justify-end">
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-flora-ink transition hover:text-flora-leaf">
                <CheckCheck className="h-4 w-4" />
                Mark all as read
              </button>
            </div>
          )}

          {loadingNotifications ? (
            <div className="space-y-2.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-2xl bg-flora-chip/50 p-3.5">
                  <div className="flex gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-full bg-flora-chip" />
                    <div className="flex-1 space-y-2 py-1">
                      <div className="h-3.5 w-1/2 rounded-full bg-flora-chip" />
                      <div className="h-3 w-3/4 rounded-full bg-flora-chip" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : visibleNotifications.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-card">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip text-flora-muted">
                <Bell className="h-6 w-6" />
              </span>
              <h3 className="text-base font-bold text-flora-ink">
                No notifications yet
              </h3>
              <p className="mt-1 text-sm text-flora-muted">
                Updates about your orders, payments, and account will show up
                here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {GROUP_ORDER.map((group) => {
                const items = groupedNotifications[group];
                if (items.length === 0) return null;
                return (
                  <div key={group}>
                    <h2 className="mb-2.5 px-1 text-sm font-medium text-flora-muted">
                      {group}
                    </h2>
                    <div className="space-y-2.5">
                      {items.map((notification, index) => {
                        const Icon = getTypeIcon(notification.type);
                        const expanded = expandedNotifications.has(
                          notification.id,
                        );
                        const created = new Date(notification.created_at);
                        return (
                          <div
                            key={notification.id}
                            style={{
                              animationDelay: `${Math.min(index, 8) * 40}ms`,
                              animationFillMode: "backwards",
                            }}
                            className={`flex animate-in items-start gap-1 rounded-2xl bg-white shadow-card fade-in slide-in-from-bottom-1 duration-300 ${
                              notification.is_read
                                ? ""
                                : "ring-1 ring-flora-leaf/20"
                            }`}>
                            {/* Own clickable element, not a wrapper around the
                                action buttons below — sibling interactive
                                controls instead of nested ones, so there's no
                                click-through/propagation race between "open
                                this notification" and "act on it". */}
                            <button
                              type="button"
                              onClick={() =>
                                handleNotificationClick(notification)
                              }
                              className="flex min-w-0 flex-1 items-start gap-3 p-3.5 text-left">
                              <span
                                className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${getTypeTone(
                                  notification.type,
                                )}`}>
                                <Icon className="h-5 w-5" />
                                {!notification.is_read && (
                                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-flora-leafBright ring-2 ring-white" />
                                )}
                              </span>

                              <div className="min-w-0 flex-1">
                                <p
                                  className={`text-sm text-flora-ink ${
                                    notification.is_read
                                      ? "font-medium"
                                      : "font-bold"
                                  } ${expanded ? "" : "line-clamp-2"}`}>
                                  {notification.title}
                                </p>
                                <p
                                  className={`mt-0.5 text-sm text-flora-muted ${
                                    expanded ? "" : "line-clamp-1"
                                  }`}>
                                  {notification.message}
                                </p>
                                <p className="mt-1.5 text-xs text-flora-muted">
                                  {getTypeLabel(notification.type) && (
                                    <>
                                      <span className="font-semibold text-flora-ink">
                                        {getTypeLabel(notification.type)}
                                      </span>
                                      {" - "}
                                    </>
                                  )}
                                  {format(created, "MMM d, yyyy")}
                                  <span className="mx-1.5 inline-block h-1 w-1 rounded-full bg-flora-muted/50 align-middle" />
                                  {format(created, "h:mm a")}
                                </p>
                              </div>
                            </button>

                            {/* Notifications are a record, not a to-do list —
                                no delete. Mark-as-read is the only action, so
                                it sits directly on the row instead of behind
                                a menu. */}
                            {!notification.is_read && (
                              <div className="flex shrink-0 items-center p-3.5 pl-0">
                                <button
                                  type="button"
                                  aria-label="Mark as read"
                                  onClick={() => markAsRead(notification.id)}
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-flora-muted transition hover:bg-flora-chip hover:text-flora-ink">
                                  <Check className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </PullToRefresh>
    </div>
  );
}
