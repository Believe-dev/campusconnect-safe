import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/enhanced-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Copy, Share2, Users, Gift, Trophy } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';
import { useNavigate } from 'react-router-dom';

export const ReferralCard = () => {
  const { referralData } = useReferrals();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [copying, setCopying] = useState(false);

  const copyToClipboard = async (text: string, type: string) => {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied!',
        description: `${type} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
    setTimeout(() => setCopying(false), 1000);
  };

  const shareReferral = async () => {
    if (navigator.share && referralData) {
      try {
        await navigator.share({
          title: 'Join UniMarket',
          text: `Join UniMarket using my referral code: ${referralData.referralCode}`,
          url: referralData.referralLink,
        });
      } catch {
        copyToClipboard(referralData.referralLink, 'Referral link');
      }
    } else if (referralData) {
      copyToClipboard(referralData.referralLink, 'Referral link');
    }
  };

  if (!referralData) return null;

  return (
    <Card className="shadow-brand">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Gift className="h-5 w-5 text-university-green" />
          Refer Friends
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Total Referrals</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-university-green">
                {referralData.totalReferrals}
              </span>
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                Friends
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium mb-2">Your Referral Code</p>
            <div className="flex gap-2">
              <Input
                value={referralData.referralCode}
                readOnly
                className="font-mono text-center text-lg font-bold"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(referralData.referralCode, 'Referral code')}
                disabled={copying}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Referral Link</p>
            <div className="flex gap-2">
              <Input
                value={referralData.referralLink}
                readOnly
                className="text-xs"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={shareReferral}
                disabled={copying}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-university-green/10 to-emerald-100 p-3 rounded-lg">
          <p className="text-sm text-university-green font-medium">
            💰 Earn rewards when friends join using your code!
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => navigate('/referrals')}
          className="w-full flex items-center gap-2"
        >
          <Trophy className="h-4 w-4" />
          View Leaderboard
        </Button>
      </CardContent>
    </Card>
  );
};