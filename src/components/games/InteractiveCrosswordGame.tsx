import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Grid3X3, Timer, Trophy, Volume2, VolumeX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  generateDailyCrossword,
  validateCrosswordSolution,
  CrosswordPuzzle,
} from "@/utils/crosswordGenerator";
import { GameMusic } from "./GameMusic";
import { soundEffects } from "@/utils/soundEffects";

interface CrosswordGameProps {
  level: number;
  userId?: string;
  onGameComplete: (score: number, gameType: string) => void;
  onRestart?: () => void;
}

interface LeaderboardEntry {
  user_id: string;
  username: string;
  best_time: number;
  best_score: number;
  puzzles_completed: number;
}

export const InteractiveCrosswordGame = ({
  level,
  userId,
  onGameComplete,
  onRestart,
}: CrosswordGameProps) => {
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [selectedWord, setSelectedWord] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [completedWords, setCompletedWords] = useState<Set<number>>(new Set());
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const saveKey = `savedGame_crossword`;

  useEffect(() => {
    // Initialize background music
    audioRef.current = new Audio("/crossword-music.mp3");
    audioRef.current.loop = true;
    audioRef.current.volume = 0.3;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
        saveGame();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      endGame();
    }
  }, [isPlaying, timeLeft]);

  useEffect(() => {
    loadLeaderboard();
    loadSavedGame();
  }, []);

  const saveGame = () => {
    if (!isPlaying || !puzzle) return;
    
    const gameState = {
      puzzle,
      userGrid,
      selectedCell,
      selectedWord,
      score,
      timeLeft,
      startTime,
      completedWords: Array.from(completedWords),
      level
    };
    
    localStorage.setItem(saveKey, JSON.stringify(gameState));
  };

  const loadSavedGame = () => {
    const savedData = localStorage.getItem(saveKey);
    if (savedData) {
      try {
        const gameState = JSON.parse(savedData);
        setPuzzle(gameState.puzzle);
        setUserGrid(gameState.userGrid);
        setSelectedCell(gameState.selectedCell);
        setSelectedWord(gameState.selectedWord);
        setScore(gameState.score);
        setTimeLeft(gameState.timeLeft);
        setStartTime(gameState.startTime);
        setCompletedWords(new Set(gameState.completedWords));
        setIsPlaying(true);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPlaying) {
        e.preventDefault();
        handleKeyPress(e.key);
      }
    };

    if (isPlaying) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isPlaying, selectedCell, puzzle]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
      setIsMuted(!isMuted);
    }
  };

  const startGame = () => {
    clearSavedGame();
    const today = new Date().toDateString();
    const newPuzzle = generateDailyCrossword(today, level);
    setPuzzle(newPuzzle);
    setUserGrid(
      Array(newPuzzle.size)
        .fill(null)
        .map(() => Array(newPuzzle.size).fill(""))
    );
    setScore(0);
    setTimeLeft(300);
    setStartTime(Date.now());
    setIsPlaying(true);
    setGameEnded(false);
    setCompletedWords(new Set());
    setSelectedCell(null);
    setSelectedWord(null);
  };

  const endGame = () => {
    setIsPlaying(false);
    setGameEnded(true);
    clearSavedGame();

    const finalTime = startTime
      ? Math.floor((Date.now() - startTime) / 1000)
      : 300;
    saveGameResult(finalTime);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!puzzle || !isPlaying) return;

    // Check if cell is part of any word
    const wordAtCell = puzzle.words.find((word) => {
      if (word.direction === "across") {
        return (
          row === word.startRow &&
          col >= word.startCol &&
          col < word.startCol + word.word.length
        );
      } else {
        return (
          col === word.startCol &&
          row >= word.startRow &&
          row < word.startRow + word.word.length
        );
      }
    });

    if (wordAtCell) {
      setSelectedCell({ row, col });
      setSelectedWord(wordAtCell.number);
    }
  };

  const handleKeyPress = (key: string) => {
    if (!selectedCell || !puzzle || !isPlaying) return;

    const { row, col } = selectedCell;
    const newGrid = [...userGrid];

    if (key === "Backspace") {
      newGrid[row][col] = "";
    } else if (key.length === 1 && key.match(/[A-Za-z]/)) {
      newGrid[row][col] = key.toUpperCase();
    }

    setUserGrid(newGrid);
    checkWordCompletion(newGrid);
    saveGame();
  };

  const checkWordCompletion = (grid: string[][]) => {
    if (!puzzle) return;

    const validation = validateCrosswordSolution(puzzle, grid);

    // Update completed words
    const newCompletedWords = new Set(validation.correctWords);
    const previousSize = completedWords.size;

    setCompletedWords(newCompletedWords);

    // Award points for newly completed words
    if (newCompletedWords.size > previousSize) {
      const newlyCompleted = validation.correctWords.filter(
        (num) => !completedWords.has(num)
      );
      const pointsEarned = newlyCompleted.reduce((total, wordNum) => {
        const word = puzzle.words.find((w) => w.number === wordNum);
        return total + (word ? word.word.length * 10 : 0);
      }, 0);

      setScore((prev) => prev + pointsEarned);
    }

    // Check if puzzle is complete
    if (validation.isComplete && !gameEnded) {
      setTimeout(endGame, 1000);
    }
  };

  const getCellClass = (row: number, col: number): string => {
    if (!puzzle) return "bg-gray-100";

    const isPartOfWord = puzzle.words.some((word) => {
      if (word.direction === "across") {
        return (
          row === word.startRow &&
          col >= word.startCol &&
          col < word.startCol + word.word.length
        );
      } else {
        return (
          col === word.startCol &&
          row >= word.startRow &&
          row < word.startRow + word.word.length
        );
      }
    });

    if (!isPartOfWord) return "bg-gray-800";

    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isHighlighted =
      selectedWord &&
      puzzle.words.find(
        (w) =>
          w.number === selectedWord &&
          ((w.direction === "across" &&
            row === w.startRow &&
            col >= w.startCol &&
            col < w.startCol + w.word.length) ||
            (w.direction === "down" &&
              col === w.startCol &&
              row >= w.startRow &&
              row < w.startRow + w.word.length))
      );

    const correctLetter = puzzle.grid[row][col];
    const userLetter = userGrid[row]?.[col];
    const isCorrect = userLetter && userLetter === correctLetter;
    const isIncorrect = userLetter && userLetter !== correctLetter;

    let classes = "border border-gray-300 cursor-pointer transition-colors ";

    if (isSelected) classes += "bg-blue-200 ";
    else if (isHighlighted) classes += "bg-blue-100 ";
    else if (isCorrect) classes += "bg-green-100 ";
    else if (isIncorrect) classes += "bg-red-100 ";
    else classes += "bg-white ";

    return classes;
  };

  const loadLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("crossword_leaderboard")
        .select(
          `
          user_id,
          username,
          best_time,
          best_score,
          puzzles_completed
        `
        )
        .order("best_score", { ascending: false })
        .limit(10);

      if (!error && data) {
        setLeaderboard(data);
      }
    } catch (error) {
      console.error("Error loading leaderboard:", error);
    }
  };

  const saveGameResult = async (completionTime: number) => {
    if (!userId || !puzzle) return;

    try {
      await supabase.rpc("update_crossword_leaderboard", {
        p_user_id: userId,
        p_score: score,
        p_completion_time: completionTime,
        p_level: level,
      });

      loadLeaderboard();
    } catch (error) {
      console.error("Error saving game result:", error);
    }
  };

  const finishGame = () => {
    clearSavedGame();
    if (puzzle && completedWords.size === puzzle.words.length) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, "crossword");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="relative">
        <GameMusic gameType="crossword" isPlaying={isPlaying && !gameEnded} />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Grid3X3 className="h-5 w-5" />
                Interactive Crossword - Level {level}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  className="flex items-center gap-1"
                >
                  <Trophy className="h-4 w-4" />
                  Leaderboard
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Game Stats */}
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold mb-2">{score}</div>
                  <p className="text-muted-foreground">Points</p>
                </div>

                <div className="flex items-center gap-2">
                  <Timer className="h-4 w-4" />
                  <Progress value={(timeLeft / 300) * 100} className="flex-1" />
                  <span className="text-sm font-medium">
                    {Math.floor(timeLeft / 60)}:
                    {(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                </div>

                {puzzle && (
                  <div className="text-sm text-muted-foreground text-center">
                    {completedWords.size}/{puzzle.words.length} words completed
                  </div>
                )}

                {!isPlaying && !gameEnded && (
                  <Button onClick={startGame} className="w-full" size="lg">
                    {localStorage.getItem(saveKey) ? "Continue Puzzle" : "Start Daily Puzzle"}
                  </Button>
                )}

                {gameEnded && (
                  <div className="text-center space-y-4">
                    <div>
                      <h3 className="text-xl font-bold">Puzzle Complete!</h3>
                      <p className="text-muted-foreground">
                        Score: {score} points
                      </p>
                      <p className="text-muted-foreground">
                        Time:{" "}
                        {startTime
                          ? Math.floor((Date.now() - startTime) / 1000)
                          : 0}
                        s
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={startGame}
                        variant="outline"
                        className="flex-1"
                      >
                        New Puzzle
                      </Button>
                      <Button onClick={finishGame} className="flex-1">
                        Collect Coins
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Crossword Grid */}
              <div className="lg:col-span-2">
                {puzzle && (
                  <div className="space-y-4">
                    <div
                      className="grid gap-1 mx-auto"
                      style={{
                        gridTemplateColumns: `repeat(${puzzle.size}, 1fr)`,
                        maxWidth: "400px",
                      }}
                    >
                      {puzzle.grid.map((row, rowIndex) =>
                        row.map((_, colIndex) => (
                          <div
                            key={`${rowIndex}-${colIndex}`}
                            className={`w-8 h-8 flex items-center justify-center text-sm font-bold relative ${getCellClass(
                              rowIndex,
                              colIndex
                            )}`}
                            onClick={() => handleCellClick(rowIndex, colIndex)}
                          >
                            {/* Word number */}
                            {puzzle.words.find(
                              (w) =>
                                w.startRow === rowIndex &&
                                w.startCol === colIndex
                            ) && (
                              <span className="absolute top-0 left-0 text-xs text-blue-600 font-bold">
                                {
                                  puzzle.words.find(
                                    (w) =>
                                      w.startRow === rowIndex &&
                                      w.startCol === colIndex
                                  )?.number
                                }
                              </span>
                            )}
                            {userGrid[rowIndex]?.[colIndex] || ""}
                          </div>
                        ))
                      )}
                    </div>

                    {/* Clues */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <h4 className="font-bold mb-2">Across</h4>
                        {puzzle.words
                          .filter((w) => w.direction === "across")
                          .map((word) => (
                            <div
                              key={word.number}
                              className={`p-2 rounded cursor-pointer ${
                                selectedWord === word.number
                                  ? "bg-blue-100"
                                  : completedWords.has(word.number)
                                  ? "bg-green-100"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedWord(word.number)}
                            >
                              <span className="font-medium">
                                {word.number}.
                              </span>{" "}
                              {word.clue}
                            </div>
                          ))}
                      </div>
                      <div>
                        <h4 className="font-bold mb-2">Down</h4>
                        {puzzle.words
                          .filter((w) => w.direction === "down")
                          .map((word) => (
                            <div
                              key={word.number}
                              className={`p-2 rounded cursor-pointer ${
                                selectedWord === word.number
                                  ? "bg-blue-100"
                                  : completedWords.has(word.number)
                                  ? "bg-green-100"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => setSelectedWord(word.number)}
                            >
                              <span className="font-medium">
                                {word.number}.
                              </span>{" "}
                              {word.clue}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            {showLeaderboard && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Puzzle Solvers
                </h3>
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div
                      key={entry.user_id}
                      className="flex items-center justify-between p-2 bg-white rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">#{index + 1}</span>
                        <span>{entry.username}</span>
                      </div>
                      <div className="text-right text-sm">
                        <div>Score: {entry.best_score}</div>
                        <div>Time: {entry.best_time}s</div>
                        <div>Puzzles: {entry.puzzles_completed}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
