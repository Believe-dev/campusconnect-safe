import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function Notifications() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up real-time subscription
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id},type=neq.message`
          },
          (payload) => {
            fetchNotifications();
          }
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
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .neq('type', 'message')
        .order('created_at', { ascending: false });

      if (error) {
        // Check if table exists
        if (error.code === '42P01') {
          toast.error('Notifications table not found. Please run the database migration.');
          return;
        }
        
        // Check for RLS issues
        if (error.code === '42501') {
          toast.error('Permission denied. Please check RLS policies.');
          return;
        }
        
        throw error;
      }
      
      setNotifications(data || []);
      
      // If no notifications exist, create a welcome notification
      if (!data || data.length === 0) {
        await createWelcomeNotification();
      }
    } catch (error) {
      toast.error(`Failed to load notifications: ${error.message}`);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  };
  
  const createWelcomeNotification = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Welcome to UniMarket! 🎉',
          message: 'Your notification system is working! You\'ll receive updates about orders, messages, and account activities here.',
          type: 'success'
        });
        
      if (error) {
        // Error handled silently
      } else {
        // Refresh notifications
        setTimeout(fetchNotifications, 1000);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId 
            ? { ...notif, is_read: true }
            : notif
        )
      );
    } catch (error) {
      toast.error('Failed to update notification');
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => 
        prev.filter(notif => notif.id !== notificationId)
      );
      toast.success('Notification deleted');
    } catch (error) {
      toast.error('Failed to delete notification');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (notification.is_read) {
      // Toggle expansion for read notifications
      setExpandedNotifications(prev => {
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
    
    if (notification.type === 'order_shipped' || notification.type === 'order_delivered') {
      navigate('/orders');

    } else if (notification.type === 'seller_approved') {
      navigate('/dashboard');
    } else {
      if (notification.message.toLowerCase().includes('order')) {
        navigate('/orders');

      }
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user?.id)
        .eq('is_read', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      toast.success('All notifications marked as read');
    } catch (error) {
      toast.error('Failed to update notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <h1 className="text-xl sm:text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount} unread</Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm" className="w-full sm:w-auto">
              <Check className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
        </div>

        {loadingNotifications ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-1/2 mx-auto"></div>
                <div className="h-4 bg-muted rounded w-2/3 mx-auto"></div>
              </div>
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
              <p className="text-muted-foreground">
                You'll see important updates and messages here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`cursor-pointer hover:shadow-md transition-shadow ${
                  !notification.is_read ? 'ring-2 ring-primary/20' : ''
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${getNotificationTypeColor(notification.type)}`} />
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-base truncate">{notification.title}</CardTitle>
                        <p className={`text-xs sm:text-sm text-muted-foreground mt-1 ${
                          expandedNotifications.has(notification.id) ? '' : 'line-clamp-2'
                        }`}>
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}