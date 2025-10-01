import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone, Copy, Check, QrCode } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { logSecurityEvent } from '@/utils/securityLogger';
import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';

interface TwoFactorAuthDialogProps {
  children: React.ReactNode;
}

export const TwoFactorAuthDialog = ({ children }: TwoFactorAuthDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'setup' | 'verify' | 'manage'>('setup');
  const [secret, setSecret] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open && user) {
      check2FAStatus();
    }
  }, [open, user]);

  const check2FAStatus = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('user_2fa')
      .select('enabled')
      .eq('user_id', user.id)
      .single();
    
    setIs2FAEnabled(!!data?.enabled);
    setStep(data?.enabled ? 'manage' : 'setup');
  };

  const generateSecret = () => {
    const newSecret = new OTPAuth.Secret().base32;
    setSecret(newSecret);
    
    const totp = new OTPAuth.TOTP({
      issuer: 'UniMarket',
      label: user?.email || 'User',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: newSecret,
    });

    const otpauthUrl = totp.toString();
    
    QRCode.toDataURL(otpauthUrl)
      .then(url => setQrCodeUrl(url))
      .catch(console.error);
  };

  const verifyAndEnable2FA = async () => {
    if (!verificationCode || !secret || !user) {
      toast({
        title: "Error",
        description: "Please enter the verification code",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Verify the TOTP code
      const totp = new OTPAuth.TOTP({
        issuer: 'UniMarket',
        label: user.email || 'User',
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: secret,
      });

      const isValid = totp.validate({ token: verificationCode, window: 1 });
      
      if (isValid === null) {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Generate backup codes
      const codes = Array.from({ length: 8 }, () => 
        Math.random().toString(36).substring(2, 10).toUpperCase()
      );

      // Save to database
      const { error } = await supabase
        .from('user_2fa')
        .upsert({
          user_id: user.id,
          secret: secret,
          backup_codes: codes,
          enabled: true,
        });

      if (error) throw error;

      setBackupCodes(codes);
      setIs2FAEnabled(true);
      setStep('manage');

      // Log security event
      await logSecurityEvent(user.id, '2fa_enabled', 'Two-factor authentication enabled');

      toast({
        title: "2FA Enabled",
        description: "Two-factor authentication has been successfully enabled for your account.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('user_2fa')
        .update({ enabled: false })
        .eq('user_id', user.id);

      if (error) throw error;

      setIs2FAEnabled(false);
      setStep('setup');

      // Log security event
      await logSecurityEvent(user.id, '2fa_disabled', 'Two-factor authentication disabled');

      toast({
        title: "2FA Disabled",
        description: "Two-factor authentication has been disabled for your account.",
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable 2FA",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Secret key copied to clipboard",
    });
  };

  const handleSetup = () => {
    generateSecret();
    setStep('verify');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'setup' && "Add an extra layer of security to your account"}
            {step === 'verify' && "Scan the QR code with your authenticator app"}
            {step === 'manage' && "Manage your two-factor authentication settings"}
          </DialogDescription>
        </DialogHeader>

        {step === 'setup' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <Smartphone className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Use an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator to generate verification codes.
              </p>
            </div>
            <Button onClick={handleSetup} className="w-full">
              Set Up 2FA
            </Button>
          </div>
        )}

        {step === 'verify' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                {qrCodeUrl && (
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Manual Entry Key</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={secret}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(secret)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                />
              </div>
            </div>
          </div>
        )}

        {step === 'manage' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  2FA is enabled
                </span>
              </div>
            </div>

            {backupCodes.length > 0 && (
              <div className="space-y-2">
                <Label>Backup Codes</Label>
                <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                  {backupCodes.map((code, index) => (
                    <code key={index} className="text-xs font-mono">
                      {code}
                    </code>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Save these backup codes in a safe place. Each can only be used once.
                </p>
              </div>
            )}

            <Button
              variant="destructive"
              onClick={disable2FA}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            {step === 'verify' ? 'Cancel' : 'Close'}
          </Button>
          {step === 'verify' && (
            <Button
              onClick={verifyAndEnable2FA}
              disabled={loading || !verificationCode}
            >
              {loading ? "Verifying..." : "Enable 2FA"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};