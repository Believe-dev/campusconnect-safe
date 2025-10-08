import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

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
      
      // Create a database notification first
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Mobile Test Notification 📱',
          message: 'This is a test notification for mobile devices. If you can see this, your notification system is working!',
          type: 'info'
        });
        
      if (dbError) {
        throw new Error(`Database error: ${dbError.message}`);
      }
      
      // Try browser notification with mobile-friendly options
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          const notification = new Notification('UniMarket Mobile Test 📱', {
            body: 'Mobile notification test successful!',
            icon: '/logo.png',
            tag: 'mobile-test',
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200] // Mobile vibration pattern
          });
          
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {
              // Ignore close errors on mobile
            }
          }, 4000);
        } catch (notifError) {
          console.warn('Browser notification failed on mobile:', notifError);
        }
      }
      
      toast.success('Mobile test notification created! Check your notifications page.');
      
      // Trigger a custom event to update notification count
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      
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