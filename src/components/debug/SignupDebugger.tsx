import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const SignupDebugger = () => {
  const [email, setEmail] = useState('test@university.edu.ng');
  const [password, setPassword] = useState('testpassword123');
  const [fullName, setFullName] = useState('Test User');
  const [university, setUniversity] = useState('University of Lagos');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const { toast } = useToast();

  const testSignup = async () => {
    setLoading(true);
    setDebugInfo(null);

    try {
      console.log('Starting signup test...');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            university_name: university,
            account_type: 'buyer',
          },
        },
      });

      const result = {
        success: !error,
        error: error?.message,
        user: data.user ? {
          id: data.user.id,
          email: data.user.email,
          metadata: data.user.user_metadata,
        } : null,
        session: data.session ? 'Session created' : 'No session',
      };

      setDebugInfo(result);

      if (error) {
        toast({
          title: 'Signup Failed',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Signup Successful',
          description: 'Check the debug info below',
        });

        // Check if profile was created
        if (data.user) {
          setTimeout(async () => {
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', data.user.id)
              .single();

            setDebugInfo(prev => ({
              ...prev,
              profile: profile || null,
              profileError: profileError?.message || null,
            }));
          }, 2000);
        }
      }
    } catch (err: any) {
      console.error('Signup test error:', err);
      setDebugInfo({
        success: false,
        error: err.message,
        stack: err.stack,
      });
      
      toast({
        title: 'Test Failed',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkDatabase = async () => {
    try {
      // Check if profiles table exists and has required columns
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

      // Check if seller_registration_payments table exists
      const { data: payments, error: paymentsError } = await supabase
        .from('seller_registration_payments')
        .select('*')
        .limit(1);

      setDebugInfo({
        profilesTable: {
          exists: !profilesError,
          error: profilesError?.message,
          sampleData: profiles?.[0] || null,
        },
        paymentsTable: {
          exists: !paymentsError,
          error: paymentsError?.message,
        },
      });
    } catch (err: any) {
      setDebugInfo({
        error: err.message,
      });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Signup Debugger</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@university.edu.ng"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="testpassword123"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Test User"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">University</label>
            <Input
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              placeholder="University of Lagos"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={testSignup} disabled={loading}>
            {loading ? 'Testing...' : 'Test Signup'}
          </Button>
          <Button onClick={checkDatabase} variant="outline">
            Check Database
          </Button>
        </div>

        {debugInfo && (
          <div className="mt-4">
            <h3 className="font-medium mb-2">Debug Information:</h3>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignupDebugger;