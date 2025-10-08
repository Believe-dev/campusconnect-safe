import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Shield, Bell, User, CreditCard, HelpCircle, LogOut, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { TwoFactorAuthDialog } from '@/components/settings/TwoFactorAuthDialog';
import { HelpCenterDialog } from '@/components/settings/HelpCenterDialog';
import { SecurityLogDialog } from '@/components/settings/SecurityLogDialog';
import { PrivacySettingsDialog } from '@/components/settings/PrivacySettingsDialog';
import { DataExportDialog } from '@/components/settings/DataExportDialog';
import NotificationSettings from '@/components/notifications/NotificationSettings';

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  order_updates: boolean;
  marketing_emails: boolean;
  security_alerts: boolean;
}

const Settings = () => {
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    order_updates: true,
    marketing_emails: false,
    security_alerts: true,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed Out",
        description: "You've been successfully signed out",
      });
      navigate('/');
    }
  };

  const updateNotificationSettings = async (key: keyof NotificationSettings, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    
    // In a real app, you would save this to the database
    toast({
      title: "Settings Updated",
      description: "Your notification preferences have been saved",
    });
  };

  const deleteAccount = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const userId = user.id;
      
      const { data, error } = await supabase.rpc('delete_user_completely');
      
      if (error || !data) {
        throw new Error('Failed to delete account');
      }
      
      // Clear local storage and caches
      localStorage.clear();
      sessionStorage.clear();
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      

      
      toast({
        title: "Account Completely Deleted",
        description: "Your account has been permanently deleted. You can no longer sign in with this email.",
      });
      
      window.location.href = '/';
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete account data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-primary">Settings</h1>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button variant="outline" asChild>
                  <a href="/profile">Edit Profile</a>
                </Button>
                <ChangePasswordDialog>
                  <Button variant="outline">
                    Change Password
                  </Button>
                </ChangePasswordDialog>
                <Button variant="outline" disabled>
                  Verify Student ID
                </Button>
                <TwoFactorAuthDialog>
                  <Button variant="outline">
                    Two-Factor Authentication
                  </Button>
                </TwoFactorAuthDialog>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Notification Settings */}
          <NotificationSettings />

          {/* Privacy & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <PrivacySettingsDialog>
                  <Button variant="outline">
                    Privacy Settings
                  </Button>
                </PrivacySettingsDialog>
                <DataExportDialog>
                  <Button variant="outline">
                    Data Export
                  </Button>
                </DataExportDialog>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to permanently delete your account? This will remove all your data from our database including products, orders, messages, and profile information. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={deleteAccount}
                        disabled={loading}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {loading ? 'Deleting...' : 'Delete Account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <SecurityLogDialog>
                  <Button variant="outline">
                    Security Log
                  </Button>
                </SecurityLogDialog>
              </div>
            </CardContent>
          </Card>



          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Support & Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <HelpCenterDialog>
                  <Button variant="outline">
                    Help Center
                  </Button>
                </HelpCenterDialog>
                <Button variant="outline" onClick={() => window.open('https://wa.me/2349133054018?text=Hello%2C%20I%20need%20help%20with%20UniMarket', '_blank')}>
                  Contact Support
                </Button>
                <Button variant="outline" asChild>
                  <a href="/terms-of-service">Terms of Service</a>
                </Button>
                <Button variant="outline" asChild>
                  <a href="/privacy-policy">Privacy Policy</a>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sign Out */}
          <Card className="border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-destructive">Sign Out</h3>
                  <p className="text-sm text-muted-foreground">
                    Sign out of your UniMarket account
                  </p>
                </div>
                <Button variant="destructive" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Settings;