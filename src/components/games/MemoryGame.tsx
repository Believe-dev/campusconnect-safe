import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Target, RotateCcw } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface MemoryGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
}

interface MemoryCard {
  id: number;
  value: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const getCardValues = (level: number) => {
  const allCards = ['🎓', '📚', '💻', '🏫', '✏️', '🎒', '📝', '🔬', '📐', '🖊️', '📊', '🪑', '⚗️', '🔭', '📡', '🎯'];
  const pairCount = Math.min(4 + level, 8);
  return allCards.slice(0, pairCount);
};

export const MemoryGame = ({ level, onGameComplete }: MemoryGameProps) => {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matches, setMatches] = useState(0);
  const [moves, setMoves] = useState(0);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const saveKey = `savedGame_memory`;

  useEffect(() => {
    loadSavedGame();
  }, []);

  const saveGame = () => {
    if (!gameStarted || gameEnded) return;
    
    const gameState = {
      cards,
      flippedCards,
      matches,
      moves,
      startTime,
      level
    };
    
    localStorage.setItem(saveKey, JSON.stringify(gameState));
  };

  const loadSavedGame = () => {
    const savedData = localStorage.getItem(saveKey);
    if (savedData) {
      try {
        const gameState = JSON.parse(savedData);
        setCards(gameState.cards);
        setFlippedCards(gameState.flippedCards);
        setMatches(gameState.matches);
        setMoves(gameState.moves);
        setStartTime(gameState.startTime);
        setGameStarted(true);
        setGameEnded(false);
      } catch (error) {
        console.error('Error loading saved game:', error);
        localStorage.removeItem(saveKey);
      }
    }
  };

  const clearSavedGame = () => {
    localStorage.removeItem(saveKey);
  };

  const initializeGame = () => {
    clearSavedGame();
    const cardValues = getCardValues(level);
    const shuffledCards = [...cardValues, ...cardValues]
      .sort(() => Math.random() - 0.5)
      .map((value, index) => ({
        id: index,
        value,
        isFlipped: false,
        isMatched: false
      }));
    
    setCards(shuffledCards);
    setFlippedCards([]);
    setMatches(0);
    setMoves(0);
    setGameStarted(true);
    setGameEnded(false);
    setStartTime(Date.now());
  };

  const handleCardClick = (cardId: number) => {
    if (flippedCards.length === 2 || cards[cardId].isFlipped || cards[cardId].isMatched) {
      return;
    }

    const newFlippedCards = [...flippedCards, cardId];
    setFlippedCards(newFlippedCards);

    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlippedCards.length === 2) {
      setMoves(prev => prev + 1);
      
      const [firstCard, secondCard] = newFlippedCards.map(id => cards[id]);
      
      if (firstCard.value === secondCard.value) {
        // Match found
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            newFlippedCards.includes(card.id) 
              ? { ...card, isMatched: true }
              : card
          ));
          setMatches(prev => prev + 1);
          setFlippedCards([]);
          saveGame();
        }, 500);
      } else {
        // No match
        setTimeout(() => {
          setCards(prev => prev.map(card => 
            newFlippedCards.includes(card.id) 
              ? { ...card, isFlipped: false }
              : card
          ));
          setFlippedCards([]);
          saveGame();
        }, 1000);
      }
    }
  };

  useEffect(() => {
    const cardValues = getCardValues(level);
    if (matches === cardValues.length && gameStarted) {
      setGameEnded(true);
      setEndTime(Date.now());
      clearSavedGame();
    }
  }, [matches, gameStarted, level]);

  const calculateScore = () => {
    const timeBonus = Math.max(0, 300 - Math.floor((endTime - startTime) / 1000));
    const moveBonus = Math.max(0, 50 - moves);
    return timeBonus + moveBonus + (matches * 10);
  };

  const finishGame = () => {
    clearSavedGame();
    setGameStarted(false);
    const finalScore = calculateScore();
    if (finalScore > 100) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(finalScore, 'memory');
  };

  if (!gameStarted) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Memory Match
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div>
            <p className="text-muted-foreground mb-4">
              Match all the pairs of cards to win UniCoins!
            </p>
            <p className="text-sm text-muted-foreground">
              Faster completion and fewer moves = more coins
            </p>
          </div>
          <Button onClick={initializeGame} className="w-full" size="lg">
            {localStorage.getItem(saveKey) ? "Continue Game" : "Start Game"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (gameEnded) {
    const score = calculateScore();
    const timeTaken = Math.floor((endTime - startTime) / 1000);
    
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Game Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div>
            <div className="text-4xl font-bold text-green-600 mb-2">{score}</div>
            <p className="text-muted-foreground">Level {level} Points Earned</p>
          </div>
          <div className="text-sm space-y-1">
            <p>Time: {timeTaken} seconds</p>
            <p>Moves: {moves}</p>
            <p>Matches: {matches}/{getCardValues(level).length}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={initializeGame} variant="outline" className="flex-1">
              <RotateCcw className="h-4 w-4 mr-2" />
              Play Again
            </Button>
            <Button onClick={finishGame} className="flex-1">
              Collect Coins
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <GameMusic gameType="memory" isPlaying={gameStarted && !gameEnded} />
      <Card className="max-w-lg mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Memory Match
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between text-sm">
          <span>Moves: {moves}</span>
          <span>Matches: {matches}/{getCardValues(level).length}</span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {cards.map((card) => (
            <Button
              key={card.id}
              variant="outline"
              className={`aspect-square text-2xl p-0 ${
                card.isMatched 
                  ? 'bg-green-100 border-green-500' 
                  : card.isFlipped 
                    ? 'bg-blue-100 border-blue-500' 
                    : 'bg-gray-100'
              }`}
              onClick={() => handleCardClick(card.id)}
              disabled={card.isMatched}
            >
              {card.isFlipped || card.isMatched ? card.value : '?'}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
    </div>
  );
};