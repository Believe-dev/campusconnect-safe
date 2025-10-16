import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { SellerRegistrationPayment } from '@/components/seller/SellerRegistrationPayment';

interface ProtectedSellerRouteProps {
  children: React.ReactNode;
}

const ProtectedSellerRoute = ({ children }: ProtectedSellerRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();
  const { subscription, loading: subscriptionLoading, canAccessSellerFeature } = useSellerSubscription();

  useEffect(() => {
    checkSellerAccess();
  }, [profile]); // Re-check when profile changes

  const checkSellerAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      // Use profile from context if available, otherwise fetch
      let userProfile = profile;
      if (!userProfile) {
        const { data: fetchedProfile, error } = await supabase
          .from('profiles')
          .select('account_type, seller_status')
          .eq('user_id', user.id)
          .single();

        if (error) throw error;
        userProfile = fetchedProfile as any;
      }

      if (userProfile.account_type === 'buyer') {
        toast({
          title: "Access Denied",
          description: "Only seller accounts can access this page.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      // Allow sellers with approved status or existing sellers without status set
      if (userProfile.seller_status === 'rejected') {
        toast({
          title: "Seller Application Rejected",
          description: "Your seller application has been rejected. Please contact support.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }
      
      // Show warning for pending sellers but allow access
      if (userProfile.seller_status === 'pending') {
        toast({
          title: "Seller Approval Pending",
          description: "Your seller account is pending approval. Some features may be limited.",
          variant: "default",
        });
      }

      setAuthorized(true);
    } catch (error) {
      console.error('Error checking seller access:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  // Check subscription status after authorization
  const featureAccess = canAccessSellerFeature('seller_dashboard');
  
  if (authorized && !subscriptionLoading && !featureAccess.allowed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5" />
              Subscription Expired
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-red-800">
              {featureAccess.reason}
            </p>
            <Button
              onClick={() => setShowPayment(true)}
              className="w-full"
              variant="destructive"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Renew Subscription
            </Button>
            {showPayment && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <SellerRegistrationPayment
                  userEmail={profile?.email || ""}
                  userId={profile?.user_id || ""}
                  onPaymentSuccess={() => {
                    setShowPayment(false);
                    window.location.reload();
                  }}
                  onCancel={() => setShowPayment(false)}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-48 mb-4"></div>
          <div className="h-64 bg-muted rounded w-96"></div>
        </div>
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedSellerRoute;