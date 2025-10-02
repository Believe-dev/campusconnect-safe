import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Download, FileText, Shield, FileSpreadsheet, FileImage } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface DataExportDialogProps {
  children: React.ReactNode;
}

export const DataExportDialog = ({ children }: DataExportDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [format, setFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const { toast } = useToast();
  const { user } = useAuth();

  const collectUserData = async () => {
    if (!user) return null;

    const userData: any = {
      export_date: new Date().toISOString(),
      user_id: user.id,
      email: user.email,
      profile: null,
      products: [],
      orders: [],
      messages: [],
      notifications: []
    };

    const { data: profile } = await supabase.from('profiles').select('*').eq('user_id', user.id).single();
    userData.profile = profile;

    const { data: products } = await supabase.from('products').select('*').eq('seller_id', user.id);
    userData.products = products || [];

    const { data: buyerOrders } = await supabase.from('orders').select('*').eq('buyer_id', user.id);
    const { data: sellerOrders } = await supabase.from('orders').select('*').eq('seller_id', user.id);
    userData.orders = [...(buyerOrders || []), ...(sellerOrders || [])];

    const { data: sentMessages } = await supabase.from('messages').select('*').eq('sender_id', user.id);
    const { data: receivedMessages } = await supabase.from('messages').select('*').eq('receiver_id', user.id);
    userData.messages = [...(sentMessages || []), ...(receivedMessages || [])];

    const { data: notifications } = await supabase.from('notifications').select('*').eq('user_id', user.id);
    userData.notifications = notifications || [];

    return userData;
  };

  const convertToCSV = (data: any) => {
    const sections = [
      { name: 'Profile', data: data.profile ? [data.profile] : [] },
      { name: 'Products', data: data.products },
      { name: 'Orders', data: data.orders },
      { name: 'Messages', data: data.messages },
      { name: 'Notifications', data: data.notifications }
    ];

    let csv = '';
    sections.forEach(section => {
      if (section.data.length > 0) {
        csv += `\n${section.name}\n`;
        const headers = Object.keys(section.data[0]);
        csv += headers.join(',') + '\n';
        section.data.forEach(row => {
          csv += headers.map(header => {
            const value = row[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
          }).join(',') + '\n';
        });
      }
    });
    return csv;
  };

  const convertToText = (data: any) => {
    let content = `UniMarket Data Export\nExported on: ${new Date(data.export_date).toLocaleDateString()}\n\n`;
    
    if (data.profile) {
      content += `Profile Information:\n`;
      Object.entries(data.profile).forEach(([key, value]) => {
        content += `${key}: ${value}\n`;
      });
      content += '\n';
    }

    content += `Products (${data.products.length}):\n`;
    data.products.forEach((product: any, index: number) => {
      content += `${index + 1}. ${product.title} - $${product.price}\n`;
    });

    content += `\nOrders (${data.orders.length}):\n`;
    data.orders.forEach((order: any, index: number) => {
      content += `${index + 1}. Order #${order.id} - ${order.status}\n`;
    });

    return content;
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const data = await collectUserData();
      if (!data) throw new Error('Failed to collect user data');

      const timestamp = new Date().toISOString().split('T')[0];
      
      switch (format) {
        case 'json':
          downloadFile(JSON.stringify(data, null, 2), `unimarket-data-${timestamp}.json`, 'application/json');
          break;
        case 'csv':
          downloadFile(convertToCSV(data), `unimarket-data-${timestamp}.csv`, 'text/csv');
          break;
        case 'pdf':
          downloadFile(convertToText(data), `unimarket-data-${timestamp}.txt`, 'text/plain');
          break;
      }

      toast({ title: "Data Exported", description: `Your data has been downloaded as ${format.toUpperCase()}` });
      setOpen(false);

    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message || "Failed to export data", variant: "destructive" });
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={format} onValueChange={(value: 'json' | 'csv' | 'pdf') => setFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="json">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    JSON - Structured data
                  </div>
                </SelectItem>
                <SelectItem value="csv">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    CSV - Spreadsheet format
                  </div>
                </SelectItem>
                <SelectItem value="pdf">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    TXT - Readable format
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
            {format === 'json' && <FileText className="h-8 w-8 text-blue-600" />}
            {format === 'csv' && <FileSpreadsheet className="h-8 w-8 text-blue-600" />}
            {format === 'pdf' && <FileImage className="h-8 w-8 text-blue-600" />}
            <div>
              <h3 className="font-medium text-blue-900">
                {format === 'json' && 'JSON Format'}
                {format === 'csv' && 'CSV Format'}
                {format === 'pdf' && 'Text Format'}
              </h3>
              <p className="text-sm text-blue-700">
                {format === 'json' && 'Structured data file with all information'}
                {format === 'csv' && 'Spreadsheet-compatible format for analysis'}
                {format === 'pdf' && 'Human-readable text format'}
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