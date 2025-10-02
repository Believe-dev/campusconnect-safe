import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOptimisticMessages } from '@/hooks/useOptimisticMessages';
import { useRealTime } from '@/contexts/RealTimeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Shield, AlertTriangle, MessageCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RealTimeStatus from '@/components/common/RealTimeStatus';

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
  onClose
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const { toast } = useToast();
  const { broadcastPresence } = useRealTime();

  const {
    messages,
    loading,
    sendMessage,
    markAsRead,
    deleteMessage,
    retryAllFailed,
    hasFailedMessages
  } = useOptimisticMessages({ conversationId, currentUserId });

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Mark messages as read when they come into view
  useEffect(() => {
    const unreadMessages = messages
      .filter(msg => msg.sender_id !== currentUserId && !msg.is_read)
      .map(msg => msg.id);

    if (unreadMessages.length > 0) {
      const timer = setTimeout(() => {
        markAsRead(unreadMessages);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages, currentUserId, markAsRead]);

  // Handle typing indicators
  const handleTyping = useCallback((value: string) => {
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
  }, [isTyping, broadcastPresence, conversationId]);

  // Send message handler
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsTyping(false);
    broadcastPresence({ typing: false, conversation_id: conversationId });

    try {
      await sendMessage(messageContent);
      inputRef.current?.focus();
    } catch (error) {
      toast({
        title: 'Failed to send message',
        description: 'Your message will be retried automatically.',
        variant: 'destructive'
      });
    }
  }, [newMessage, sendMessage, broadcastPresence, conversationId, toast]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Format time
  const formatTime = useCallback((timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Get initials
  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
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
    <div className="flex flex-col h-full">
      <Card className="flex-1 flex flex-col border-0 shadow-lg">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-3 sm:p-4 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 text-white hover:bg-white/20"
              >
                ←
              </Button>
            )}
            
            {otherUser && (
              <Avatar className="h-8 w-8 border-2 border-white/20">
                <AvatarImage src={otherUser.avatar_url} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {getInitials(otherUser.full_name)}
                </AvatarFallback>
              </Avatar>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-semibold truncate">
                  {otherUser?.full_name || 'Chat'}
                </CardTitle>
                {otherUser?.is_verified && (
                  <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs opacity-90">
                <Shield className="h-3 w-3" />
                <span>Encrypted Chat</span>
                <RealTimeStatus />
              </div>
            </div>

            {hasFailedMessages && (
              <Button
                variant="ghost"
                size="sm"
                onClick={retryAllFailed}
                className="text-white hover:bg-white/20"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Messages */}
        <CardContent className="flex-1 overflow-y-auto p-0 bg-gradient-to-b from-gray-50 to-white">
          <div className="p-3 sm:p-4 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="p-4 bg-green-100 rounded-full w-fit mx-auto mb-4">
                    <MessageCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Start secure conversation
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    All messages are encrypted and monitored for safety
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex mb-3 ${
                    message.sender_id === currentUserId ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl shadow-sm border relative ${
                      message.sender_id === currentUserId
                        ? 'bg-green-500 text-white border-green-500 rounded-br-sm'
                        : 'bg-white text-foreground border-border rounded-bl-sm'
                    } ${message._isOptimistic ? 'opacity-70' : ''} ${
                      message._isFailed ? 'border-red-300 bg-red-50' : ''
                    }`}
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
                    
                    <p className="text-sm leading-relaxed break-words">
                      {message.content}
                    </p>
                    
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs ${
                          message.sender_id === currentUserId
                            ? 'text-green-100'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {formatTime(message.created_at)}
                      </span>
                      
                      {message.sender_id === currentUserId && (
                        <div className="flex items-center gap-1">
                          <span
                            className={`text-xs ${
                              message._isOptimistic
                                ? 'text-green-200'
                                : 'text-green-100'
                            }`}
                          >
                            {message._isOptimistic ? '⏳' : '✓'}
                          </span>
                          {!message._isOptimistic && !message._isFailed && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMessage(message.id)}
                              className="h-4 w-4 p-0 text-green-100 hover:bg-green-600 opacity-0 group-hover:opacity-100"
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
        </CardContent>

        {/* Input */}
        <div className="border-t bg-white p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Input
              ref={inputRef}
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 border-2 border-muted focus:border-green-500 rounded-full px-4 py-2"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="h-10 w-10 rounded-full bg-green-600 hover:bg-green-700 shadow-lg"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {/* Status */}
          <div className="flex items-center justify-center gap-2 mt-2 text-xs text-muted-foreground">
            <Shield className="h-3 w-3 text-green-600" />
            <span>End-to-end encrypted • Real-time updates</span>
            {hasFailedMessages && (
              <Badge variant="destructive" className="text-xs">
                {messages.filter(m => m._isFailed).length} failed
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OptimizedChat;