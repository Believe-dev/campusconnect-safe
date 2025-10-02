import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Clock } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface ReactionGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

export const ReactionGame = ({ level, onGameComplete }: ReactionGameProps) => {
  const [gameState, setGameState] = useState<'waiting' | 'ready' | 'go' | 'clicked' | 'ended'>('waiting');
  const [reactionTime, setReactionTime] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [averageTime, setAverageTime] = useState(0);
  const startTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const maxAttempts = 5 + level;

  const startGame = () => {
    setGameState('waiting');
    setAttempts(0);
    setTotalTime(0);
    setAverageTime(0);
    startRound();
  };

  const startRound = () => {
    setGameState('ready');
    const delay = Math.random() * 3000 + 1000; // 1-4 seconds
    
    timeoutRef.current = setTimeout(() => {
      setGameState('go');
      startTimeRef.current = Date.now();
    }, delay);
  };

  const handleClick = () => {
    if (gameState === 'ready') {
      // Clicked too early
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setGameState('waiting');
      setTimeout(startRound, 1000);
    } else if (gameState === 'go') {
      const time = Date.now() - startTimeRef.current;
      setReactionTime(time);
      setGameState('clicked');
      
      const newAttempts = attempts + 1;
      const newTotalTime = totalTime + time;
      setAttempts(newAttempts);
      setTotalTime(newTotalTime);
      setAverageTime(Math.round(newTotalTime / newAttempts));
      
      if (newAttempts >= maxAttempts) {
        setGameState('ended');
      } else {
        setTimeout(startRound, 1500);
      }
    }
  };

  const finishGame = () => {
    const score = Math.max(0, 1000 - averageTime);
    if (averageTime < 400) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(Math.round(score / 10), 'reaction');
  };

  const getBackgroundColor = () => {
    switch (gameState) {
      case 'ready': return 'bg-red-500';
      case 'go': return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  const getMessage = () => {
    switch (gameState) {
      case 'waiting': return 'Get Ready...';
      case 'ready': return 'Wait for GREEN...';
      case 'go': return 'CLICK NOW!';
      case 'clicked': return `${reactionTime}ms`;
      case 'ended': return `Average: ${averageTime}ms`;
      default: return '';
    }
  };

  return (
    <div className="relative">
      <GameMusic gameType="reaction" isPlaying={gameState !== 'waiting' && gameState !== 'ended'} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Reaction Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">
            {attempts}/{maxAttempts}
          </div>
          <p className="text-muted-foreground">Attempts</p>
        </div>

        {gameState === 'waiting' && attempts === 0 && (
          <Button onClick={startGame} className="w-full" size="lg">
            Start Test
          </Button>
        )}

        {(gameState !== 'waiting' || attempts > 0) && gameState !== 'ended' && (
          <div
            className={`w-full h-48 rounded-lg cursor-pointer transition-colors duration-200 flex items-center justify-center ${getBackgroundColor()}`}
            onClick={handleClick}
          >
            <div className="text-white text-2xl font-bold text-center">
              {getMessage()}
            </div>
          </div>
        )}

        {gameState === 'ended' && (
          <div className="text-center space-y-4">
            <div className={`w-full h-32 rounded-lg flex items-center justify-center bg-blue-500`}>
              <div className="text-white text-xl font-bold">
                {getMessage()}
              </div>
            </div>
            <div>
              <h3 className="text-xl font-bold">Level {level} Complete!</h3>
              <p className="text-muted-foreground">
                Average reaction time: {averageTime}ms
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={startGame} variant="outline" className="flex-1">
                Try Again
              </Button>
              <Button onClick={finishGame} className="flex-1">
                Collect Coins
              </Button>
            </div>
          </div>
        )}

        {gameState === 'clicked' && attempts < maxAttempts && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Next round starting...
            </p>
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  );
};