import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/contexts/ProfileContext';

interface ProtectedSellerRouteProps {
  children: React.ReactNode;
}

const ProtectedSellerRoute = ({ children }: ProtectedSellerRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useProfile();

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
        userProfile = fetchedProfile;
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

      if (userProfile.seller_status !== 'approved') {
        toast({
          title: "Seller Approval Required",
          description: "Your seller account must be approved by admin before accessing seller features.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setAuthorized(true);
    } catch (error) {
      console.error('Error checking seller access:', error);
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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