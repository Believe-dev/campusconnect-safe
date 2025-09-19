import React from 'react';
import { Link, LinkProps } from 'react-router-dom';

interface SafeLinkProps extends LinkProps {
  children: React.ReactNode;
  fallback?: () => void;
}

export const SafeLink: React.FC<SafeLinkProps> = ({ children, fallback, ...props }) => {
  try {
    return <Link {...props}>{children}</Link>;
  } catch (error) {
    console.error('SafeLink error:', error);
    
    if (fallback) {
      return (
        <button onClick={fallback} className={props.className}>
          {children}
        </button>
      );
    }
    
    return (
      <button 
        onClick={() => window.location.href = props.to as string} 
        className={props.className}
      >
        {children}
      </button>
    );
  }
};