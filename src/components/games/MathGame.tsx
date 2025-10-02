import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calculator, Timer } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface MathGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

export const MathGame = ({ level, onGameComplete }: MathGameProps) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(90 - level * 3);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [usedProblems, setUsedProblems] = useState<Set<string>>(new Set());
  const totalQuestions = 8 + level * 2;

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
    const operations = ['+', '-', '*'];
    let questionStr, result;
    let attempts = 0;
    
    do {
      const operation = operations[Math.floor(Math.random() * operations.length)];
      let num1, num2;
      
      switch (operation) {
        case '+':
          num1 = Math.floor(Math.random() * (10 + level * 5)) + 1;
          num2 = Math.floor(Math.random() * (10 + level * 5)) + 1;
          result = num1 + num2;
          break;
        case '-':
          num1 = Math.floor(Math.random() * (20 + level * 5)) + 10;
          num2 = Math.floor(Math.random() * num1) + 1;
          result = num1 - num2;
          break;
        case '*':
          num1 = Math.floor(Math.random() * (5 + level)) + 2;
          num2 = Math.floor(Math.random() * (5 + level)) + 2;
          result = num1 * num2;
          break;
        default:
          num1 = 1; num2 = 1; result = 2;
      }
      
      questionStr = `${num1} ${operation} ${num2}`;
      attempts++;
    } while (usedProblems.has(questionStr) && attempts < 50);
    
    if (attempts >= 50) {
      setUsedProblems(new Set());
    } else {
      setUsedProblems(prev => new Set([...prev, questionStr]));
    }
    
    setQuestion(questionStr);
    setAnswer(result);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(90 - level * 3);
    setIsPlaying(true);
    setGameEnded(false);
    setUserAnswer('');
    setQuestionsAnswered(0);
    setUsedProblems(new Set());
    generateQuestion();
  };

  const checkAnswer = () => {
    const newAnswered = questionsAnswered + 1;
    setQuestionsAnswered(newAnswered);
    
    if (parseInt(userAnswer) === answer) {
      setScore(prev => prev + 5);
      setFeedback('Correct! +5 points');
    } else {
      setFeedback('Wrong! Correct answer: ' + answer);
    }
    
    setUserAnswer('');
    setTimeout(() => setFeedback(''), 1200);
    
    if (newAnswered >= totalQuestions) {
      setIsPlaying(false);
      setGameEnded(true);
    } else {
      setTimeout(() => generateQuestion(), 1200);
    }
  };

  const finishGame = () => {
    setIsPlaying(false);
    if (questionsAnswered >= totalQuestions * 0.7) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, 'math');
  };

  return (
    <div className="relative">
      <GameMusic gameType="math" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Math Challenge
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Points</p>
          <div className="text-sm text-muted-foreground mt-2">
            {questionsAnswered}/{totalQuestions} problems
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / (90 - level * 3)) * 100} className="flex-1" />
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
              <div className="text-3xl font-bold mb-4">{question} = ?</div>
              {feedback && (
                <div className={`text-sm font-medium mb-2 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback}
                </div>
              )}
            </div>
            <input
              type="number"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
              className="w-full p-3 text-center text-lg border rounded-md"
              placeholder="Enter answer..."
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
              <p className="text-muted-foreground">You scored {score} points in {questionsAnswered} problems</p>
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