import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FileText, Timer } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface FillWordGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

const sentencesByLevel = {
  1: [
    { sentence: 'The ___ is bright', answer: 'SUN', hint: 'Shines in the sky' },
    { sentence: 'I have a pet ___', answer: 'CAT', hint: 'Says meow' },
    { sentence: 'The ___ is red', answer: 'CAR', hint: 'Vehicle with wheels' }
  ],
  2: [
    { sentence: 'I read a ___ every day', answer: 'BOOK', hint: 'Has pages' },
    { sentence: 'The ___ has green leaves', answer: 'TREE', hint: 'Tall plant' },
    { sentence: 'We live in a big ___', answer: 'HOUSE', hint: 'Place to live' }
  ],
  3: [
    { sentence: 'Students go to ___ to learn', answer: 'SCHOOL', hint: 'Educational institution' },
    { sentence: 'My best ___ helps me always', answer: 'FRIEND', hint: 'Close companion' },
    { sentence: 'The ___ is very important', answer: 'FAMILY', hint: 'Related people' }
  ]
};

export const FillWordGame = ({ level, onGameComplete }: FillWordGameProps) => {
  const [currentSentence, setCurrentSentence] = useState({ sentence: '', answer: '', hint: '' });
  const [userAnswer, setUserAnswer] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(40, 100 - level * 6));
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [usedSentences, setUsedSentences] = useState<Set<number>>(new Set());
  const totalQuestions = 4 + level;

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      setGameEnded(true);
    }
  }, [isPlaying, timeLeft]);

  const generateSentence = () => {
    const levelSentences = sentencesByLevel[Math.min(level, 3)] || sentencesByLevel[3];
    const availableIndices = levelSentences
      .map((_, index) => index)
      .filter(index => !usedSentences.has(index));
    
    if (availableIndices.length === 0) {
      setUsedSentences(new Set());
      return generateSentence();
    }
    
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setUsedSentences(prev => new Set([...prev, randomIndex]));
    setCurrentSentence(levelSentences[randomIndex]);
    setShowHint(false);
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(Math.max(40, 100 - level * 6));
    setIsPlaying(true);
    setGameEnded(false);
    setUserAnswer('');
    setQuestionsAnswered(0);
    setUsedSentences(new Set());
    generateSentence();
  };

  const checkAnswer = () => {
    if (userAnswer.toUpperCase() === currentSentence.answer) {
      setScore(prev => prev + 12);
      setUserAnswer('');
      setFeedback('Correct! +12 points');
      setTimeout(() => setFeedback(''), 1000);
      
      const newAnswered = questionsAnswered + 1;
      setQuestionsAnswered(newAnswered);
      
      if (newAnswered >= totalQuestions) {
        setIsPlaying(false);
        setGameEnded(true);
      } else {
        setTimeout(() => generateSentence(), 1000);
      }
    } else {
      setFeedback('Wrong! Try again');
      setTimeout(() => setFeedback(''), 1500);
    }
  };

  const finishGame = () => {
    setIsPlaying(false);
    if (questionsAnswered >= totalQuestions * 0.7) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, 'fillword');
  };

  return (
    <div className="relative">
      <GameMusic gameType="fillword" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Fill in the Word
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Points</p>
          <div className="text-sm text-muted-foreground mt-2">
            {questionsAnswered}/{totalQuestions} sentences
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / Math.max(40, 100 - level * 6)) * 100} className="flex-1" />
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
              <p className="text-sm text-muted-foreground mb-2">Fill in the blank:</p>
              <div className="text-lg font-medium mb-4 p-3 bg-muted rounded-lg">
                {currentSentence.sentence}
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                ({currentSentence.answer.length} letters)
              </div>
              {showHint && (
                <div className="text-sm text-blue-600 mb-2">
                  Hint: {currentSentence.hint}
                </div>
              )}
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
              placeholder="Enter word..."
              maxLength={currentSentence.answer.length}
              autoFocus
            />
            <div className="flex gap-2">
              <Button onClick={() => setShowHint(true)} variant="outline" className="flex-1">
                Show Hint
              </Button>
              <Button onClick={checkAnswer} className="flex-1">
                Submit
              </Button>
            </div>
          </div>
        )}

        {gameEnded && (
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-xl font-bold">Level {level} Complete!</h3>
              <p className="text-muted-foreground">You scored {score} points in {questionsAnswered} sentences</p>
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