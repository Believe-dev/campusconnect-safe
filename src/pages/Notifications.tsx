import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Check, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import Header from '@/components/layout/Header';
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

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
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time notification update:', payload);
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
      console.log('No user ID available for fetching notifications');
      setLoadingNotifications(false);
      return;
    }

    try {
      console.log('Fetching notifications for user:', user.id);
      
      // Test database connection first
      const { data: testData, error: testError } = await supabase
        .from('notifications')
        .select('count')
        .limit(1);
      
      if (testError) {
        console.error('Database connection test failed:', testError);
        throw new Error('Database connection failed');
      }
      
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error fetching notifications:', error);
        throw error;
      }
      
      console.log('Fetched notifications:', data);
      setNotifications(data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error(`Failed to load notifications: ${error.message}`);
      setNotifications([]);
    } finally {
      setLoadingNotifications(false);
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
      console.error('Error marking notification as read:', error);
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
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
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
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
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
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="h-6 w-6" />
            <h1 className="text-2xl font-bold">Notifications</h1>
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount} unread</Badge>
            )}
          </div>
          
          {unreadCount > 0 && (
            <Button onClick={markAllAsRead} variant="outline" size="sm">
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
              <Card key={notification.id} className={!notification.is_read ? 'ring-2 ring-primary/20' : ''}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${getNotificationTypeColor(notification.type)}`} />
                      <div className="flex-1">
                        <CardTitle className="text-base">{notification.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(notification.created_at), 'PPp')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteNotification(notification.id)}
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