import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useSellerSecurity = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const verifySellerAccess = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return false;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('account_type, seller_status')
        .eq('user_id', user.id)
        .single();

      if (error || !profile) {
        toast({
          title: "Error",
          description: "Unable to verify your account status",
          variant: "destructive",
        });
        return false;
      }

      if (profile.account_type === 'buyer' || profile.seller_status !== 'approved') {
        toast({
          title: "Access Denied",
          description: "You must be an approved seller to perform this action",
          variant: "destructive",
        });
        navigate('/profile');
        return false;
      }

      return true;
    } catch (error) {
      toast({
        title: "Error",
        description: "Security verification failed",
        variant: "destructive",
      });
      return false;
    }
  }, [navigate, toast]);

  const handleSecurityError = useCallback((error: any) => {
    if (error?.message?.includes('approved sellers') || 
        error?.message?.includes('Only approved sellers')) {
      toast({
        title: "Access Denied",
        description: "Only approved sellers can perform this action",
        variant: "destructive",
      });
      navigate('/profile');
      return true;
    }
    return false;
  }, [navigate, toast]);

  return {
    verifySellerAccess,
    handleSecurityError
  };
};