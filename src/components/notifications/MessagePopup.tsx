import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle, X } from 'lucide-react';

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
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm cursor-pointer hover:shadow-xl transition-shadow animate-in slide-in-from-right-4"
          onClick={() => handleNotificationClick(notification.conversationId, notification.id)}
        >
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-2 rounded-full">
              <MessageCircle className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                New message from {notification.senderName}
              </p>
              <p className="text-sm text-gray-600 truncate">
                {notification.content}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismissNotification(notification.id);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};