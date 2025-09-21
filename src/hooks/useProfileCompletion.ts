import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  full_name?: string;
  university_name?: string;
  student_id?: string;
  phone_number?: string;
  account_type?: string;
  bio?: string;
}

export const useProfileCompletion = () => {
  const [showModal, setShowModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    checkProfileCompletion();
  }, []);

  const checkProfileCompletion = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, university_name, student_id, phone_number, account_type, bio')
        .eq('user_id', user.id)
        .single();

      if (!profileData) return;
      
      setProfile(profileData);

      // Only check for sellers
      if (profileData.account_type !== 'seller') return;

      const missing: string[] = [];
      
      if (!profileData.full_name?.trim()) missing.push('Full Name');
      if (!profileData.university_name?.trim()) missing.push('University');
      if (!profileData.student_id?.trim()) missing.push('Student ID');
      if (!profileData.phone_number?.trim()) missing.push('Phone Number');
      if (!profileData.bio?.trim()) missing.push('Bio');

      setMissingFields(missing);
      
      // Show modal if there are missing fields and user hasn't dismissed it recently
      if (missing.length > 0) {
        const lastDismissed = localStorage.getItem('profile-completion-dismissed');
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        if (!lastDismissed || parseInt(lastDismissed) < oneDayAgo) {
          setShowModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking profile completion:', error);
    }
  };

  const dismissModal = () => {
    setShowModal(false);
    localStorage.setItem('profile-completion-dismissed', Date.now().toString());
  };

  const completeProfile = () => {
    setShowModal(false);
    // Temporarily dismiss for 1 hour to allow user to complete profile
    localStorage.setItem('profile-completion-dismissed', (Date.now() + (60 * 60 * 1000)).toString());
  };

  return {
    showModal,
    missingFields,
    profile,
    dismissModal,
    completeProfile,
    recheckProfile: checkProfileCompletion
  };
};