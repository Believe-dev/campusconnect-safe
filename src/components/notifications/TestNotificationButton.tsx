import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { toast } from 'sonner';

export const TestNotificationButton = () => {
  const testBrowserNotification = async () => {
    try {
      // Request permission first
      if ('Notification' in window) {
        let permission = Notification.permission;
        
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission === 'granted') {
          // Create notification
          const notification = new Notification('UniMarket Test 🔔', {
            body: 'This is a test notification! Your browser notifications are working.',
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'test-notification'
          });
          
          // Auto close after 5 seconds
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
      toast.error('Failed to send test notification.');
    }
  };

  return (
    <Button onClick={testBrowserNotification} variant="outline" size="sm">
      <Bell className="h-4 w-4 mr-2" />
      Test Browser Notification
    </Button>
  );
};