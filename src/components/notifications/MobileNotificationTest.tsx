import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, CheckCircle, XCircle, AlertCircle, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
}

export const MobileNotificationTest = () => {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const runMobileNotificationTest = async () => {
    setTesting(true);
    setResults([]);
    
    const testResults: TestResult[] = [];
    
    try {
      // Test 1: Check if user is authenticated
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
      
      // Test 2: Check notification permission
      testResults.push({ name: 'Browser Permission', status: 'pending', message: 'Checking notification permission...' });
      setResults([...testResults]);
      
      let hasPermission = false;
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          hasPermission = true;
          testResults[1] = { name: 'Browser Permission', status: 'success', message: 'Notification permission granted' };
        } else if (Notification.permission === 'denied') {
          testResults[1] = { name: 'Browser Permission', status: 'error', message: 'Notification permission denied. Please enable in browser settings.' };
        } else {
          try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
              hasPermission = true;
              testResults[1] = { name: 'Browser Permission', status: 'success', message: 'Notification permission granted' };
            } else {
              testResults[1] = { name: 'Browser Permission', status: 'error', message: 'Notification permission denied by user' };
            }
          } catch (error) {
            testResults[1] = { name: 'Browser Permission', status: 'error', message: 'Failed to request permission' };
          }
        }
      } else {
        testResults[1] = { name: 'Browser Permission', status: 'error', message: 'Browser does not support notifications' };
      }
      setResults([...testResults]);
      
      // Test 3: Database notification
      testResults.push({ name: 'Database Notification', status: 'pending', message: 'Creating database notification...' });
      setResults([...testResults]);
      
      const { error: dbError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title: 'Mobile Test Notification 📱',
          message: 'This is a test notification created for mobile devices. If you can see this in your notifications page, the database system is working correctly!',
          type: 'info'
        });
        
      if (dbError) {
        testResults[2] = { name: 'Database Notification', status: 'error', message: `Database error: ${dbError.message}` };
      } else {
        testResults[2] = { name: 'Database Notification', status: 'success', message: 'Database notification created successfully' };
        
        // Trigger notification count update
        window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      }
      setResults([...testResults]);
      
      // Test 4: Browser notification (if permission granted)
      if (hasPermission) {
        testResults.push({ name: 'Browser Notification', status: 'pending', message: 'Sending browser notification...' });
        setResults([...testResults]);
        
        try {
          const notification = new Notification('UniMarket Mobile Test 📱', {
            body: 'Mobile browser notification test successful!',
            icon: '/logo.png',
            tag: 'mobile-test',
            requireInteraction: false,
            silent: false,
            vibrate: [200, 100, 200]
          });
          
          setTimeout(() => {
            try {
              notification.close();
            } catch (e) {
              // Ignore close errors on mobile
            }
          }, 4000);
          
          testResults[3] = { name: 'Browser Notification', status: 'success', message: 'Browser notification sent successfully' };
        } catch (error) {
          testResults[3] = { name: 'Browser Notification', status: 'warning', message: `Browser notification failed: ${error.message}` };
        }
        setResults([...testResults]);
      }
      
      // Show final result
      const successCount = testResults.filter(r => r.status === 'success').length;
      const totalTests = testResults.length;
      
      if (successCount === totalTests) {
        toast.success('All mobile notification tests passed!');
      } else if (successCount > 0) {
        toast.success(`${successCount}/${totalTests} tests passed. Check results for details.`);
      } else {
        toast.error('All notification tests failed. Please check your settings.');
      }
      
    } catch (error) {
      console.error('Mobile notification test failed:', error);
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Mobile Notification Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runMobileNotificationTest} 
          disabled={testing}
          className="w-full"
        >
          <Bell className="h-4 w-4 mr-2" />
          {testing ? 'Testing...' : 'Run Mobile Test'}
        </Button>
        
        {results.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Test Results:</h4>
            {results.map((result, index) => (
              <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                {getStatusIcon(result.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{result.name}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p>• This test checks mobile notification compatibility</p>
          <p>• Database notifications should always work</p>
          <p>• Browser notifications may vary by device/browser</p>
        </div>
      </CardContent>
    </Card>
  );
};