import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Gamepad2,
  Coins,
  Trophy,
  Zap,
  Brain,
  Target,
  BookOpen,
  Calculator,
  Palette,
  Clock,
  Grid3X3,
  FileText,
} from "lucide-react";
import { PremiumGameBadge } from "@/components/games/PremiumGameBadge";
import { toast } from "sonner";
import Header from "@/components/layout/Header";
import { TapGame } from "@/components/games/TapGame";
import { QuizGame } from "@/components/games/QuizGame";
import { MemoryGame } from "@/components/games/MemoryGame";
import { WordGame } from "@/components/games/WordGame";
import { MathGame } from "@/components/games/MathGame";
import { ColorGame } from "@/components/games/ColorGame";
import { ReactionGame } from "@/components/games/ReactionGame";
import { InteractiveCrosswordGame } from "@/components/games/InteractiveCrosswordGame";
import { FillWordGame } from "@/components/games/FillWordGame";

interface GameStats {
  unicoins_balance: number;
  games_played: number;
  total_score: number;
  best_streak: number;
  tap_level: number;
  quiz_level: number;
  memory_level: number;
  word_level: number;
  math_level: number;
  color_level: number;
  reaction_level: number;
  crossword_level: number;
  fillword_level: number;
  overall_game_level: number;
}

interface GameBadgeData {
  overall_level: number;
  badge_type: "bronze" | "silver" | "gold" | "none";
  is_premium: boolean;
}

const Games = () => {
  const { user } = useAuth();
  const [gameStats, setGameStats] = useState<GameStats>({
    unicoins_balance: 0,
    games_played: 0,
    total_score: 0,
    best_streak: 0,
    tap_level: 1,
    quiz_level: 1,
    memory_level: 1,
    word_level: 1,
    math_level: 1,
    color_level: 1,
    reaction_level: 1,
    crossword_level: 1,
    fillword_level: 1,
    overall_game_level: 1,
  });
  const [gameBadge, setGameBadge] = useState<GameBadgeData | null>(null);
  const [activeGame, setActiveGame] = useState<string | null>(() => {
    return sessionStorage.getItem('activeGame') || null;
  });
  const [savedGames, setSavedGames] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);

  useEffect(() => {
    if (activeGame) {
      sessionStorage.setItem('activeGame', activeGame);
    } else {
      sessionStorage.removeItem('activeGame');
    }
  }, [activeGame]);

  useEffect(() => {
    if (user) {
      fetchGameStats();
      fetchGameBadge();
      loadSavedGames();
    }
  }, [user]);

  const loadSavedGames = () => {
    const saved: Record<string, any> = {};
    const gameIds = ['quiz', 'memory', 'word', 'math', 'color', 'reaction', 'tap', 'crossword', 'fillword'];
    gameIds.forEach(gameId => {
      const savedData = localStorage.getItem(`savedGame_${gameId}`);
      if (savedData) {
        try {
          saved[gameId] = JSON.parse(savedData);
        } catch (error) {
          console.error(`Error parsing saved game data for ${gameId}:`, error);
        }
      }
    });
    setSavedGames(saved);
  };

  const fetchGameStats = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("game_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && !error.message.includes("No rows")) {
        throw error;
      }

      if (data) {
        setGameStats(data);
      }
    } catch (error) {
      console.error("Error fetching game stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGameBadge = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc("get_user_game_badge", {
        p_user_id: user.id,
      });

      if (error) throw error;
      if (data && data.length > 0) {
        setGameBadge(data[0]);
      }
    } catch (error) {
      console.error("Error fetching game badge:", error);
    }
  };

  const awardUniCoins = async (amount: number, gameType: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc("award_unicoins_and_level_up", {
        p_user_id: user.id,
        p_amount: amount,
        p_game_type: gameType,
      });

      if (error) throw error;

      toast.success(`+${amount} UniCoins earned! Level up!`);
      fetchGameStats();
      fetchGameBadge();
    } catch (error) {
      console.error("Error awarding UniCoins:", error);
      toast.error("Failed to award UniCoins");
    }
  };

  const clearGameData = async () => {
    if (!user) return;

    try {
      // Clear saved games from localStorage
      const gameIds = ['quiz', 'memory', 'word', 'math', 'color', 'reaction', 'tap', 'crossword', 'fillword'];
      gameIds.forEach(gameId => {
        localStorage.removeItem(`savedGame_${gameId}`);
      });
      sessionStorage.removeItem('activeGame');
      
      // Clear database stats (only game_stats, not transactions)
      const { error } = await supabase
        .from('game_stats')
        .update({
          games_played: 0,
          total_score: 0,
          best_streak: 0,
          tap_level: 1,
          quiz_level: 1,
          memory_level: 1,
          word_level: 1,
          math_level: 1,
          color_level: 1,
          reaction_level: 1,
          crossword_level: 1,
          fillword_level: 1,
          overall_game_level: 1
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast.success("Game data cleared successfully!");
      setShowClearDialog(false);
      setSavedGames({});
      fetchGameStats();
      fetchGameBadge();
    } catch (error) {
      console.error("Error clearing game data:", error);
      toast.error("Failed to clear game data");
    }
  };

  const games = [
    {
      id: "quiz",
      name: "Campus Quiz",
      description: "Test your knowledge",
      icon: Brain,
      reward: "10-25 UniCoins",
      component: QuizGame,
      level: gameStats.quiz_level,
    },
    {
      id: "memory",
      name: "Memory Match",
      description: "Match the cards",
      icon: Target,
      reward: "8-20 UniCoins",
      component: MemoryGame,
      level: gameStats.memory_level,
    },
    {
      id: "word",
      name: "Word Scramble",
      description: "Unscramble the words",
      icon: BookOpen,
      reward: "6-18 UniCoins",
      component: WordGame,
      level: gameStats.word_level,
    },
    {
      id: "math",
      name: "Math Challenge",
      description: "Solve math problems",
      icon: Calculator,
      reward: "7-21 UniCoins",
      component: MathGame,
      level: gameStats.math_level,
    },
    {
      id: "color",
      name: "Color Match",
      description: "Match colors correctly",
      icon: Palette,
      reward: "5-16 UniCoins",
      component: ColorGame,
      level: gameStats.color_level,
    },
    {
      id: "reaction",
      name: "Reaction Test",
      description: "Test your reflexes",
      icon: Clock,
      reward: "4-14 UniCoins",
      component: ReactionGame,
      level: gameStats.reaction_level,
    },
    {
      id: "tap",
      name: "Quick Tap",
      description: "Tap as fast as you can!",
      icon: Zap,
      reward: "5-15 UniCoins",
      component: TapGame,
      level: gameStats.tap_level,
    },
    {
      id: "crossword",
      name: "Crossword Clues",
      description: "Solve crossword clues",
      icon: Grid3X3,
      reward: "9-24 UniCoins",
      component: InteractiveCrosswordGame,
      level: gameStats.crossword_level,
    },
    {
      id: "fillword",
      name: "Fill the Word",
      description: "Complete the sentences",
      icon: FileText,
      reward: "8-22 UniCoins",
      component: FillWordGame,
      level: gameStats.fillword_level,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded mb-4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (activeGame) {
    const GameComponent = games.find((g) => g.id === activeGame)?.component;
    if (GameComponent) {
      return (
        <div className="min-h-screen bg-background">
          <Header />
          <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="flex gap-2 mb-4">
                <Button
                  variant="outline"
                  onClick={() => setActiveGame(null)}
                >
                  ← Back to Games
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const currentGame = activeGame;
                    // Clear saved game and session
                    localStorage.removeItem(`savedGame_${currentGame}`);
                    sessionStorage.removeItem('activeGame');
                    setSavedGames(prev => {
                      const updated = { ...prev };
                      delete updated[currentGame!];
                      return updated;
                    });
                    // Restart the game
                    setActiveGame(null);
                    setTimeout(() => setActiveGame(currentGame), 50);
                  }}
                >
                  🔄 Restart Game
                </Button>
              </div>
              <GameComponent
                level={games.find((g) => g.id === activeGame)?.level || 1}
                userId={user?.id || "guest"}
                onGameComplete={(score: number, gameType: string) => {
                  const coins = Math.floor(score / 10) + 5;
                  awardUniCoins(coins, gameType);
                  setActiveGame(null);
                }}
              />
            </div>
          </main>
        </div>
      );
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 pb-24 md:pb-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-primary" />
              <h1 className="text-3xl font-bold text-primary">UniGames</h1>
            </div>
            {gameBadge && gameBadge.is_premium && (
              <PremiumGameBadge
                level={gameBadge.overall_level}
                badgeType={gameBadge.badge_type}
                isPremium={gameBadge.is_premium}
                size="lg"
              />
            )}
          </div>

          {/* UniCoins Balance */}
          <Card className="mb-6 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-600" />
                Your UniCoins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600 mb-2">
                {gameStats.unicoins_balance.toLocaleString()} UC
              </div>
              <p className="text-muted-foreground">
                Play games to earn more UniCoins!
              </p>
            </CardContent>
          </Card>

          {/* Game Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {gameStats.overall_game_level}
                </div>
                <p className="text-sm text-muted-foreground">Overall Level</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Gamepad2 className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {gameStats.games_played}
                </div>
                <p className="text-sm text-muted-foreground">Games Played</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {gameStats.total_score.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">Total Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Zap className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <div className="text-2xl font-bold">
                  {gameStats.best_streak}
                </div>
                <p className="text-sm text-muted-foreground">Best Streak</p>
              </CardContent>
            </Card>
          </div>

          {/* Available Games */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game) => {
              const IconComponent = game.icon;
              return (
                <Card
                  key={game.id}
                  className="hover:shadow-lg transition-shadow"
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {game.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {game.description}
                    </p>
                    <div className="flex items-center justify-between mb-4">
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800"
                      >
                        {game.reward}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700"
                      >
                        Level {game.level}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => setActiveGame(game.id)}
                      className="w-full"
                    >
                      {savedGames[game.id] ? "Continue Playing" : "Play Now"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {/* Achievements Tab */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Achievements & Stickers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[3, 6, 9, 12, 15, 18, 21, 24, 27, 30].map((milestone) => {
                  const achievements = {
                    tap: gameStats.tap_level >= milestone,
                    quiz: gameStats.quiz_level >= milestone,
                    memory: gameStats.memory_level >= milestone,
                    word: gameStats.word_level >= milestone,
                    math: gameStats.math_level >= milestone,
                    color: gameStats.color_level >= milestone,
                    reaction: gameStats.reaction_level >= milestone,
                  };

                  return (
                    <div
                      key={milestone}
                      className="text-center p-3 border rounded-lg"
                    >
                      <div className="text-lg font-bold mb-2">
                        Level {milestone}
                      </div>
                      <div className="space-y-1">
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.tap
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          ⚡ {achievements.tap ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.quiz
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          🧠 {achievements.quiz ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.memory
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          🎯 {achievements.memory ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.word
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          📚 {achievements.word ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.math
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          🧮 {achievements.math ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.color
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          🎨 {achievements.color ? "✓" : "✗"}
                        </div>
                        <div
                          className={`text-xs px-1 py-0.5 rounded ${
                            achievements.reaction
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          ⏱️ {achievements.reaction ? "✓" : "✗"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-center">
                <Button variant="destructive" size="sm" onClick={() => setShowClearDialog(true)}>
                  Clear All Game Data
                </Button>
              </div>
            </CardContent>
          </Card>
          {/* UniCoins Shop Preview */}
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>UniCoins Shop</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Use your UniCoins to unlock premium features:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Premium Profile Badge</span>
                  <Badge variant="outline">500 UC</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Featured Product Listing</span>
                  <Badge variant="outline">200 UC</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Priority Customer Support</span>
                  <Badge variant="outline">300 UC</Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded">
                  <span>Extended Product Gallery</span>
                  <Badge variant="outline">150 UC</Badge>
                </div>
              </div>
              <Button variant="outline" className="w-full mt-4" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>

          {/* Clear Data Confirmation Dialog */}
          <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear All Game Data</DialogTitle>
                <DialogDescription>
                  Are you sure you want to clear all your game progress? This will reset all your levels, scores, and achievements. Your UniCoins will remain unchanged.
                  <br /><br />
                  <strong>This action cannot be undone.</strong>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowClearDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={clearGameData}>
                  Clear Data
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
};

export default Games;
