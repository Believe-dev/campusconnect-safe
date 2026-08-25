import { useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export const useOnboarding = () => {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    // Use user-specific onboarding key to prevent conflicts
    const userOnboardingKey = `unimarket_onboarding_completed_${user.id}`;
    const hasCompletedOnboarding = localStorage.getItem(userOnboardingKey);
    const userSignupTime = localStorage.getItem(`user_signup_${user.id}`);
    
    // Check if this is a new user (signed up in this session)
    const isNewUser = !hasCompletedOnboarding && !userSignupTime;
    
    if (isNewUser) {
      // Mark user signup time to track first visit
      localStorage.setItem(`user_signup_${user.id}`, Date.now().toString());
      setShowOnboarding(true);
    }
  }, [user, loading]);

  const closeOnboarding = () => {
    setShowOnboarding(false);
    
    // Mark onboarding as completed for this specific user
    if (user) {
      const userOnboardingKey = `unimarket_onboarding_completed_${user.id}`;
      localStorage.setItem(userOnboardingKey, 'true');
      
      // Also set the global key for backward compatibility
      localStorage.setItem('unimarket_onboarding_completed', 'true');
    }
  };

  return { showOnboarding, closeOnboarding };
};