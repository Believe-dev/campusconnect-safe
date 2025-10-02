import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Zap, Timer } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface TapGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

export const TapGame = ({ level, onGameComplete }: TapGameProps) => {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(8, 20 - level * 2));
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsPlaying(false);
            setGameEnded(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, timeLeft]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(Math.max(8, 20 - level * 2));
    setIsPlaying(true);
    setGameEnded(false);
  };

  const handleTap = () => {
    if (isPlaying) {
      setScore(prev => prev + 1);
    }
  };

  const finishGame = () => {
    setIsPlaying(false);
    if (score > level * 10) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, 'tap');
  };

  return (
    <div className="relative">
      <GameMusic gameType="tap" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Quick Tap Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Taps</p>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / Math.max(8, 20 - level * 2)) * 100} className="flex-1" />
          <span className="text-sm font-medium">{timeLeft}s</span>
        </div>

        {!isPlaying && !gameEnded && (
          <Button onClick={startGame} className="w-full" size="lg">
            Start Game
          </Button>
        )}

        {isPlaying && (
          <Button 
            onClick={handleTap}
            className="w-full h-32 text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            size="lg"
          >
            TAP!
          </Button>
        )}

        {gameEnded && (
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold">Level {level} Complete!</h3>
              <p className="text-muted-foreground">
                You scored {score} taps in {Math.max(8, 20 - level * 2)} seconds
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={startGame} variant="outline" className="flex-1">
                Play Again
              </Button>
              <Button onClick={finishGame} className="flex-1">
                Collect Coins
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};