import { ReferralLeaderboard } from '@/components/referrals/ReferralLeaderboard';
import { ReferralCard } from '@/components/referrals/ReferralCard';
import { Button } from '@/components/ui/enhanced-button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ReferralLeaderboardPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 sm:py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                Referral Leaderboard
              </h1>
              <p className="text-muted-foreground">
                See who's bringing the most friends to UniMarket
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <ReferralCard />
            </div>
            <div className="lg:col-span-2">
              <ReferralLeaderboard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReferralLeaderboardPage;