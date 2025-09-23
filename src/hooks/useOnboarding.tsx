import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    const hasCompletedOnboarding = localStorage.getItem('unimarket_onboarding_completed');
    const userSignupTime = localStorage.getItem(`user_signup_${user.id}`);
    
    // Check if this is a new user (signed up in this session)
    const isNewUser = !hasCompletedOnboarding && !userSignupTime;
    
    if (isNewUser) {
      // Mark user signup time
      localStorage.setItem(`user_signup_${user.id}`, Date.now().toString());
      setShowOnboarding(true);
    }
  }, [user, loading]);

  const closeOnboarding = () => {
    setShowOnboarding(false);
  };

  return { showOnboarding, closeOnboarding };
};