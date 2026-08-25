import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Palette, Timer } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface ColorGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

const colors = [
  { name: 'RED', color: '#ef4444' },
  { name: 'BLUE', color: '#3b82f6' },
  { name: 'GREEN', color: '#22c55e' },
  { name: 'YELLOW', color: '#eab308' },
  { name: 'PURPLE', color: '#a855f7' },
  { name: 'ORANGE', color: '#f97316' },
  { name: 'PINK', color: '#ec4899' },
  { name: 'CYAN', color: '#06b6d4' }
];

export const ColorGame = ({ level, onGameComplete }: ColorGameProps) => {
  const [currentColor, setCurrentColor] = useState({ name: '', color: '' });
  const [displayColor, setDisplayColor] = useState('');
  const [options, setOptions] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45 - level * 2);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      setGameEnded(true);
    }
  }, [isPlaying, timeLeft]);

  const generateQuestion = () => {
    const correctColor = colors[Math.floor(Math.random() * colors.length)];
    const wrongColor = colors[Math.floor(Math.random() * colors.length)];
    
    setCurrentColor(correctColor);
    setDisplayColor(wrongColor.color);
    
    const shuffledOptions = [correctColor.name, wrongColor.name]
      .concat(colors.filter(c => c.name !== correctColor.name && c.name !== wrongColor.name)
      .slice(0, 2).map(c => c.name))
      .sort(() => Math.random() - 0.5);
    
    setOptions(shuffledOptions);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(45 - level * 2);
    setIsPlaying(true);
    setGameEnded(false);
    generateQuestion();
  };

  const selectAnswer = (answer: string) => {
    if (answer === currentColor.name) {
      setScore(prev => prev + 10);
    }
    generateQuestion();
  };

  const finishGame = () => {
    setIsPlaying(false);
    if (score > level * 5) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, 'color');
  };

  return (
    <div className="relative">
      <GameMusic gameType="color" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Color Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Points</p>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / (45 - level * 2)) * 100} className="flex-1" />
          <span className="text-sm font-medium">{timeLeft}s</span>
        </div>

        {!isPlaying && !gameEnded && (
          <Button onClick={startGame} className="w-full" size="lg">
            Start Game
          </Button>
        )}

        {isPlaying && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">What color name is displayed?</p>
              <div 
                className="text-4xl font-bold mb-4 p-4 rounded-lg"
                style={{ color: displayColor }}
              >
                {currentColor.name}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => selectAnswer(option)}
                  variant="outline"
                  className="h-12"
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        )}

        {gameEnded && (
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold">Level {level} Complete!</h3>
              <p className="text-muted-foreground">You scored {score} points</p>
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