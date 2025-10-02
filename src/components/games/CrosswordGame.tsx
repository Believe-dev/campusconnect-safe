import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Grid3X3, Timer } from 'lucide-react';

interface CrosswordGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

const crosswordsByLevel = {
  1: [
    { word: 'CAT', clue: 'Pet that meows', answer: 'CAT' },
    { word: 'DOG', clue: 'Pet that barks', answer: 'DOG' },
    { word: 'SUN', clue: 'Bright star in sky', answer: 'SUN' }
  ],
  2: [
    { word: 'BOOK', clue: 'You read this', answer: 'BOOK' },
    { word: 'TREE', clue: 'Tall plant with leaves', answer: 'TREE' },
    { word: 'FISH', clue: 'Swims in water', answer: 'FISH' }
  ],
  3: [
    { word: 'SCHOOL', clue: 'Place of learning', answer: 'SCHOOL' },
    { word: 'FRIEND', clue: 'Close companion', answer: 'FRIEND' },
    { word: 'FAMILY', clue: 'Related people group', answer: 'FAMILY' }
  ]
};

export const CrosswordGame = ({ level, onGameComplete }: CrosswordGameProps) => {
  const [currentClue, setCurrentClue] = useState({ word: '', clue: '', answer: '' });
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(45, 120 - level * 8));
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const totalQuestions = 3 + level;

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      setGameEnded(true);
    }
  }, [isPlaying, timeLeft]);

  const generateClue = () => {
    const levelClues = crosswordsByLevel[Math.min(level, 3)] || crosswordsByLevel[3];
    const clue = levelClues[Math.floor(Math.random() * levelClues.length)];
    setCurrentClue(clue);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(Math.max(45, 120 - level * 8));
    setIsPlaying(true);
    setGameEnded(false);
    setUserAnswer('');
    setQuestionsAnswered(0);
    generateClue();
  };

  const checkAnswer = () => {
    if (userAnswer.toUpperCase() === currentClue.answer) {
      setScore(prev => prev + 15);
      setUserAnswer('');
      setFeedback('Correct! +15 points');
      setTimeout(() => setFeedback(''), 1000);
      
      const newAnswered = questionsAnswered + 1;
      setQuestionsAnswered(newAnswered);
      
      if (newAnswered >= totalQuestions) {
        setIsPlaying(false);
        setGameEnded(true);
      } else {
        setTimeout(() => generateClue(), 1000);
      }
    } else {
      setFeedback('Wrong! Try again');
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const finishGame = () => {
    onGameComplete(score, 'crossword');
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Grid3X3 className="h-5 w-5" />
          Crossword Clues
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Points</p>
          <div className="text-sm text-muted-foreground mt-2">
            {questionsAnswered}/{totalQuestions} clues
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / Math.max(45, 120 - level * 8)) * 100} className="flex-1" />
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
              <p className="text-sm text-muted-foreground mb-2">Solve this clue:</p>
              <div className="text-lg font-medium mb-4 p-3 bg-muted rounded-lg">
                "{currentClue.clue}"
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                ({currentClue.answer.length} letters)
              </div>
              {feedback && (
                <div className={`text-sm font-medium mb-2 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback}
                </div>
              )}
            </div>
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
              className="w-full p-3 text-center text-lg border rounded-md uppercase"
              placeholder="Enter answer..."
              maxLength={currentClue.answer.length}
              autoFocus
            />
            <Button onClick={checkAnswer} className="w-full">
              Submit Answer
            </Button>
          </div>
        )}

        {gameEnded && (
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold">Level {level} Complete!</h3>
              <p className="text-muted-foreground">You scored {score} points in {questionsAnswered} clues</p>
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
  );
};