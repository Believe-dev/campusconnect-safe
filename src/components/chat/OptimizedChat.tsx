import React, { useState, useEffect, useRef, useCallback } from "react";
import { useOptimisticMessages } from "@/hooks/useOptimisticMessages";
import { useRealTime } from "@/contexts/RealTimeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Shield,
  AlertTriangle,
  MessageCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import RealTimeStatus from "@/components/common/RealTimeStatus";
import { useMessageCount } from "@/contexts/MessageCountContext";
import { useUniMarketNavigation } from "@/hooks/useUniMarketNavigation";
import { supabase } from "@/integrations/supabase/client";

interface OptimizedChatProps {
  conversationId: string;
  currentUserId: string;
  otherUser?: {
    full_name: string;
    avatar_url?: string;
    is_verified?: boolean;
  };
  onClose?: () => void;
}

const OptimizedChat: React.FC<OptimizedChatProps> = ({
  conversationId,
  currentUserId,
  otherUser,
  onClose,
}) => {
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { broadcastPresence } = useRealTime();
  const { decreaseCount } = useMessageCount();
  const { goToSeller } = useUniMarketNavigation();
  const [otherUserId, setOtherUserId] = useState<string | null>(null);

  // Fetch conversation details to get the other user's ID
  useEffect(() => {
    const fetchConversationDetails = async () => {
      if (!conversationId || !currentUserId) return;
      
      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('buyer_id, seller_id')
          .eq('id', conversationId)
          .single();
          
        if (error) throw error;
        
        const otherUserId = data.buyer_id === currentUserId ? data.seller_id : data.buyer_id;
        setOtherUserId(otherUserId);
      } catch (error) {
        console.error('Error fetching conversation details:', error);
      }
    };
    
    fetchConversationDetails();
  }, [conversationId, currentUserId]);

  const {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    retryAllFailed,
    hasFailedMessages,
  } = useOptimisticMessages({ conversationId, currentUserId });

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

  // Handle typing indicators
  const handleTyping = useCallback(
    (value: string) => {
      setNewMessage(value);

      if (!isTyping && value.trim()) {
        setIsTyping(true);
        broadcastPresence({ typing: true, conversation_id: conversationId });
      }

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        broadcastPresence({ typing: false, conversation_id: conversationId });
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
    broadcastPresence({ typing: false, conversation_id: conversationId });

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
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-sm text-muted-foreground">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-chat-container
      className="fixed inset-0 w-full h-screen flex flex-col bg-gradient-to-br from-gray-50 via-white to-blue-50/30 overflow-hidden z-50"
      style={{ height: "calc(var(--vh, 1vh) * 100)" }}
    >
      {/* Modern Fixed Header */}
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200/50 px-4 py-4 flex-shrink-0 shadow-sm">
        <div className="flex items-center gap-4">
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-9 w-9 p-0 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
          )}

          {otherUser && (
            <div 
              className="relative cursor-pointer transition-transform hover:scale-105 active:scale-95"
              onClick={() => otherUserId && goToSeller(otherUserId)}
            >
              <Avatar className="h-10 w-10 ring-2 ring-green-500/20">
                <AvatarImage
                  className="h-full w-full rounded-full object-cover"
                  src={otherUser.avatar_url}
                />
                <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white text-sm font-semibold">
                  {getInitials(otherUser.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 
                className="text-lg font-bold text-gray-900 truncate cursor-pointer hover:text-green-600 transition-colors"
                onClick={() => otherUserId && goToSeller(otherUserId)}
              >
                {otherUser?.full_name || "Chat"}
              </h1>
              {otherUser?.is_verified && (
                <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-sm">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-green-600" />
                <span className="font-medium">Secure Chat</span>
              </div>
              <span className="text-gray-300">•</span>
              <RealTimeStatus />
            </div>
          </div>

          {hasFailedMessages && (
            <Button
              variant="ghost"
              size="sm"
              onClick={retryAllFailed}
              className="text-red-600 hover:bg-red-50 rounded-full h-9 w-9 p-0"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div 
        data-messages-area
        className="flex-1 overflow-y-auto bg-transparent scrollbar-hide"
        style={{ paddingBottom: "100px" }}
      >
        <div className="px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center" style={{ minHeight: "calc(100vh - 200px)" }}>
              <div className="text-center px-6">
                <div className="p-8 bg-gradient-to-br from-green-100 via-emerald-100 to-blue-100 rounded-3xl w-fit mx-auto mb-8 shadow-lg">
                  <MessageCircle className="h-16 w-16 text-green-600" />
                </div>
                <h3 className="font-bold text-2xl text-gray-900 mb-4">
                  Start your conversation
                </h3>
                <p className="text-gray-600 max-w-sm leading-relaxed">
                  Send your first message to begin a secure, monitored conversation
                </p>
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex group ${
                  message.sender_id === currentUserId
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[85%] px-5 py-4 rounded-3xl shadow-sm relative transition-all duration-200 ${
                    message.sender_id === currentUserId
                      ? "bg-gradient-to-br from-green-500 to-green-600 text-white rounded-br-md shadow-green-100"
                      : "bg-white text-gray-800 border border-gray-100 rounded-bl-md shadow-gray-100"
                  } ${message._isOptimistic ? "opacity-70 scale-95" : ""} ${
                    message._isFailed ? "border-red-300 bg-red-50" : ""
                  }`}
                  onTouchStart={(e) => {
                    if (
                      message.sender_id === currentUserId &&
                      !message._isOptimistic &&
                      !message._isFailed
                    ) {
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
                    <div className="flex items-center gap-1 text-xs text-red-600 mb-2">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Failed to send</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryAllFailed()}
                        className="h-4 px-1 text-red-600 hover:bg-red-100"
                      >
                        Retry
                      </Button>
                    </div>
                  )}

                  <p className="text-sm leading-relaxed break-words mb-2 font-medium">
                    {message.content}
                  </p>

                  <div
                    className={`flex items-end gap-2 ${
                      message.sender_id === currentUserId
                        ? "justify-end"
                        : "justify-between"
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        message.sender_id === currentUserId
                          ? "text-green-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.created_at)}
                    </span>

                    {message.sender_id === currentUserId && (
                      <div className="flex items-center">
                        <span className="text-green-100 text-xs leading-none">
                          {message._isOptimistic
                            ? "✓"
                            : message._isFailed
                            ? "✗"
                            : "✓✓"}
                        </span>
                        {!message._isOptimistic && !message._isFailed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteMessage(message.id)}
                            className="h-4 w-4 p-0 ml-1 text-green-100 hover:bg-green-600 opacity-0 group-hover:opacity-100 hidden sm:flex"
                          >
                            ×
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Fixed Input Bar */}
      <div 
        data-input-bar
        className="fixed bottom-0 left-0 right-0 border-t border-gray-200/50 bg-white/98 backdrop-blur-xl px-4 py-4 flex-shrink-0 transition-all duration-300 ease-out z-10"
      >
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full border-2 border-gray-200 focus:border-green-500 rounded-3xl px-5 py-4 text-sm bg-gray-50/80 focus:bg-white transition-all duration-200 resize-none min-h-[52px] shadow-sm focus:shadow-md"
            />
          </div>
          <Button
            onClick={handleSendMessage}
            disabled={!newMessage.trim()}
            className="h-12 w-12 rounded-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-sm"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-gray-500">
          <Shield className="h-3 w-3 text-green-600" />
          <span className="font-medium">Secure & monitored</span>
          {hasFailedMessages && (
            <Badge variant="destructive" className="text-xs ml-2 font-medium">
              {messages.filter((m) => m._isFailed).length} failed
            </Badge>
          )}
        </div>
      </div>

      {/* Delete Message Modal */}
      {selectedMessageForDelete && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          onClick={() => setSelectedMessageForDelete(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-lg text-center mb-6 text-gray-800">
              Delete Message
            </h3>
            <p className="text-center text-gray-600 mb-6">
              Are you sure you want to delete this message?
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedMessageForDelete(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  deleteMessage(selectedMessageForDelete);
                  setSelectedMessageForDelete(null);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OptimizedChat;
