import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DataExportDialogProps {
  children: React.ReactNode;
}

export const DataExportDialog = ({ children }: DataExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const exportData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      const data = await response.json();
      
      // Create and download file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `unimarket-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully",
      });

      setOpen(false);

    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Your Data
          </DialogTitle>
          <DialogDescription>
            Download a copy of all your personal data stored on UniMarket
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">JSON Format</h3>
              <p className="text-sm text-blue-700">
                Your data will be exported as a structured JSON file
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">Data Included:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Profile information</li>
              <li>• Product listings</li>
              <li>• Order history</li>
              <li>• Messages</li>
              <li>• Notifications</li>
              <li>• Security logs</li>
              <li>• Privacy settings</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg">
            <Shield className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-amber-800">
              Sensitive data like passwords and 2FA secrets are excluded for security
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={exportData}
            disabled={loading}
          >
            {loading ? "Exporting..." : "Export Data"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};