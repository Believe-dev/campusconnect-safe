import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { LoadingStateProps } from '@/lib/types';

export const LoadingState: React.FC<LoadingStateProps> = ({
  loading,
  error,
  children,
  fallback
}) => {
  if (loading) {
    return fallback || <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorState error={error} />;
  }

  return <>{children}</>;
};

export const LoadingSkeleton: React.FC = () => (
  <div className="space-y-4 fade-in">
    <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-3/4 loading-shimmer"></div>
    <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-1/2 loading-shimmer"></div>
    <div className="h-32 bg-gradient-to-r from-muted via-muted/50 to-muted rounded loading-shimmer"></div>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <Card className="student-card fade-in">
    <div className="aspect-square bg-gradient-to-r from-muted via-muted/50 to-muted loading-shimmer" />
    <CardContent className="p-4 space-y-2">
      <div className="h-4 bg-gradient-to-r from-muted via-muted/50 to-muted rounded loading-shimmer" />
      <div className="h-3 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-2/3 loading-shimmer" />
      <div className="h-6 bg-gradient-to-r from-muted via-muted/50 to-muted rounded w-1/3 loading-shimmer" />
    </CardContent>
  </Card>
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ 
  rows = 5, 
  cols = 4 
}) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="h-8 bg-muted rounded flex-1 animate-pulse" />
        ))}
      </div>
    ))}
  </div>
);

interface ErrorStateProps {
  error: string;
  onRetry?: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => (
  <Card className="max-w-md mx-auto student-card fade-in">
    <CardContent className="pt-6 text-center space-y-4">
      <div className="relative">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto animate-pulse" />
      </div>
      <div>
        <h3 className="font-semibold mb-2 text-destructive">Oops! Something went wrong</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{error}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="hover-lift micro-bounce">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </CardContent>
  </Card>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => (
  <div className="text-center py-12 px-4 fade-in">
    {icon && <div className="mb-4 hover-lift">{icon}</div>}
    <h3 className="text-lg font-semibold mb-2 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">{title}</h3>
    <p className="text-muted-foreground mb-4 max-w-md mx-auto leading-relaxed">{description}</p>
    {action && <div className="hover-lift">{action}</div>}
  </div>
);