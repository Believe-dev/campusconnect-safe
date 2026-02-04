import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface ReferralData {
  referralCode: string;
  totalReferrals: number;
  referralLink: string;
}

interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_referrals: number;
  avatar_url?: string;
}

export const useReferrals = () => {
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReferralData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('referral_code, total_referrals')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setReferralData({
        referralCode: data.referral_code,
        totalReferrals: data.total_referrals,
        referralLink: `${window.location.origin}/auth?ref=${data.referral_code}`
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, total_referrals, avatar_url')
        .gt('total_referrals', 0)
        .order('total_referrals', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    }
  };

  const validateReferralCode = async (code: string): Promise<boolean> => {
    if (!code || code === referralData?.referralCode) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', code.toUpperCase())
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  };

  const createReferral = async (referralCode: string) => {
    if (!user || !referralCode) return false;

    try {
      const { data: referrer, error: referrerError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode.toUpperCase())
        .single();

      if (referrerError || !referrer) return false;

      const { error } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.user_id,
          referred_id: user.id
        });

      return !error;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    if (user) {
      fetchReferralData();
      fetchLeaderboard();
    }
    setLoading(false);
  }, [user]);

  return {
    referralData,
    leaderboard,
    loading,
    validateReferralCode,
    createReferral,
    refreshData: () => {
      fetchReferralData();
      fetchLeaderboard();
    }
  };
};