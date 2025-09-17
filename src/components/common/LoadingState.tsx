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
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-muted rounded w-3/4"></div>
    <div className="h-4 bg-muted rounded w-1/2"></div>
    <div className="h-32 bg-muted rounded"></div>
  </div>
);

export const CardSkeleton: React.FC = () => (
  <Card className="animate-pulse">
    <div className="aspect-square bg-muted" />
    <CardContent className="p-4 space-y-2">
      <div className="h-4 bg-muted rounded" />
      <div className="h-3 bg-muted rounded w-2/3" />
      <div className="h-6 bg-muted rounded w-1/3" />
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
  <Card className="max-w-md mx-auto">
    <CardContent className="pt-6 text-center space-y-4">
      <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
      <div>
        <h3 className="font-semibold mb-2">Something went wrong</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
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
  <div className="text-center py-12 px-4">
    {icon && <div className="mb-4">{icon}</div>}
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground mb-4 max-w-md mx-auto">{description}</p>
    {action}
  </div>
);