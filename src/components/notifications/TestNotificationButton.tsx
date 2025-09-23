import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';

export const TestNotificationButton = () => {
  const testNotification = async () => {

    
    // Request permission first
    if ('Notification' in window) {

      
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();

      }
      
      if (Notification.permission === 'granted') {

        
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
        

      } else {

        alert('Please allow notifications in your browser settings');
      }
    } else {

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