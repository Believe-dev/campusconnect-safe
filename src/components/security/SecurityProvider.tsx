import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

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

export const SecurityProvider = ({ children }: { children: ReactNode }) => {
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

      // Security checks only - no UI blocking

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