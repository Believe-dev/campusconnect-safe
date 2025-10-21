import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/contexts/ProfileContext';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { AlertTriangle, CreditCard, Lock, Sparkles, Zap, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
      <>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg mx-auto border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center pb-6 pt-8">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-university-green to-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-lg animate-pulse">
                <Lock className="h-10 w-10 text-white" />
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Subscription Expired
              </CardTitle>
              <p className="text-base text-gray-600 mt-3">
                Reactivate your premium seller features
              </p>
            </CardHeader>
            
            <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
              <div className="text-center">
                <Badge variant="destructive" className="mb-6 px-4 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Features Paused
                </Badge>
                
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-university-green rounded-lg p-4 mb-6">
                  <p className="text-sm text-gray-800">
                    <strong className="text-university-green">Your seller account is temporarily paused.</strong><br/>
                    <span className="text-gray-600">{featureAccess.reason}</span>
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-lg font-bold text-gray-900">
                    Premium Features
                  </span>
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    ₦1,000/month
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Unlimited product listings
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Live feed bidding access
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                    Advanced sales dashboard
                  </div>
                  <div className="flex items-center gap-2 text-gray-700">
                    <div className="w-2 h-2 bg-pink-500 rounded-full"></div>
                    Marketing & promotion tools
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3 text-green-800">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CreditCard className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Zero Commission Policy</p>
                    <p className="text-xs text-green-700">Keep 100% of your sales revenue</p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowPayment(true)}
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-university-green to-emerald-600 hover:from-green-700 hover:to-emerald-700 shadow-xl transform hover:scale-105 transition-all duration-200"
                size="lg"
              >
                <CreditCard className="h-6 w-6 mr-3" />
                Renew Now - ₦1,000/month
              </Button>

              <div className="flex items-center justify-center gap-2 pt-3">
                <Lock className="h-4 w-4 text-gray-400" />
                <p className="text-sm text-gray-500 text-center">
                  Secure payment powered by Paystack
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {showPayment && (
          <Dialog open={showPayment} onOpenChange={setShowPayment}>
            <DialogContent className="p-0 max-w-md sm:max-w-lg border-0 bg-transparent shadow-none z-[9999]">
              <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden z-[9999]">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-university-green to-emerald-600"></div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute top-4 right-4 z-10 h-10 w-10 rounded-full bg-gray-100 hover:bg-gray-200 shadow-md"
                  onClick={() => setShowPayment(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
                <div className="pt-6">
                  <SellerRegistrationPayment
                    userEmail={profile?.email || ""}
                    userId={profile?.user_id || ""}
                    onPaymentSuccess={() => {
                      setShowPayment(false);
                      window.location.reload();
                    }}
                    onCancel={() => setShowPayment(false)}
                    isSubscriptionRenewal={true}
                  />
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </>
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