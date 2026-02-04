import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { useReferrals } from '@/hooks/useReferrals';

export const ReferralLeaderboard = () => {
  const { leaderboard, loading } = useReferrals();

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2: return <Medal className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold text-muted-foreground">#{rank}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <Card className="shadow-brand">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-brand">
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Referral Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        {leaderboard.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No referrals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.slice(0, 10).map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-50 to-amber-50' : 'hover:bg-muted/50'
                }`}
              >
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(index + 1)}
                </div>
                
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.avatar_url} />
                  <AvatarFallback className="text-xs">
                    {getInitials(entry.full_name)}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.total_referrals} referral{entry.total_referrals !== 1 ? 's' : ''}
                  </p>
                </div>
                
                <Badge variant="outline" className="text-xs">
                  {entry.total_referrals}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};