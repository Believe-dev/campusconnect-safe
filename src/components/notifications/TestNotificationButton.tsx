import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { testPushNotification } from '@/utils/pushNotifications';
import { sendTestNotification } from '@/utils/oneSignal';

export const TestNotificationButton = () => {
  const testBrowserNotification = async () => {
    try {
      // Check if we're on mobile
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      // For mobile devices, try a simpler approach
      if (isMobile) {
        await testMobileNotification();
        return;
      }
      
      // Desktop notification test
      if ('Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission === 'granted') {
          const notification = new Notification('UniMarket Test 🔔', {
            body: 'This is a test notification! Your browser notifications are working.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'test-notification',
            requireInteraction: false,
            silent: false
          });
          
          setTimeout(() => notification.close(), 5000);
          toast.success('Test notification sent!');
        } else {
          toast.error('Notification permission denied. Please enable notifications in your browser settings.');
        }
      } else {
        toast.error('Your browser does not support notifications.');
      }
    } catch (error) {
      console.error('Notification test failed:', error);
      toast.error(`Failed to send test notification: ${error.message}`);
    }
  };
  
  const testMobileNotification = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to test notifications');
        return;
      }
      
      // Test push notification first
      const pushSuccess = await testPushNotification();
      
      // Also test OneSignal
      await sendTestNotification();
      
      if (pushSuccess) {
        toast.success('Push notification sent! Check your phone\'s notification panel.');
      } else {
        toast.success('Database notification created! Check your notifications page.');
      }
      
    } catch (error) {
      console.error('Mobile notification test failed:', error);
      toast.error(`Mobile test failed: ${error.message}`);
    }
  };

  return (
    <Button onClick={testBrowserNotification} variant="outline" size="sm">
      <Bell className="h-4 w-4 mr-2" />
      Test Notification
    </Button>
  );
};