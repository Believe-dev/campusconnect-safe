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
      
      // For mobile devices, use service worker notifications
      if (isMobile) {
        await testMobileNotification();
        return;
      }
      
      // Desktop notification test - try service worker first, fallback to direct
      if ('serviceWorker' in navigator && 'Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission === 'granted') {
          try {
            // Try service worker notification first
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('UniMarket Test 🔔', {
              body: 'This is a test notification! Your browser notifications are working.',
              icon: '/logo.png',
              badge: '/logo.png',
              tag: 'test-notification',
              requireInteraction: false,
              silent: false
            });
            toast.success('Test notification sent!');
          } catch (swError) {
            // Fallback to direct notification for desktop
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
          }
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
      
      // Request permission first
      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }
      
      if (permission !== 'granted') {
        toast.error('Notification permission denied. Please enable notifications.');
        return;
      }
      
      // Use service worker for mobile notifications
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await registration.showNotification('UniMarket Mobile Test 📱', {
            body: 'This is a mobile test notification! If you see this in your notification panel, mobile notifications are working.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'mobile-test-notification',
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200]
          });
          toast.success('Mobile notification sent! Check your notification panel.');
        } catch (swError) {
          console.error('Service worker notification failed:', swError);
          throw new Error('Service worker notification failed. Use ServiceWorkerRegistration.showNotification() instead of new Notification().');
        }
      }
      
      // Test push notification
      await testPushNotification();
      
      // Also test OneSignal
      await sendTestNotification();
      
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