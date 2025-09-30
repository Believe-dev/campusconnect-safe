import React, { useEffect, useState } from 'react';
import { useRealTime } from '@/contexts/RealTimeContext';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Wifi } from 'lucide-react';

interface PerformanceMetrics {
  messageLatency: number;
  connectionUptime: number;
  dataUsage: number;
  activeSubscriptions: number;
}

export const PerformanceMonitor: React.FC<{ showDetails?: boolean }> = ({ 
  showDetails = false 
}) => {
  const { state } = useRealTime();
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    messageLatency: 0,
    connectionUptime: 0,
    dataUsage: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    const updateMetrics = () => {
      const uptime = state.lastActivity 
        ? Date.now() - state.lastActivity.getTime()
        : 0;

      setMetrics(prev => ({
        ...prev,
        connectionUptime: uptime,
        messageLatency: state.isConnected ? Math.random() * 100 + 50 : 0, // Simulated
        activeSubscriptions: state.isConnected ? 3 : 0 // Simulated
      }));
    };

    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [state]);

  if (!showDetails) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Activity className="h-3 w-3" />
        <span>{metrics.messageLatency.toFixed(0)}ms</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-green-500" />
        <span className="text-sm font-medium">Real-time Performance</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Latency:</span>
          <Badge variant="outline" className="text-xs">
            {metrics.messageLatency.toFixed(0)}ms
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Uptime:</span>
          <Badge variant="outline" className="text-xs">
            {Math.floor(metrics.connectionUptime / 1000)}s
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Subscriptions:</span>
          <Badge variant="outline" className="text-xs">
            {metrics.activeSubscriptions}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status:</span>
          <Badge 
            variant={state.isConnected ? "default" : "destructive"} 
            className="text-xs"
          >
            <Wifi className="h-2 w-2 mr-1" />
            {state.connectionStatus}
          </Badge>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMonitor;