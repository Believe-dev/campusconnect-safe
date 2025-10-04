import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Lock, Eye, MessageCircle, Phone, Users, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface PrivacySettingsDialogProps {
  children: React.ReactNode;
}

interface PrivacySettings {
  profile_visibility: 'public' | 'university' | 'private';
  show_online_status: boolean;
  allow_messages: boolean;
  show_phone_number: boolean;
  data_collection_consent: boolean;
  marketing_consent: boolean;
}

export const PrivacySettingsDialog = ({ children }: PrivacySettingsDialogProps) => {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<PrivacySettings>({
    profile_visibility: 'public',
    show_online_status: true,
    allow_messages: true,
    show_phone_number: false,
    data_collection_consent: true,
    marketing_consent: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      fetchPrivacySettings();
    }
  }, [open, user]);

  const fetchPrivacySettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('privacy_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data) {
        setSettings({
          profile_visibility: data.profile_visibility,
          show_online_status: data.show_online_status,
          allow_messages: data.allow_messages,
          show_phone_number: data.show_phone_number,
          data_collection_consent: data.data_collection_consent,
          marketing_consent: data.marketing_consent,
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load privacy settings",
        variant: "destructive",
      });
    }
  };

  const updateSetting = async (key: keyof PrivacySettings, value: any) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      const { error } = await supabase
        .from('privacy_settings')
        .upsert({
          user_id: user.id,
          ...updatedSettings,
        });

      if (error) throw error;

      toast({
        title: "Settings Updated",
        description: "Your privacy settings have been saved",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update privacy settings",
        variant: "destructive",
      });
      // Revert the change
      fetchPrivacySettings();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>
            Control who can see your information and how we use your data
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Visibility */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <Label className="font-medium">Profile Visibility</Label>
            </div>
            <select
              value={settings.profile_visibility}
              onChange={(e) => updateSetting('profile_visibility', e.target.value as 'public' | 'university' | 'private')}
              disabled={loading}
              className="w-full h-10 px-3 text-sm border border-input bg-background rounded-md"
            >
              <option value="public">Public - Anyone can see</option>
              <option value="university">University Only - Same university students</option>
              <option value="private">Private - Only you can see</option>
            </select>
          </div>

          <Separator />

          {/* Communication Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <Label className="font-medium">Communication</Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Online Status</Label>
                  <p className="text-sm text-muted-foreground">
                    Let others see when you're online
                  </p>
                </div>
                <Switch
                  checked={settings.show_online_status}
                  onCheckedChange={(checked) => updateSetting('show_online_status', checked)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Messages</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow other users to send you messages
                  </p>
                </div>
                <Switch
                  checked={settings.allow_messages}
                  onCheckedChange={(checked) => updateSetting('allow_messages', checked)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Phone Number</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your phone number on your profile
                  </p>
                </div>
                <Switch
                  checked={settings.show_phone_number}
                  onCheckedChange={(checked) => updateSetting('show_phone_number', checked)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Data & Privacy */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <Label className="font-medium">Data & Privacy</Label>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Data Collection Consent</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow us to collect usage data to improve the platform
                  </p>
                </div>
                <Switch
                  checked={settings.data_collection_consent}
                  onCheckedChange={(checked) => updateSetting('data_collection_consent', checked)}
                  disabled={loading}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Marketing Communications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive promotional emails and updates
                  </p>
                </div>
                <Switch
                  checked={settings.marketing_consent}
                  onCheckedChange={(checked) => updateSetting('marketing_consent', checked)}
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};