import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Bell } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
  created_at: string;
}

export const PopupNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const subscription = supabase
      .channel(`popup-notifications-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotification = payload.new as Notification;
        console.log('New notification received:', newNotification);
        
        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        setNotification(newNotification);
        
        // Auto-hide after 8 seconds
        timeoutId = setTimeout(() => {
          setNotification(null);
        }, 8000);
      })
      .subscribe((status) => {
        console.log('Notification subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Popup notifications ready');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Popup notification subscription failed');
        }
      });

    // Also listen for custom notification events
    const handleCustomNotification = (event: CustomEvent) => {
      const newNotification = event.detail as Notification;
      console.log('Custom notification received:', newNotification);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      setNotification(newNotification);
      
      timeoutId = setTimeout(() => {
        setNotification(null);
      }, 8000);
    };

    window.addEventListener('showPopupNotification', handleCustomNotification as EventListener);

    return () => {
      subscription.unsubscribe();
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('showPopupNotification', handleCustomNotification as EventListener);
    };
  }, [user]);

  const handleClick = () => {
    if (notification?.action_url) {
      navigate(notification.action_url);
    } else if (notification?.type === 'message') {
      navigate('/messages');
    } else {
      navigate('/notifications');
    }
    setNotification(null);
  };

  const handleClose = () => {
    setNotification(null);
  };

  // Function to trigger popup notification manually
  const showNotification = (notif: Notification) => {
    setNotification(notif);
    setTimeout(() => {
      setNotification(null);
    }, 8000);
  };

  // Expose function globally for manual triggering
  useEffect(() => {
    (window as any).showPopupNotification = showNotification;
    return () => {
      delete (window as any).showPopupNotification;
    };
  }, []);

  if (!notification) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right duration-300">
      <Card className="w-80 shadow-xl border-l-4 border-l-green-500 bg-white">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-1 bg-green-100 rounded-full">
              <Bell className="h-4 w-4 text-green-600" />
            </div>
            <div className="flex-1 cursor-pointer" onClick={handleClick}>
              <h4 className="font-semibold text-sm text-gray-900">{notification.title}</h4>
              <p className="text-sm text-gray-600 mt-1 leading-relaxed">{notification.message}</p>
              <p className="text-xs text-gray-400 mt-2">Tap to view</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};