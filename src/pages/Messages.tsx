import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getUnreadCounts } from "@/utils/conversationUtils";
import { MessageTicks } from "@/components/chat/MessageTicks";
import { MessageCircle, Plus, Trash2 } from "lucide-react";
import { PullToRefresh } from "@/components/common/PullToRefresh";

interface Conversation {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id?: string;
  created_at: string;
  product?: {
    title: string;
    price: number;
  };
  other_user?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  last_message?: {
    content: string;
    created_at: string;
    sender_id: string;
  };
  unread_count?: number;
  other_user_last_read_at?: string | null;
}

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [selectedConversationForAction, setSelectedConversationForAction] =
    useState<string | null>(null);
  // Same long-press (mobile) / right-click (desktop) trigger opens this on
  // both breakpoints — WhatsApp's own pattern is choose-an-action-then-
  // confirm, not delete-on-first-tap, so both Clear and Delete route
  // through this confirmation step instead of acting immediately.
  const [pendingAction, setPendingAction] = useState<
    { type: "clear" | "delete"; conversationId: string } | null
  >(null);
  const { toast } = useToast();

  // Mark messages as read and update last read timestamp
  const markMessagesAsRead = async (conversationId: string) => {
    if (!user?.id) return;

    try {
      // Update last read timestamp
      const { error } = await supabase.from("conversation_reads").upsert(
        {
          conversation_id: conversationId,
          user_id: user.id,
          last_read_at: new Date().toISOString(),
        },
        {
          onConflict: "conversation_id,user_id",
        }
      );

      if (error && error.code !== "23505") {
        console.error("Error updating conversation_reads:", error);
        return;
      }

      // Update local state immediately
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
      );
    } catch (error) {
      console.error("Failed to mark messages as read:", error);
    }
  };

  // Clear unread count when navigating to a chat
  const handleChatNavigation = async (conversationId: string) => {
    // Immediately clear the unread count for this conversation
    setConversations((prev) =>
      prev.map((conv) =>
        conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
      )
    );

    // Mark messages as read in database
    await markMessagesAsRead(conversationId);

    navigate(`/chat/${conversationId}`);
  };

  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      setLoadingConversations(false);
      return;
    }

    try {
      // Single optimized query with joins
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id, buyer_id, seller_id, product_id, created_at,
          products (title, price),
          buyer:profiles!conversations_buyer_id_fkey (full_name, avatar_url),
          seller:profiles!conversations_seller_id_fkey (full_name, avatar_url)
        `
        )
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`);

      if (error) throw error;

      if (!data || data.length === 0) {
        setConversations([]);
        setLoadingConversations(false);
        return;
      }

      const convIds = data.map((c) => c.id);

      // Batch fetch last messages
      const { data: lastMessages } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, sender_id, delivered_at")
        .in("conversation_id", convIds)
        .order("created_at", { ascending: false });

      // Single query for unread counts across all conversations instead of
      // one count-query per conversation (was N+1 — e.g. 20 conversations
      // meant 20 extra round trips on every load).
      const unreadCounts = await getUnreadCounts(user.id, convIds);

      // Single batched query for read state across all conversations — RLS
      // scopes conversation_reads by membership, so this returns both
      // participants' rows without a per-conversation round trip. Used to
      // give the last-message tick a real read (blue) state instead of
      // always showing gray.
      const { data: readRows } = await supabase
        .from("conversation_reads")
        .select("conversation_id, user_id, last_read_at")
        .in("conversation_id", convIds);

      const otherUserReadAt: Record<string, string> = {};
      readRows?.forEach((row) => {
        if (row.user_id !== user.id) {
          otherUserReadAt[row.conversation_id] = row.last_read_at;
        }
      });

      // Process conversations
      const processedConversations = data.map((conv) => {
        const otherUser = conv.buyer_id === user.id ? conv.seller : conv.buyer;
        const lastMsg = lastMessages?.find(
          (m) => m.conversation_id === conv.id
        );

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg,
          unread_count: unreadCounts[conv.id] || 0,
          product: conv.products,
          other_user_last_read_at: otherUserReadAt[conv.id] || null,
        };
      });

      // Sort by last message time
      processedConversations.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at;
        const bTime = b.last_message?.created_at || b.created_at;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(processedConversations);
    } catch (error) {
      // Error handled silently
    } finally {
      setLoadingConversations(false);
    }
  }, [user]);

  // Listen for chat opened events and refresh on focus
  useEffect(() => {
    const handleChatOpened = async (event: CustomEvent) => {
      const conversationId = event.detail.conversationId;
      await markMessagesAsRead(conversationId);
    };

    const handleFocus = () => {
      fetchConversations();
    };

    window.addEventListener("chatOpened", handleChatOpened as EventListener);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener(
        "chatOpened",
        handleChatOpened as EventListener
      );
      window.removeEventListener("focus", handleFocus);
    };
  }, [user, fetchConversations]);

  useEffect(() => {
    if (user) {
      fetchConversations();

      // Direct Supabase subscription for immediate updates — this is the
      // list's real live-update path (a separate presence-based path used
      // to also exist here, but it expected payloads OptimizedChat's typing
      // broadcast never actually sent, so it never did anything).
      const channel = supabase
        .channel(`messages_list_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
          },
          (payload) => {
            const newMessage = payload.new;
            setConversations((prev) =>
              prev.map((conv) => {
                if (conv.id === newMessage.conversation_id) {
                  return {
                    ...conv,
                    last_message: {
                      content: newMessage.content,
                      created_at: newMessage.created_at,
                      sender_id: newMessage.sender_id,
                    },
                    unread_count:
                      newMessage.sender_id !== user.id
                        ? (conv.unread_count || 0) + 1
                        : conv.unread_count,
                  };
                }
                return conv;
              })
            );
          }
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "conversations",
          },
          () => fetchConversations()
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [user, fetchConversations]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours =
      Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) throw error;

      setConversations((prev) =>
        prev.filter((conv) => conv.id !== conversationId)
      );
      toast({
        title: "Conversation Deleted",
        description: "The conversation has been deleted successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete conversation. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearChat = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("conversation_id", conversationId);

      if (error) throw error;

      toast({
        title: "Chat Cleared",
        description: "All messages have been cleared",
      });
      fetchConversations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat",
        variant: "destructive",
      });
    }
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;
    if (pendingAction.type === "clear") {
      await clearChat(pendingAction.conversationId);
    } else {
      await deleteConversation(pendingAction.conversationId);
    }
    setPendingAction(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading || loadingConversations) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">Messages</h1>
          </div>
          <div className="divide-y divide-flora-ink/8 bg-white">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 p-4">
                <div className="h-14 w-14 shrink-0 rounded-full bg-flora-chip" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/2 rounded-full bg-flora-chip" />
                  <div className="h-3 w-3/4 rounded-full bg-flora-chip" />
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const unreadTotal = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={fetchConversations} className="min-h-screen">
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
          <div className="mb-6 flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-flora-ink sm:text-3xl">Messages</h1>
            {unreadTotal > 0 && (
              <span className="rounded-full bg-flora-tagBg px-2.5 py-1 text-xs font-semibold text-flora-tagText">
                {unreadTotal} unread
              </span>
            )}
          </div>

          {conversations.length === 0 ? (
            <div className="rounded-3xl bg-white p-10 text-center shadow-card">
              <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-flora-chip text-flora-muted">
                <MessageCircle className="h-6 w-6" />
              </span>
              <h3 className="text-base font-bold text-flora-ink">No conversations yet</h3>
              <p className="mx-auto mt-1 max-w-sm text-sm text-flora-muted">
                Start secure conversations with sellers when you're interested in their products
              </p>
              <a
                href="/marketplace"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-flora-ink px-5 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
              >
                <Plus className="h-4 w-4" />
                Browse Products
              </a>
            </div>
          ) : (
            <div className="divide-y divide-flora-ink/8 bg-white">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="group relative flex cursor-pointer items-center gap-3 p-4 transition hover:bg-flora-chip/40"
                  onClick={() => handleChatNavigation(conversation.id)}
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.currentTarget.dataset.touchStartX = touch.clientX.toString();
                    e.currentTarget.dataset.touchStartY = touch.clientY.toString();
                    // Longer than a typical scroll's initial hold, and
                    // cancelled below on any real movement — was firing
                    // while scrolling past a row since it previously had
                    // no move threshold at all, just a timer.
                    const timer = setTimeout(() => {
                      setSelectedConversationForAction(conversation.id);
                      navigator.vibrate?.(50);
                    }, 700);
                    e.currentTarget.dataset.timer = timer.toString();
                  }}
                  onTouchMove={(e) => {
                    const startX = Number(e.currentTarget.dataset.touchStartX || 0);
                    const startY = Number(e.currentTarget.dataset.touchStartY || 0);
                    const touch = e.touches[0];
                    const movedDistance = Math.hypot(touch.clientX - startX, touch.clientY - startY);
                    if (movedDistance > 10) {
                      const timer = e.currentTarget.dataset.timer;
                      if (timer) clearTimeout(parseInt(timer));
                    }
                  }}
                  onTouchEnd={(e) => {
                    const timer = e.currentTarget.dataset.timer;
                    if (timer) clearTimeout(parseInt(timer));
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setSelectedConversationForAction(conversation.id);
                  }}
                >
                  <Avatar
                    className="h-14 w-14 shrink-0 ring-2 ring-flora-chip transition hover:ring-flora-leaf/30"
                    onClick={(e) => {
                      e.stopPropagation();
                      const otherUserId =
                        conversation.buyer_id === user.id
                          ? conversation.seller_id
                          : conversation.buyer_id;
                      navigate(`/seller/${otherUserId}`);
                    }}
                  >
                    <AvatarImage className="h-full w-full rounded-full object-cover" src={conversation.other_user?.avatar_url} />
                    <AvatarFallback className="bg-flora-leaf font-semibold text-white">
                      {conversation.other_user?.full_name
                        ? getInitials(conversation.other_user.full_name)
                        : "U"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="truncate text-sm font-semibold text-flora-ink sm:text-base">
                          {conversation.other_user?.full_name || "Anonymous User"}
                        </h3>
                        {conversation.other_user?.is_verified && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-500">
                            <svg className="h-2.5 w-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </span>
                        )}
                      </div>
                      {conversation.last_message && (
                        <span className="shrink-0 text-xs text-flora-muted">
                          {formatTime(conversation.last_message.created_at)}
                        </span>
                      )}
                    </div>

                    <p
                      className={`flex items-center gap-1 truncate text-sm ${
                        conversation.unread_count && conversation.unread_count > 0
                          ? "font-medium text-flora-ink"
                          : "text-flora-muted"
                      }`}
                    >
                      {conversation.last_message ? (
                        <>
                          {conversation.last_message.sender_id === user.id && (
                            <MessageTicks
                              message={conversation.last_message}
                              otherUserLastReadAt={conversation.other_user_last_read_at || null}
                              tone="on-light"
                            />
                          )}
                          <span className="truncate">
                            {conversation.last_message.sender_id === user.id ? "You: " : ""}
                            {conversation.last_message.content}
                          </span>
                        </>
                      ) : (
                        <span className="italic text-flora-muted">Start secure conversation</span>
                      )}
                    </p>
                  </div>

                  {conversation.unread_count > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
                      {conversation.unread_count > 99 ? "99+" : conversation.unread_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </PullToRefresh>

      {/* Conversation Actions Modal */}
      {selectedConversationForAction && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-flora-ink/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedConversationForAction(null)}
        >
          <div
            className="w-full max-w-sm animate-in rounded-3xl bg-white p-6 shadow-floating slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-6 text-center text-lg font-bold text-flora-ink">Conversation Actions</h3>
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => {
                  setPendingAction({ type: "clear", conversationId: selectedConversationForAction });
                  setSelectedConversationForAction(null);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-flora-ink/10 px-4 py-3 text-left text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                <span className="text-lg">🧹</span>
                Clear Chat
              </button>
              <button
                type="button"
                onClick={() => {
                  setPendingAction({ type: "delete", conversationId: selectedConversationForAction });
                  setSelectedConversationForAction(null);
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-red-200 px-4 py-3 text-left text-sm font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Delete Conversation
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedConversationForAction(null)}
              className="mt-4 w-full rounded-2xl py-3 text-sm font-medium text-flora-muted transition hover:bg-flora-chip"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm step, same for both mobile (long-press) and desktop
          (right-click) since they both route through the modal above —
          matches WhatsApp's choose-then-confirm delete flow instead of
          acting on the first tap. */}
      <AlertDialog open={!!pendingAction} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.type === "clear" ? "Clear this chat?" : "Delete this conversation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.type === "clear"
                ? "All messages will be removed. This can't be undone."
                : "Messages will be removed for you. This can't be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPendingAction}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {pendingAction?.type === "clear" ? "Clear" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
