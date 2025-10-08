import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, AlertCircle, Smartphone, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { initializePushNotifications, sendServerPushNotification } from '@/utils/pushNotifications';
import { initializeOneSignal } from '@/utils/oneSignal';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
}

export const ComprehensiveNotificationTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runComprehensiveTest = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults: TestResult[] = [];
    
    try {
      // Test 1: Authentication
      testResults.push({ name: 'Authentication', status: 'pending', message: 'Checking user authentication...' });
      setResults([...testResults]);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        testResults[0] = { name: 'Authentication', status: 'error', message: 'User not authenticated' };
        setResults([...testResults]);
        return;
      }
      
      testResults[0] = { name: 'Authentication', status: 'success', message: 'User authenticated successfully' };
      setResults([...testResults]);
      
      // Test 2: Service Worker Registration
      testResults.push({ name: 'Service Worker', status: 'pending', message: 'Registering service worker...' });
      setResults([...testResults]);
      
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          testResults[1] = { name: 'Service Worker', status: 'success', message: 'Service worker registered successfully' };
        } catch (error) {
          testResults[1] = { name: 'Service Worker', status: 'error', message: `Service worker registration failed: ${error.message}` };
        }
      } else {
        testResults[1] = { name: 'Service Worker', status: 'error', message: 'Service workers not supported' };
      }
      setResults([...testResults]);
      
      // Test 3: Push Notification Permission
      testResults.push({ name: 'Push Permission', status: 'pending', message: 'Requesting push notification permission...' });
      setResults([...testResults]);
      
      if ('Notification' in window) {
        let permission = Notification.permission;
        if (permission === 'default') {
          permission = await Notification.requestPermission();
        }
        
        if (permission === 'granted') {
          testResults[2] = { name: 'Push Permission', status: 'success', message: 'Push notification permission granted' };
        } else {
          testResults[2] = { name: 'Push Permission', status: 'error', message: 'Push notification permission denied' };
        }
      } else {
        testResults[2] = { name: 'Push Permission', status: 'error', message: 'Notifications not supported' };
      }
      setResults([...testResults]);
      
      // Test 4: OneSignal Initialization
      testResults.push({ name: 'OneSignal Setup', status: 'pending', message: 'Initializing OneSignal...' });
      setResults([...testResults]);
      
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        testResults[3] = { name: 'OneSignal Setup', status: 'warning', message: 'OneSignal skipped on localhost (domain restriction)' };
      } else {
        try {
          await initializeOneSignal();
          testResults[3] = { name: 'OneSignal Setup', status: 'success', message: 'OneSignal initialized successfully' };
        } catch (error) {
          testResults[3] = { name: 'OneSignal Setup', status: 'warning', message: `OneSignal initialization failed: ${error.message}` };
        }
      }
      setResults([...testResults]);
      
      // Test 5: Database Notification
      testResults.push({ name: 'Database Notification', status: 'pending', message: 'Creating database notification...' });
      setResults([...testResults]);
      
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Comprehensive Test Notification 🧪',
          message: 'This is a comprehensive test notification. If you can see this, your notification system is working correctly!',
          type: 'info'
        });
        
      if (dbError) {
        testResults[4] = { name: 'Database Notification', status: 'error', message: `Database error: ${dbError.message}` };
      } else {
        testResults[4] = { name: 'Database Notification', status: 'success', message: 'Database notification created successfully' };
      }
      setResults([...testResults]);
      
      // Test 6: Push Notification (Phone Panel)
      if (testResults[2].status === 'success') {
        testResults.push({ name: 'Push Notification', status: 'pending', message: 'Sending push notification...' });
        setResults([...testResults]);
        
        try {
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Localhost fallback - just browser notification
            const registration = await navigator.serviceWorker.ready;
            await registration.showNotification('UniMarket Localhost Test 📱', {
              body: 'This is a localhost test notification!',
              icon: '/logo.png',
              badge: '/logo.png',
              tag: 'test-notification',
              vibrate: [200, 100, 200],
              requireInteraction: false,
              data: { type: 'test', url: '/notifications' }
            });
            testResults[5] = { name: 'Push Notification', status: 'success', message: 'Localhost browser notification sent successfully' };
          } else {
            // Try server push notification first
            const serverPushSuccess = await sendServerPushNotification(
              user.id,
              'UniMarket Push Test 📱',
              'This notification should appear in your phone\'s notification panel!',
              { type: 'test', url: '/notifications' }
            );
            
            if (serverPushSuccess) {
              testResults[5] = { name: 'Push Notification', status: 'success', message: 'Server push notification sent successfully' };
            } else {
              // Fallback to browser notification
              const registration = await navigator.serviceWorker.ready;
              await registration.showNotification('UniMarket Browser Test 📱', {
                body: 'This is a fallback browser notification!',
                icon: '/logo.png',
                badge: '/logo.png',
                tag: 'test-notification',
                vibrate: [200, 100, 200],
                requireInteraction: false,
                data: { type: 'test', url: '/notifications' }
              });
              testResults[5] = { name: 'Push Notification', status: 'success', message: 'Browser push notification sent successfully' };
            }
          }
        } catch (error) {
          testResults[5] = { name: 'Push Notification', status: 'error', message: `Push notification failed: ${error.message}` };
        }
        setResults([...testResults]);
      }
      
      // Test 7: Email Notification
      testResults.push({ name: 'Email Notification', status: 'pending', message: 'Sending email notification...' });
      setResults([...testResults]);
      
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', user.id)
          .single();
          
        if (profile?.email) {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              to: profile.email,
              subject: 'UniMarket Email Test 📧',
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #16a34a;">📧 Email Notification Test</h2>
                  <p>Hello <strong>${profile.full_name || 'User'}</strong>,</p>
                  <div style="background: #f8fafc; padding: 15px; border-left: 4px solid #16a34a; margin: 20px 0;">
                    <p>This is a test email notification from UniMarket. If you received this email, your email notification system is working correctly!</p>
                  </div>
                  <p>Best regards,<br>UniMarket Team</p>
                </div>
              `,
              text: `Hello ${profile.full_name || 'User'},\n\nThis is a test email notification from UniMarket. If you received this email, your email notification system is working correctly!\n\nBest regards,\nUniMarket Team`
            }
          });
          
          if (emailError) {
            testResults[testResults.length - 1] = { name: 'Email Notification', status: 'error', message: `Email failed: ${emailError.message}` };
          } else {
            testResults[testResults.length - 1] = { name: 'Email Notification', status: 'success', message: 'Email notification sent successfully' };
          }
        } else {
          testResults[testResults.length - 1] = { name: 'Email Notification', status: 'warning', message: 'No email address found in profile' };
        }
      } catch (error) {
        testResults[testResults.length - 1] = { name: 'Email Notification', status: 'error', message: `Email error: ${error.message}` };
      }
      setResults([...testResults]);
      
      // Trigger notification count update
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      
      // Show final result
      const successCount = testResults.filter(r => r.status === 'success').length;
      const totalTests = testResults.length;
      
      if (successCount === totalTests) {
        toast.success('All notification tests passed! 🎉');
      } else if (successCount > 0) {
        toast.success(`${successCount}/${totalTests} tests passed. Check your phone's notification panel and email!`);
      } else {
        toast.error('All notification tests failed. Please check your settings.');
      }
      
    } catch (error) {
      console.error('Comprehensive notification test failed:', error);
      toast.error(`Test failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300 animate-pulse" />;
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Comprehensive Notification Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={runComprehensiveTest} 
            disabled={testing}
            className="flex-1"
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {testing ? 'Testing...' : 'Run Full Test'}
          </Button>
        </div>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{result.name}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded-lg">
          <p className="font-medium">What this test checks:</p>
          <p>• User authentication and permissions</p>
          <p>• Service worker registration for push notifications</p>
          <p>• OneSignal setup for cross-platform notifications</p>
          <p>• Database notifications (always work)</p>
          <p>• Push notifications (should appear in phone's notification panel)</p>
          <p>• Email notifications via Resend</p>
        </div>
      </CardContent>
    </Card>
  );
};