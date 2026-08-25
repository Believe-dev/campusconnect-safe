import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { TestTube, Send, RefreshCw } from 'lucide-react';

export default function NotificationTester() {
  const { user } = useAuth();
  const [title, setTitle] = useState('Test Notification');
  const [message, setMessage] = useState('This is a test notification to verify the system is working correctly.');
  const [type, setType] = useState('info');
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const testNotificationCreation = async () => {
    if (!user) {
      toast.error('Please log in to test notifications');
      return;
    }

    setLoading(true);
    try {
      // Use only direct insert to avoid net schema issues
      const { data: insertData, error: insertError } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          type,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      toast.success('Test notification created successfully!');
      setTestResults(prev => [...prev, `✅ Direct insert successful: ${insertData.id}`]);

      // Trigger notification update event
      window.dispatchEvent(new CustomEvent('notificationsUpdated'));
      
    } catch (error) {
      console.error('Error creating test notification:', error);
      toast.error(`Failed to create test notification: ${error.message}`);
      setTestResults(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const testTableStructure = async () => {
    setLoading(true);
    try {
      // Test basic table access
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, type, created_at')
        .eq('user_id', user?.id)
        .limit(1);

      if (error) {
        throw error;
      }

      toast.success('Notifications table is accessible');
      setTestResults(prev => [...prev, `✅ Table access successful, found ${data?.length || 0} notifications`]);
    } catch (error) {
      console.error('Error testing table structure:', error);
      toast.error(`Table structure test failed: ${error.message}`);
      setTestResults(prev => [...prev, `❌ Table test error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  const testRealtimeConnection = async () => {
    setLoading(true);
    try {
      const channel = supabase
        .channel('test-notifications')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'notifications',
            filter: `user_id=eq.${user?.id}`
          }, 
          (payload) => {
            console.log('Realtime test received:', payload);
            setTestResults(prev => [...prev, `✅ Realtime event received: ${payload.eventType}`]);
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            toast.success('Realtime connection established');
            setTestResults(prev => [...prev, `✅ Realtime subscription successful`]);
            
            // Clean up after 5 seconds
            setTimeout(() => {
              channel.unsubscribe();
              setLoading(false);
            }, 5000);
          } else if (status === 'CHANNEL_ERROR') {
            toast.error('Realtime connection failed');
            setTestResults(prev => [...prev, `❌ Realtime subscription failed`]);
            setLoading(false);
          }
        });
    } catch (error) {
      console.error('Error testing realtime:', error);
      toast.error(`Realtime test failed: ${error.message}`);
      setTestResults(prev => [...prev, `❌ Realtime error: ${error.message}`]);
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Please log in to test notifications</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Notification System Tester
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="payout">Payout</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Message</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Notification message"
              rows={3}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={testNotificationCreation} 
              disabled={loading}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Create Test Notification
            </Button>
            
            <Button 
              onClick={testTableStructure} 
              disabled={loading}
              variant="outline"
            >
              Test Table Access
            </Button>
            
            <Button 
              onClick={testRealtimeConnection} 
              disabled={loading}
              variant="outline"
            >
              Test Realtime
            </Button>
            
            <Button 
              onClick={clearResults} 
              variant="ghost"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Clear Results
            </Button>
          </div>
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="p-2 bg-muted rounded">
                  {result}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}