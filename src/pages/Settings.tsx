import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PullToRefresh } from '@/components/common/PullToRefresh';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  User,
  HelpCircle,
  ChevronRight,
  KeyRound,
  ScrollText,
  Download,
  FileText,
  MessageCircle,
  Trash2,
  LogOut,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordDialog } from '@/components/settings/ChangePasswordDialog';
import { TwoFactorAuthDialog } from '@/components/settings/TwoFactorAuthDialog';
import { HelpCenterDialog } from '@/components/settings/HelpCenterDialog';
import { SecurityLogDialog } from '@/components/settings/SecurityLogDialog';
import { PrivacySettingsDialog } from '@/components/settings/PrivacySettingsDialog';
import { DataExportDialog } from '@/components/settings/DataExportDialog';
import NotificationSettings from '@/components/notifications/NotificationSettings';

const SettingsRow = ({
  icon: Icon,
  label,
  danger,
  onClick,
}: {
  icon: typeof Shield;
  label: string;
  danger?: boolean;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-card transition hover:brightness-[0.98] active:scale-[0.99]"
  >
    <span
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
        danger ? "bg-red-50 text-red-600" : "bg-flora-chip text-flora-muted"
      }`}
    >
      <Icon className="h-4 w-4" />
    </span>
    <span className={`flex-1 text-sm font-medium ${danger ? "text-red-600" : "text-flora-ink"}`}>
      {label}
    </span>
    <ChevronRight className="h-4 w-4 shrink-0 text-flora-muted" />
  </button>
);

const Settings = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Couldn't sign out",
        description: "Please check your connection and try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Signed out",
        description: "You've been signed out of UniMarket.",
      });
      navigate('/');
    }
  };

  const handleRefresh = useCallback(async () => {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-flora-bgFrom to-flora-bgTo">
      <PullToRefresh onRefresh={handleRefresh} className="min-h-screen">
        <main className="mx-auto max-w-2xl px-4 py-6 pb-24 sm:py-8 md:pb-8">
          <h1 className="mb-6 text-2xl font-bold text-flora-ink sm:text-3xl">Settings</h1>

          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-flora-muted">Account</h2>
            <div className="space-y-2.5">
              <SettingsRow icon={User} label="Edit Profile" onClick={() => navigate('/profile')} />
              <ChangePasswordDialog>
                <SettingsRow icon={KeyRound} label="Change Password" />
              </ChangePasswordDialog>
              <TwoFactorAuthDialog>
                <SettingsRow icon={Shield} label="Two-Factor Authentication" />
              </TwoFactorAuthDialog>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-flora-muted">Notifications</h2>
            <NotificationSettings />
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-flora-muted">Privacy &amp; Security</h2>
            <div className="space-y-2.5">
              <PrivacySettingsDialog>
                <SettingsRow icon={Shield} label="Privacy Settings" />
              </PrivacySettingsDialog>
              <DataExportDialog>
                <SettingsRow icon={Download} label="Data Export" />
              </DataExportDialog>
              <SecurityLogDialog>
                <SettingsRow icon={ScrollText} label="Security Log" />
              </SecurityLogDialog>
              {/* Routes to the one real Delete Account confirmation (Profile's
                  Danger Zone, type-your-name-to-confirm) instead of a second,
                  weaker confirmation living here - one irreversible action,
                  one confirmation bar. */}
              <SettingsRow
                icon={Trash2}
                label="Delete Account"
                danger
                onClick={() => navigate('/profile?action=delete-account')}
              />
            </div>
          </div>

          <div className="mb-6">
            <h2 className="mb-3 text-sm font-semibold text-flora-muted">Support</h2>
            <div className="space-y-2.5">
              <HelpCenterDialog>
                <SettingsRow icon={HelpCircle} label="Help Center" />
              </HelpCenterDialog>
              <SettingsRow
                icon={MessageCircle}
                label="Contact Support"
                onClick={() =>
                  window.open(
                    'https://wa.me/2349133054018?text=Hello%2C%20I%20need%20help%20with%20UniMarket',
                    '_blank',
                  )
                }
              />
              <SettingsRow icon={FileText} label="Terms of Service" onClick={() => navigate('/terms-of-service')} />
              <SettingsRow icon={FileText} label="Privacy Policy" onClick={() => navigate('/privacy-policy')} />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-left shadow-card transition hover:brightness-[0.98] active:scale-[0.99]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
              <LogOut className="h-4 w-4" />
            </span>
            <span className="flex-1 text-sm font-medium text-red-600">Sign Out</span>
          </button>
        </main>
      </PullToRefresh>
    </div>
  );
};

export default Settings;
