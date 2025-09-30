import React, { createContext, useContext, useEffect, useState } from 'react';

interface AccessibilityContextType {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large';
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
  setFontSize: (size: 'small' | 'medium' | 'large') => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
};

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export const AccessibilityProvider: React.FC<AccessibilityProviderProps> = ({ children }) => {
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');

  useEffect(() => {
    // Check system preferences
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches;
    
    setReducedMotion(prefersReducedMotion);
    setHighContrast(prefersHighContrast);

    // Load saved preferences
    const savedHighContrast = localStorage.getItem('accessibility-high-contrast') === 'true';
    const savedReducedMotion = localStorage.getItem('accessibility-reduced-motion') === 'true';
    const savedFontSize = localStorage.getItem('accessibility-font-size') as 'small' | 'medium' | 'large' || 'medium';

    setHighContrast(savedHighContrast || prefersHighContrast);
    setReducedMotion(savedReducedMotion || prefersReducedMotion);
    setFontSize(savedFontSize);
  }, []);

  useEffect(() => {
    // Apply accessibility classes to body
    document.body.classList.toggle('high-contrast', highContrast);
    document.body.classList.toggle('reduced-motion', reducedMotion);
    document.body.classList.remove('font-small', 'font-medium', 'font-large');
    document.body.classList.add(`font-${fontSize}`);

    // Save preferences
    localStorage.setItem('accessibility-high-contrast', highContrast.toString());
    localStorage.setItem('accessibility-reduced-motion', reducedMotion.toString());
    localStorage.setItem('accessibility-font-size', fontSize);
  }, [highContrast, reducedMotion, fontSize]);

  const toggleHighContrast = () => setHighContrast(!highContrast);
  const toggleReducedMotion = () => setReducedMotion(!reducedMotion);

  return (
    <AccessibilityContext.Provider
      value={{
        highContrast,
        reducedMotion,
        fontSize,
        toggleHighContrast,
        toggleReducedMotion,
        setFontSize,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};