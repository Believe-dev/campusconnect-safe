import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Shield, Smartphone } from 'lucide-react';
import * as OTPAuth from 'otpauth';

interface TwoFactorVerificationProps {
  userId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const TwoFactorVerification = ({ userId, onSuccess, onCancel }: TwoFactorVerificationProps) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const { toast } = useToast();

  const verifyCode = async () => {
    if (!code) {
      toast({
        title: "Error",
        description: "Please enter a verification code",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Get user's 2FA settings
      const { data: twoFAData, error } = await supabase
        .from('user_2fa')
        .select('secret, backup_codes')
        .eq('user_id', userId)
        .eq('enabled', true)
        .single();

      if (error || !twoFAData) {
        throw new Error('2FA not configured');
      }

      let isValid = false;

      if (useBackupCode) {
        // Verify backup code
        const backupCodes = twoFAData.backup_codes || [];
        const codeIndex = backupCodes.indexOf(code.toUpperCase());
        
        if (codeIndex !== -1) {
          // Remove used backup code
          const updatedCodes = backupCodes.filter((_, index) => index !== codeIndex);
          await supabase
            .from('user_2fa')
            .update({ backup_codes: updatedCodes })
            .eq('user_id', userId);
          
          isValid = true;
        }
      } else {
        // Verify TOTP code
        const totp = new OTPAuth.TOTP({
          issuer: 'UniMarket',
          algorithm: 'SHA1',
          digits: 6,
          period: 30,
          secret: twoFAData.secret,
        });

        isValid = totp.validate({ token: code, window: 1 }) !== null;
      }

      if (isValid) {
        onSuccess();
      } else {
        toast({
          title: "Invalid Code",
          description: useBackupCode ? "Invalid backup code" : "Invalid verification code",
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Verification failed",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Shield className="h-5 w-5" />
          Two-Factor Authentication
        </CardTitle>
        <CardDescription>
          {useBackupCode 
            ? "Enter one of your backup codes"
            : "Enter the 6-digit code from your authenticator app"
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center">
          {!useBackupCode && <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />}
        </div>

        <div className="space-y-2">
          <Label htmlFor="verification-code">
            {useBackupCode ? "Backup Code" : "Verification Code"}
          </Label>
          <Input
            id="verification-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={useBackupCode ? "Enter backup code" : "000000"}
            maxLength={useBackupCode ? 10 : 6}
            className="text-center font-mono"
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Button
            onClick={verifyCode}
            disabled={loading || !code}
            className="w-full"
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <Button
            variant="link"
            onClick={() => setUseBackupCode(!useBackupCode)}
            className="w-full text-sm"
            disabled={loading}
          >
            {useBackupCode ? "Use authenticator app" : "Use backup code instead"}
          </Button>

          <Button
            variant="outline"
            onClick={onCancel}
            className="w-full"
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};