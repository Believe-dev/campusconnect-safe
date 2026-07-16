import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOptimisticMessages } from "@/hooks/useOptimisticMessages";
import { useRealTime } from "@/contexts/RealTimeContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker } from "@/components/chat/EmojiPicker";
import { MessageTicks } from "@/components/chat/MessageTicks";
import {
  Send,
  Shield,
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Trash2,
  Smile,
  ChevronLeft,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMessageCount } from "@/contexts/MessageCountContext";
import { useUniMarketNavigation } from "@/hooks/useUniMarketNavigation";

interface OptimizedChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  otherUserId?: string | null;
  initialDraft?: string;
  onClose?: () => void;
}

const OptimizedChat: React.FC<OptimizedChatProps> = ({
  conversationId,
  currentUserId,
  otherUser,
  otherUserId,
  initialDraft,
  onClose,
}) => {
  const [newMessage, setNewMessage] = useState(initialDraft || "");
  const [isTyping, setIsTyping] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<
    string | null
  >(null);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const otherTypingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { broadcastPresence, subscribeToPresence } = useRealTime();
  const { decreaseCount } = useMessageCount();
  const { goToSeller } = useUniMarketNavigation();

  const {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    retryAllFailed,
    hasFailedMessages,
    otherUserLastReadAt,
  } = useOptimisticMessages({ conversationId, currentUserId, otherUserId });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Dispatch chat opened event immediately when component mounts
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("chatOpened", {
        detail: { conversationId },
      })
    );
  }, [conversationId]);

  // Mark all unread messages as read immediately when chat opens
  useEffect(() => {
    if (!loading && messages.length > 0) {
      const unreadMessages = messages
        .filter((msg) => msg.sender_id !== currentUserId && !msg.is_read)
        .map((msg) => msg.id);

      if (unreadMessages.length > 0) {
        // Mark as read immediately when chat opens
        markAsRead(unreadMessages);
        // Decrease the count in the header
        decreaseCount(unreadMessages.length);
      }
    }
  }, [loading, messages, currentUserId, markAsRead, decreaseCount]);

  // Mark new incoming messages as read automatically
  useEffect(() => {
    const latestMessage = messages[messages.length - 1];
    if (
      latestMessage &&
      latestMessage.sender_id !== currentUserId &&
      !latestMessage.is_read &&
      !latestMessage._isOptimistic
    ) {
      markAsRead([latestMessage.id]);
      // Decrease count by 1 for the new message that was just read
      decreaseCount(1);
    }
  }, [messages, currentUserId, markAsRead, decreaseCount]);

  // Listen for the other participant's typing broadcasts.
  useEffect(() => {
    const unsubscribe = subscribeToPresence(conversationId, (presence) => {
      if (presence._left) return;
      if (otherTypingTimeoutRef.current) {
        clearTimeout(otherTypingTimeoutRef.current);
      }
      setOtherUserTyping(!!presence.typing);
      if (presence.typing) {
        // Safety timeout in case a "stopped typing" broadcast is dropped.
        otherTypingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 4000);
      }
    });

    return () => {
      unsubscribe();
      if (otherTypingTimeoutRef.current) clearTimeout(otherTypingTimeoutRef.current);
    };
  }, [conversationId, subscribeToPresence]);

  // Handle typing indicators
  const handleTyping = useCallback(
    (value: string) => {
      setNewMessage(value);

      if (!isTyping && value.trim()) {
        setIsTyping(true);
        broadcastPresence(conversationId, { typing: true, conversation_id: conversationId });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        broadcastPresence(conversationId, { typing: false, conversation_id: conversationId });
      }, 2000);
    },
    [isTyping, broadcastPresence, conversationId]
  );

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage("");
    setIsTyping(false);
    broadcastPresence(conversationId, { typing: false, conversation_id: conversationId });

    try {
      await sendMessage(messageContent);
      inputRef.current?.focus();
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "Your message will be retried automatically.",
        variant: "destructive",
      });
    }
  }, [newMessage, sendMessage, broadcastPresence, conversationId, toast]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setEmojiPickerOpen(false);
    inputRef.current?.focus();
  }, []);

  // Handle key press
  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  // Disable body scrolling and hide scrollbars when chat is active
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
    };
  }, []);

  // Handle mobile keyboard - only move input bar
  useEffect(() => {
    const inputBar = document.querySelector("[data-input-bar]") as HTMLElement;

    // Set initial viewport height
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();

    // Handle keyboard show/hide - only move input bar up
    const handleVisualViewportChange = () => {
      if (window.visualViewport && inputBar) {
        const viewport = window.visualViewport;
        const heightDiff = window.innerHeight - viewport.height;

        if (heightDiff > 150) {
          // Keyboard is open - only move input bar up
          inputBar.style.bottom = `${heightDiff}px`;
          inputBar.style.transition = "bottom 0.3s ease";
        } else {
          // Keyboard is closed - reset input bar position
          inputBar.style.bottom = "0px";
        }
      }
    };

    // Listen for viewport changes
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleVisualViewportChange);
    }

    window.addEventListener("resize", setVH);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleVisualViewportChange);
      }
      window.removeEventListener("resize", setVH);
      if (inputBar) {
        inputBar.style.bottom = "0px";
      }
    };
  }, []);

  // Format time
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  // Get initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-b-2 border-flora-leaf" />
          <p className="text-sm text-flora-muted">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-chat-container
      className="fixed inset-0 z-50 flex h-screen w-full flex-col overflow-hidden bg-gradient-to-b from-flora-bgFrom to-flora-bgTo"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-flora-ink/10 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-flora-ink transition hover:bg-flora-chip"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {otherUser && (
            <div
              className="relative shrink-0 cursor-pointer transition active:scale-95"
              onClick={() => otherUserId && goToSeller(otherUserId)}
            >
              <Avatar className="h-10 w-10 ring-2 ring-flora-chip">
                <AvatarImage className="h-full w-full rounded-full object-cover" src={otherUser.avatar_url} />
                <AvatarFallback className="bg-flora-leaf text-sm font-semibold text-white">
                  {getInitials(otherUser.full_name)}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1
                className="cursor-pointer truncate text-base font-bold text-flora-ink"
                onClick={() => otherUserId && goToSeller(otherUserId)}
              >
                {otherUser?.full_name || "Chat"}
              </h1>
              {otherUser?.is_verified && (
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
            <p className="text-xs text-flora-muted">
              {otherUserTyping ? (
                <span className="font-medium text-flora-leaf">typing…</span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  Secure & monitored
                </span>
              )}
            </p>
          </div>

          {hasFailedMessages && (
            <button
              type="button"
              onClick={retryAllFailed}
              aria-label="Retry failed messages"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div data-messages-area className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: "100px" }}>
        <div className="space-y-2.5 px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 240px)" }}>
              <div className="px-6 text-center">
                <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-flora-chip text-flora-leaf">
                  <MessageCircle className="h-8 w-8" />
                </span>
                <h3 className="mb-2 text-lg font-bold text-flora-ink">Start your conversation</h3>
                <p className="max-w-sm text-sm leading-relaxed text-flora-muted">
                  Send your first message to begin a secure, monitored conversation
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex group ${message.sender_id === currentUserId ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[80%] rounded-3xl px-4 py-2.5 transition ${
                    message.sender_id === currentUserId
                      ? "rounded-br-md bg-flora-ink text-white"
                      : "rounded-bl-md bg-white text-flora-ink shadow-card"
                  } ${message._isOptimistic ? "opacity-60" : ""} ${
                    message._isFailed ? "bg-red-50 text-red-900" : ""
                  }`}
                  onTouchStart={(e) => {
                    if (message.sender_id === currentUserId && !message._isOptimistic && !message._isFailed) {
                      const timer = setTimeout(() => {
                        setSelectedMessageForDelete(message.id);
                        navigator.vibrate?.(50);
                      }, 500);
                      e.currentTarget.dataset.timer = timer.toString();
                    }
                  }}
                  onTouchEnd={(e) => {
                    const timer = e.currentTarget.dataset.timer;
                    if (timer) clearTimeout(parseInt(timer));
                  }}
                >
                  {message._isFailed && (
                    <div className="mb-1.5 flex items-center gap-1 text-xs font-medium text-red-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Failed to send</span>
                      <button type="button" onClick={() => retryAllFailed()} className="underline">
                        Retry
                      </button>
                    </div>
                  )}

                  <p className="break-words text-sm leading-relaxed">{message.content}</p>

                  <div
                    className={`mt-1 flex items-center gap-1 ${
                      message.sender_id === currentUserId ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className={`text-[11px] ${message.sender_id === currentUserId ? "text-white/70" : "text-flora-muted"}`}>
                      {formatTime(message.created_at)}
                    </span>
                    {message.sender_id === currentUserId && !message._isFailed && (
                      <MessageTicks message={message} otherUserLastReadAt={otherUserLastReadAt} tone="on-dark" />
                    )}
                    {message.sender_id === currentUserId && !message._isOptimistic && !message._isFailed && (
                      <button
                        type="button"
                        onClick={() => deleteMessage(message.id)}
                        className="ml-0.5 hidden h-4 w-4 items-center justify-center text-white/70 opacity-0 transition group-hover:opacity-100 hover:text-white sm:flex"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {otherUserTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-3xl rounded-bl-md bg-white px-4 py-3 shadow-card">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flora-muted [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flora-muted [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-flora-muted" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Bar */}
      <div data-input-bar className="fixed bottom-0 left-0 right-0 z-10 flex-shrink-0 px-4 py-3">
        <div className="mx-auto flex max-w-4xl items-end gap-2">
          <Popover open={emojiPickerOpen} onOpenChange={setEmojiPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label="Add emoji"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-flora-muted shadow-card transition hover:text-flora-ink"
              >
                <Smile className="h-5 w-5" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-auto border-0 bg-transparent p-0 shadow-none">
              <EmojiPicker onSelect={handleEmojiSelect} />
            </PopoverContent>
          </Popover>

          <input
            ref={inputRef}
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => handleTyping(e.target.value)}
            onKeyPress={handleKeyPress}
            className="h-11 flex-1 rounded-full border-0 bg-white px-4 text-sm text-flora-ink shadow-card outline-none transition focus:ring-2 focus:ring-flora-leaf/40"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            aria-label="Send message"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-flora-ink text-white shadow-card transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        {hasFailedMessages && (
          <p className="mt-2 text-center text-xs font-medium text-red-600">
            {messages.filter((m) => m._isFailed).length} message(s) failed to send
          </p>
        )}
      </div>

      {/* Delete Message Modal */}
      {selectedMessageForDelete && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-flora-ink/60 p-4 backdrop-blur-sm"
          onClick={() => setSelectedMessageForDelete(null)}
        >
          <div
            className="w-full max-w-sm animate-in rounded-3xl bg-white p-6 shadow-floating slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-center text-lg font-bold text-flora-ink">Delete Message</h3>
            <p className="mb-6 text-center text-sm text-flora-muted">
              Are you sure you want to delete this message?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedMessageForDelete(null)}
                className="flex-1 rounded-full border border-flora-ink/10 py-2.5 text-sm font-medium text-flora-ink transition hover:bg-flora-chip"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMessage(selectedMessageForDelete);
                  setSelectedMessageForDelete(null);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-red-600 py-2.5 text-sm font-medium text-white transition hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedChat;
