import React from 'react';
import { useRealTime } from '@/contexts/RealTimeContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface RealTimeStatusProps {
  showText?: boolean;
  className?: string;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ 
  showText = false, 
  className = '' 
}) => {
  const { state } = useRealTime();

  const getStatusConfig = () => {
    switch (state.connectionStatus) {
      case 'connected':
        return {
          icon: CheckCircle,
          color: 'bg-green-500',
          text: 'Connected',
          variant: 'default' as const
        };
      case 'connecting':
        return {
          icon: Wifi,
          color: 'bg-yellow-500 animate-pulse',
          text: 'Connecting...',
          variant: 'secondary' as const
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'bg-red-500',
          text: 'Connection Error',
          variant: 'destructive' as const
        };
      default:
        return {
          icon: WifiOff,
          color: 'bg-gray-500',
          text: 'Disconnected',
          variant: 'secondary' as const
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (showText) {
    return (
      <Badge variant={config.variant} className={`flex items-center gap-1 ${className}`}>
        <div className={`w-2 h-2 rounded-full ${config.color}`} />
        <Icon className="h-3 w-3" />
        <span className="text-xs">{config.text}</span>
        {state.retryCount > 0 && (
          <span className="text-xs opacity-75">
            (Retry {state.retryCount})
          </span>
        )}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} title={config.text}>
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <Icon className="h-3 w-3 text-muted-foreground" />
    </div>
  );
};

export default RealTimeStatus;