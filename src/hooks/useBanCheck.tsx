import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useBanCheck = () => {
  const { user } = useAuth();
  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState('');

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned, admin_notes')
        .eq('user_id', user.id)
        .single();

      if (profile?.is_banned) {
        setIsBanned(true);
        setBanReason(profile.admin_notes || 'No reason provided');
        await supabase.auth.signOut();
      }
    };

    checkBanStatus();
  }, [user]);

  return { isBanned, banReason, userEmail: user?.email || '' };
};