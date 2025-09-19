import React, { createContext, useContext, useEffect, useState } from 'react';

interface SecurityContextType {
  isSecure: boolean;
  violations: string[];
  reportViolation: (violation: string) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const useSecurityContext = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurityContext must be used within SecurityProvider');
  }
  return context;
};

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isSecure, setIsSecure] = useState(true);
  const [violations, setViolations] = useState<string[]>([]);

  useEffect(() => {
    // Security checks on mount
    const performSecurityChecks = () => {
      const checks = [];

      // Check if HTTPS is being used (in production)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        checks.push('Insecure connection detected');
      }

      // Disable right-click context menu
      document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });

      // Disable common keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'u')) {
          e.preventDefault();
        }
      });

      setViolations(checks);
      setIsSecure(checks.length === 0);
    };

    performSecurityChecks();
  }, []);

  const reportViolation = (violation: string) => {
    setViolations(prev => [...prev, violation]);
    console.warn('Security violation:', violation);
  };

  return (
    <SecurityContext.Provider value={{ isSecure, violations, reportViolation }}>
      {children}
    </SecurityContext.Provider>
  );
};