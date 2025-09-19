import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface Profile {
  full_name: string;
  is_verified: boolean;
  account_type: string;
  seller_status?: string;
  avatar_url?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  refetch: () => void;
  updateProfile: (updates: Partial<Profile>) => void;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(() => {
    if (user) {
      const cached = localStorage.getItem(`cc_profile_${user.id}`);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, is_verified, account_type, seller_status, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfile(data);
      localStorage.setItem(`cc_profile_${user.id}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      const cached = localStorage.getItem(`cc_profile_${user.id}`);
      if (cached) {
        try {
          const cachedProfile = JSON.parse(cached);
          setProfile(cachedProfile);
        } catch {
          fetchProfile();
        }
      } else {
        fetchProfile();
      }

      // Set up real-time subscription for profile changes
      const subscription = supabase
        .channel(`profile_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload);
            if (payload.eventType === 'UPDATE' && payload.new) {
              const updatedProfile = {
                full_name: payload.new.full_name,
                is_verified: payload.new.is_verified,
                account_type: payload.new.account_type,
                seller_status: payload.new.seller_status,
                avatar_url: payload.new.avatar_url
              };
              setProfile(updatedProfile);
              localStorage.setItem(`cc_profile_${user.id}`, JSON.stringify(updatedProfile));
            }
          }
        )
        .subscribe();
        
      // Listen for custom profile update events
      const handleProfileUpdate = () => fetchProfile();
      window.addEventListener('profileUpdated', handleProfileUpdate);

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('profileUpdated', handleProfileUpdate);
      };
    } else {
      setProfile(null);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cc_profile_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }, [user]);

  const updateProfile = (updates: Partial<Profile>) => {
    if (profile && user) {
      const updatedProfile = { ...profile, ...updates };
      setProfile(updatedProfile);
      localStorage.setItem(`cc_profile_${user.id}`, JSON.stringify(updatedProfile));
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, refetch: fetchProfile, updateProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};