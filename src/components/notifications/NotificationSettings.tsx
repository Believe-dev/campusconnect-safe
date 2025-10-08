import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Mail, Smartphone, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { requestNotificationPermission, sendTestNotification } from '@/utils/oneSignal';
import { TestNotificationButton } from './TestNotificationButton';
import { MobileNotificationTest } from './MobileNotificationTest';
import { ComprehensiveNotificationTest } from './ComprehensiveNotificationTest';

interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  order_updates: boolean;
  message_notifications: boolean;
  payment_notifications: boolean;
  marketing_emails: boolean;
  seller_notifications: boolean;
}

export default function NotificationSettings() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email_notifications: true,
    push_notifications: true,
    order_updates: true,
    message_notifications: true,
    payment_notifications: true,
    marketing_emails: false,
    seller_notifications: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
    checkBrowserPermission();
  }, [user]);

  const checkBrowserPermission = () => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  };

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setPreferences(data);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: NotificationPreferences) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          ...newPreferences,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setPreferences(newPreferences);
      toast.success('Notification preferences saved');
    } catch (error) {
      toast.error('Failed to save preferences');
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key: keyof NotificationPreferences) => {
    const newPreferences = {
      ...preferences,
      [key]: !preferences[key]
    };
    savePreferences(newPreferences);
  };

  const requestPushPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setBrowserPermission('granted');
      toast.success('Push notifications enabled');
    } else {
      toast.error('Push notifications denied');
    }
  };

  const testNotifications = async () => {
    await sendTestNotification();
    toast.success('Test notification sent!');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Permission Status */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5" />
              <div>
                <p className="font-medium">Browser Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Allow notifications in your browser
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={browserPermission === 'granted' ? 'default' : 'secondary'}
              >
                {browserPermission === 'granted' ? 'Enabled' : 
                 browserPermission === 'denied' ? 'Blocked' : 'Not Set'}
              </Badge>
              {browserPermission !== 'granted' && (
                <Button 
                  size="sm" 
                  onClick={requestPushPermission}
                  variant="outline"
                >
                  Enable
                </Button>
              )}
            </div>
          </div>

          {/* Test Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Test Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Send a test notification to verify everything is working
                </p>
              </div>
              <div className="flex gap-2">
                <TestNotificationButton />
                <Button onClick={testNotifications} variant="outline" size="sm">
                  Full Test
                </Button>
              </div>
            </div>
            
            {/* Mobile Test Component */}
            <MobileNotificationTest />
            
            {/* Comprehensive Test Component */}
            <ComprehensiveNotificationTest />
          </div>

          {/* Notification Types */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Push Notifications
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <Switch
                  checked={preferences.push_notifications}
                  onCheckedChange={() => handleToggle('push_notifications')}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Order Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications about order status changes
                  </p>
                </div>
                <Switch
                  checked={preferences.order_updates}
                  onCheckedChange={() => handleToggle('order_updates')}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">New Messages</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications for new chat messages
                  </p>
                </div>
                <Switch
                  checked={preferences.message_notifications}
                  onCheckedChange={() => handleToggle('message_notifications')}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Payment Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications about payments and wallet activity
                  </p>
                </div>
                <Switch
                  checked={preferences.payment_notifications}
                  onCheckedChange={() => handleToggle('payment_notifications')}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Seller Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Notifications about your seller account and sales
                  </p>
                </div>
                <Switch
                  checked={preferences.seller_notifications}
                  onCheckedChange={() => handleToggle('seller_notifications')}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Notifications
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={preferences.email_notifications}
                  onCheckedChange={() => handleToggle('email_notifications')}
                  disabled={saving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Marketing Emails</p>
                  <p className="text-sm text-muted-foreground">
                    Promotional emails and product recommendations
                  </p>
                </div>
                <Switch
                  checked={preferences.marketing_emails}
                  onCheckedChange={() => handleToggle('marketing_emails')}
                  disabled={saving}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}