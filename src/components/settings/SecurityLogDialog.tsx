import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Clock, MapPin, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface SecurityLogDialogProps {
  children: React.ReactNode;
}

interface SecurityLog {
  id: string;
  event_type: string;
  description: string;
  ip_address: string;
  user_agent: string;
  location: string;
  created_at: string;
}

export const SecurityLogDialog = ({ children }: SecurityLogDialogProps) => {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchSecurityLogs();
    }
  }, [open, user]);

  const fetchSecurityLogs = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load security logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'login':
      case 'logout':
        return <Shield className="h-4 w-4" />;
      case 'password_change':
        return <Shield className="h-4 w-4" />;
      case '2fa_enabled':
      case '2fa_disabled':
        return <Shield className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'login':
        return 'bg-green-100 text-green-800';
      case 'logout':
        return 'bg-blue-100 text-blue-800';
      case 'password_change':
      case '2fa_enabled':
        return 'bg-orange-100 text-orange-800';
      case '2fa_disabled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceIcon = (userAgent: string) => {
    if (userAgent?.toLowerCase().includes('mobile')) {
      return <Smartphone className="h-4 w-4" />;
    }
    return <Monitor className="h-4 w-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Log
          </DialogTitle>
          <DialogDescription>
            View recent security events and login activity for your account
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading security logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No security events recorded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getEventIcon(log.event_type)}
                      <Badge className={getEventColor(log.event_type)}>
                        {log.event_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>

                  <p className="text-sm">{log.description}</p>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      {log.ip_address && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {log.ip_address}
                        </div>
                      )}
                      {log.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {log.location}
                        </div>
                      )}
                    </div>
                    {log.user_agent && (
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(log.user_agent)}
                        <span className="max-w-xs truncate">
                          {log.user_agent.split(' ')[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={fetchSecurityLogs} disabled={loading}>
            Refresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};