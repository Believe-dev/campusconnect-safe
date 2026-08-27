import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { X } from 'lucide-react';

const getInitials = (name: string) => {
  const words = name.trim().split(' ').filter(Boolean);
  if (words.length === 0) return 'U';
  return words.map((word) => word[0]).join('').toUpperCase().slice(0, 2);
};

interface MessageNotification {
  id: string;
  conversationId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

export const MessagePopup = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<MessageNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`message_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMessage = payload.new;
          
          // Only show notification if message is not from current user
          if (newMessage.sender_id === user.id) return;

          // Check if user is in this conversation
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', newMessage.conversation_id)
            .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
            .single();

          if (!conversation) return;

          // Get sender info
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', newMessage.sender_id)
            .single();

          const notification: MessageNotification = {
            id: newMessage.id,
            conversationId: newMessage.conversation_id,
            senderName: sender?.full_name || 'Someone',
            content: newMessage.content.substring(0, 50) + (newMessage.content.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString(),
          };

          setNotifications(prev => [...prev, notification]);

          // Auto remove after 5 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 5000);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleNotificationClick = (conversationId: string, notificationId: string) => {
    navigate(`/chat/${conversationId}`);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const dismissNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <div className="fixed right-4 top-4 z-50 space-y-2.5">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl bg-white p-4 shadow-floating transition animate-in hover:brightness-[0.99] slide-in-from-right-4"
          onClick={() => handleNotificationClick(notification.conversationId, notification.id)}
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-flora-leaf text-sm font-semibold text-white">
            {getInitials(notification.senderName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-flora-ink">
              {notification.senderName}
            </p>
            <p className="truncate text-sm text-flora-muted">
              {notification.content}
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={(e) => {
              e.stopPropagation();
              dismissNotification(notification.id);
            }}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-flora-muted transition hover:bg-flora-chip"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};