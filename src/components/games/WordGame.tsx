import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Timer } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface WordGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

const wordsByLevel = {
  1: ['CAT', 'DOG', 'SUN', 'CAR', 'BOOK', 'TREE', 'FISH', 'BIRD'],
  2: ['HOUSE', 'WATER', 'PHONE', 'CHAIR', 'TABLE', 'MUSIC', 'HAPPY', 'LIGHT'],
  3: ['SCHOOL', 'FRIEND', 'FAMILY', 'GARDEN', 'MARKET', 'OFFICE', 'TRAVEL', 'NATURE'],
  4: ['STUDENT', 'TEACHER', 'LIBRARY', 'SCIENCE', 'HISTORY', 'ENGLISH', 'KITCHEN', 'BEDROOM'],
  5: ['COMPUTER', 'INTERNET', 'HOMEWORK', 'VACATION', 'BIRTHDAY', 'HOSPITAL', 'SHOPPING', 'FOOTBALL'],
  6: ['UNIVERSITY', 'PROFESSOR', 'SEMESTER', 'TEXTBOOK', 'CAFETERIA', 'DORMITORY', 'LABORATORY', 'RESEARCH'],
  7: ['ASSIGNMENT', 'GRADUATION', 'SCHOLARSHIP', 'EXAMINATION', 'CURRICULUM', 'ACADEMIC', 'BACHELOR', 'FACULTY'],
  8: ['ENROLLMENT', 'TUITION', 'DIPLOMA', 'CERTIFICATE', 'KNOWLEDGE', 'EDUCATION', 'LEARNING', 'ACHIEVEMENT']
};

export const WordGame = ({ level, onGameComplete }: WordGameProps) => {
  const [currentWord, setCurrentWord] = useState('');
  const [scrambledWord, setScrambledWord] = useState('');
  const [userInput, setUserInput] = useState('');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(Math.max(30, 90 - level * 5));
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [questionsAnswered, setQuestionsAnswered] = useState(0);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const totalQuestions = 5 + level;

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      setIsPlaying(false);
      setGameEnded(true);
    }
  }, [isPlaying, timeLeft]);

  const scrambleWord = (word: string) => {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(Math.max(30, 90 - level * 5));
    setIsPlaying(true);
    setGameEnded(false);
    setUserInput('');
    setQuestionsAnswered(0);
    setUsedWords(new Set());
    generateNewWord();
  };

  const generateNewWord = () => {
    const levelWords = wordsByLevel[Math.min(level, 8)] || wordsByLevel[8];
    const availableWords = levelWords.filter(word => !usedWords.has(word));
    
    if (availableWords.length === 0) {
      setUsedWords(new Set());
      return generateNewWord();
    }
    
    const word = availableWords[Math.floor(Math.random() * availableWords.length)];
    setUsedWords(prev => new Set([...prev, word]));
    setCurrentWord(word);
    setScrambledWord(scrambleWord(word));
  };

  const checkAnswer = () => {
    if (userInput.toUpperCase() === currentWord) {
      setScore(prev => prev + 10);
      setUserInput('');
      setFeedback('Correct! +10 points');
      setTimeout(() => setFeedback(''), 1000);
      
      const newAnswered = questionsAnswered + 1;
      setQuestionsAnswered(newAnswered);
      
      if (newAnswered >= totalQuestions) {
        setIsPlaying(false);
        setGameEnded(true);
      } else {
        generateNewWord();
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
    onGameComplete(score, 'word');
  };

  return (
    <div className="relative">
      <GameMusic gameType="word" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Word Scramble
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold mb-2">{score}</div>
          <p className="text-muted-foreground">Points</p>
          <div className="text-sm text-muted-foreground mt-2">
            {questionsAnswered}/{totalQuestions} words
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4" />
          <Progress value={(timeLeft / Math.max(30, 90 - level * 5)) * 100} className="flex-1" />
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
              <p className="text-sm text-muted-foreground mb-2">Unscramble this word:</p>
              <div className="text-2xl font-bold tracking-wider">{scrambledWord}</div>
              {feedback && (
                <div className={`text-sm font-medium mt-2 ${feedback.includes('Correct') ? 'text-green-600' : 'text-red-600'}`}>
                  {feedback}
                </div>
              )}
            </div>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkAnswer()}
              className="w-full p-3 text-center text-lg border rounded-md"
              placeholder="Type your answer..."
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
              <p className="text-muted-foreground">You scored {score} points in {questionsAnswered} words</p>
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