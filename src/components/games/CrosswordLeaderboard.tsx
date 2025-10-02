import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Target, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderboardEntry {
  user_id: string;
  username: string;
  best_time: number;
  best_score: number;
  puzzles_completed: number;
  total_score: number;
}

export const CrosswordLeaderboard = () => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'score' | 'time' | 'puzzles'>('score');

  useEffect(() => {
    loadLeaderboard();
  }, [sortBy]);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      
      let orderBy = 'best_score';
      let ascending = false;
      
      if (sortBy === 'time') {
        orderBy = 'best_time';
        ascending = true;
      } else if (sortBy === 'puzzles') {
        orderBy = 'puzzles_completed';
        ascending = false;
      }
      
      const { data, error } = await supabase
        .from('crossword_leaderboard')
        .select('*')
        .order(orderBy, { ascending })
        .limit(20);
      
      if (error) throw error;
      
      setLeaderboard(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `#${index + 1}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Crossword Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Crossword Leaderboard
        </CardTitle>
        <div className="flex gap-2 mt-4">
          <Badge
            variant={sortBy === 'score' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSortBy('score')}
          >
            <Target className="h-3 w-3 mr-1" />
            Best Score
          </Badge>
          <Badge
            variant={sortBy === 'time' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSortBy('time')}
          >
            <Clock className="h-3 w-3 mr-1" />
            Best Time
          </Badge>
          <Badge
            variant={sortBy === 'puzzles' ? 'default' : 'outline'}
            className="cursor-pointer"
            onClick={() => setSortBy('puzzles')}
          >
            <User className="h-3 w-3 mr-1" />
            Most Puzzles
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {leaderboard.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No players yet. Be the first to complete a puzzle!
          </div>
        ) : (
          <div className="space-y-3">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.user_id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  index < 3 ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-lg font-bold min-w-[40px]">
                    {getRankIcon(index)}
                  </div>
                  <div>
                    <div className="font-medium">{entry.username}</div>
                    <div className="text-sm text-muted-foreground">
                      {entry.puzzles_completed} puzzles completed
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">
                    {sortBy === 'score' && `${entry.best_score} pts`}
                    {sortBy === 'time' && formatTime(entry.best_time)}
                    {sortBy === 'puzzles' && `${entry.puzzles_completed} puzzles`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {sortBy !== 'score' && `${entry.best_score} pts`}
                    {sortBy !== 'time' && formatTime(entry.best_time)}
                    {sortBy !== 'puzzles' && `Total: ${entry.total_score}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};