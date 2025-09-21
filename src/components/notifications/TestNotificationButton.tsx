import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export const TestNotificationButton = () => {
  const testNotification = async () => {
    console.log('Testing notification...');
    
    // Request permission first
    if ('Notification' in window) {
      console.log('Current permission:', Notification.permission);
      
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        console.log('Permission result:', permission);
      }
      
      if (Notification.permission === 'granted') {
        console.log('Sending notification...');
        
        // Try service worker first
        if ('serviceWorker' in navigator && 'showNotification' in ServiceWorkerRegistration.prototype) {
          try {
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('UniMarket Test', {
              body: 'This is a test notification from service worker!',
              icon: '/logo.png',
              badge: '/logo.png',
              tag: 'test',
              requireInteraction: true,
              actions: [
                { action: 'open', title: 'Open App' }
              ]
            });
            console.log('Service worker notification sent');
          } catch (error) {
            console.error('Service worker notification failed:', error);
            // Fallback to regular notification
            const notification = new Notification('UniMarket Test', {
              body: 'This is a test notification!',
              icon: '/logo.png',
              tag: 'test',
              requireInteraction: true
            });
            
            notification.onclick = () => {
              window.focus();
              notification.close();
            };
          }
        } else {
          // Regular notification
          const notification = new Notification('UniMarket Test', {
            body: 'This is a test notification!',
            icon: '/logo.png',
            tag: 'test',
            requireInteraction: true
          });
          
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
        
        console.log('Notification sent');
      } else {
        console.log('Permission denied');
        alert('Please allow notifications in your browser settings');
      }
    } else {
      console.log('Notifications not supported');
      alert('Your browser does not support notifications');
    }
  };
  
  return (
    <Button 
      onClick={testNotification}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      Test Push Notification
    </Button>
  );
};