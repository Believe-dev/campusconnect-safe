import React, { createContext, useContext, useState, useEffect } from 'react';

interface WelcomeModalContextType {
  hasSeenWelcome: boolean;
  markWelcomeAsSeen: () => void;
  resetWelcome: () => void;
}

const WelcomeModalContext = createContext<WelcomeModalContextType | undefined>(undefined);

const WELCOME_STORAGE_KEY = 'unimarket:welcomeShown';

export const WelcomeModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  useEffect(() => {
    // Check localStorage on mount
    const welcomeShown = localStorage.getItem(WELCOME_STORAGE_KEY);
    setHasSeenWelcome(welcomeShown === '1');
  }, []);

  const markWelcomeAsSeen = () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, '1');
    setHasSeenWelcome(true);
  };

  const resetWelcome = () => {
    localStorage.removeItem(WELCOME_STORAGE_KEY);
    setHasSeenWelcome(false);
  };

  return (
    <WelcomeModalContext.Provider value={{
      hasSeenWelcome,
      markWelcomeAsSeen,
      resetWelcome
    }}>
      {children}
    </WelcomeModalContext.Provider>
  );
};

export const useWelcomeModal = () => {
  const context = useContext(WelcomeModalContext);
  if (context === undefined) {
    throw new Error('useWelcomeModal must be used within a WelcomeModalProvider');
  }
  return context;
};