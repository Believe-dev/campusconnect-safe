export interface CrosswordWord {
  word: string;
  clue: string;
  startRow: number;
  startCol: number;
  direction: 'across' | 'down';
  number: number;
}

export interface CrosswordPuzzle {
  id: string;
  grid: string[][];
  words: CrosswordWord[];
  size: number;
}

const campusWords = {
  easy: [
    { word: 'CAT', clue: 'Pet that meows' },
    { word: 'DOG', clue: 'Pet that barks' },
    { word: 'SUN', clue: 'Bright star in sky' },
    { word: 'BOOK', clue: 'You read this' },
    { word: 'TREE', clue: 'Tall plant with leaves' },
    { word: 'FISH', clue: 'Swims in water' },
    { word: 'BIRD', clue: 'Flying animal' },
    { word: 'CAKE', clue: 'Sweet dessert' },
    { word: 'GAME', clue: 'Fun activity' },
    { word: 'LOVE', clue: 'Strong affection' }
  ],
  medium: [
    { word: 'SCHOOL', clue: 'Place of learning' },
    { word: 'FRIEND', clue: 'Close companion' },
    { word: 'FAMILY', clue: 'Related people group' },
    { word: 'LIBRARY', clue: 'Place to borrow books' },
    { word: 'STUDENT', clue: 'Person attending university' },
    { word: 'CAMPUS', clue: 'University grounds' },
    { word: 'DEGREE', clue: 'Academic qualification' },
    { word: 'STUDY', clue: 'Learn academic material' },
    { word: 'CLASS', clue: 'Educational session' },
    { word: 'PHONE', clue: 'Mobile device' },
    { word: 'LAPTOP', clue: 'Portable computer' },
    { word: 'STYLE', clue: 'Fashion sense' },
    { word: 'TREND', clue: 'Popular direction' },
    { word: 'OUTFIT', clue: 'Set of clothes' },
    { word: 'BRAND', clue: 'Fashion label' }
  ],
  hard: [
    { word: 'RESEARCH', clue: 'Academic investigation' },
    { word: 'THESIS', clue: 'Graduate research paper' },
    { word: 'LECTURE', clue: 'Educational talk by professor' },
    { word: 'EXAMINATION', clue: 'Formal test of knowledge' },
    { word: 'SCHOLARSHIP', clue: 'Financial aid for students' },
    { word: 'GRADUATION', clue: 'Completion ceremony' },
    { word: 'PROFESSOR', clue: 'University teacher' },
    { word: 'DORMITORY', clue: 'Student residence building' },
    { word: 'CAFETERIA', clue: 'Campus dining facility' },
    { word: 'LABORATORY', clue: 'Scientific research room' },
    { word: 'TECHNOLOGY', clue: 'Applied science' },
    { word: 'SMARTPHONE', clue: 'Advanced mobile device' },
    { word: 'COMPUTER', clue: 'Electronic processing machine' },
    { word: 'INTERNET', clue: 'Global network system' },
    { word: 'FASHION', clue: 'Style and clothing trends' },
    { word: 'DESIGNER', clue: 'Creative fashion artist' },
    { word: 'BOUTIQUE', clue: 'Small fashion store' },
    { word: 'ACCESSORIES', clue: 'Fashion add-ons' },
    { word: 'MARKETPLACE', clue: 'Trading platform' },
    { word: 'UNIVERSITY', clue: 'Higher education institution' }
  ]
};

export const generateDailyCrossword = (date: string, level: number): CrosswordPuzzle => {
  // Create a deterministic seed from date and level
  const seed = date.split('').reduce((a, b) => a + b.charCodeAt(0), 0) + level;
  
  // Seeded random function
  let seedValue = seed;
  const seededRandom = () => {
    seedValue = (seedValue * 9301 + 49297) % 233280;
    return seedValue / 233280;
  };

  const size = Math.min(8 + Math.floor(level / 2), 15);
  const grid: string[][] = Array(size).fill(null).map(() => Array(size).fill(''));
  
  // Select difficulty based on level
  let wordPool: { word: string; clue: string; }[];
  if (level <= 3) {
    wordPool = [...campusWords.easy, ...campusWords.medium.slice(0, 5)];
  } else if (level <= 7) {
    wordPool = [...campusWords.medium, ...campusWords.hard.slice(0, 8)];
  } else {
    wordPool = [...campusWords.medium.slice(-8), ...campusWords.hard];
  }
  
  // Filter and select words based on level and grid size
  const maxWords = Math.min(5 + level, 12);
  const minLength = level <= 3 ? 3 : level <= 7 ? 4 : 5;
  const maxLength = Math.min(size - 2, level <= 3 ? 6 : level <= 7 ? 9 : 12);
  
  const selectedWords = wordPool
    .filter(item => item.word.length >= minLength && item.word.length <= maxLength)
    .sort(() => seededRandom() - 0.5)
    .slice(0, maxWords);

  const words: CrosswordWord[] = [];
  const usedCells = new Set<string>();

  // Simple placement algorithm
  selectedWords.forEach((wordData, index) => {
    const direction = seededRandom() > 0.5 ? 'across' : 'down';
    const word = wordData.word;
    
    let placed = false;
    let attempts = 0;
    
    while (!placed && attempts < 50) {
      const maxRow = direction === 'down' ? size - word.length : size - 1;
      const maxCol = direction === 'across' ? size - word.length : size - 1;
      
      const startRow = Math.floor(seededRandom() * (maxRow + 1));
      const startCol = Math.floor(seededRandom() * (maxCol + 1));
      
      // Check if placement is valid
      let canPlace = true;
      const cellsToUse: string[] = [];
      
      for (let i = 0; i < word.length; i++) {
        const row = direction === 'down' ? startRow + i : startRow;
        const col = direction === 'across' ? startCol + i : startCol;
        const cellKey = `${row}-${col}`;
        
        if (grid[row][col] !== '' && grid[row][col] !== word[i]) {
          canPlace = false;
          break;
        }
        
        cellsToUse.push(cellKey);
      }
      
      if (canPlace) {
        // Place the word
        for (let i = 0; i < word.length; i++) {
          const row = direction === 'down' ? startRow + i : startRow;
          const col = direction === 'across' ? startCol + i : startCol;
          grid[row][col] = word[i];
          usedCells.add(`${row}-${col}`);
        }
        
        words.push({
          word,
          clue: wordData.clue,
          startRow,
          startCol,
          direction,
          number: index + 1
        });
        
        placed = true;
      }
      
      attempts++;
    }
  });

  return {
    id: `daily-${date}-${level}`,
    grid,
    words,
    size
  };
};

export const validateCrosswordSolution = (
  puzzle: CrosswordPuzzle,
  userGrid: string[][]
): { isComplete: boolean; correctWords: number[]; incorrectWords: number[] } => {
  const correctWords: number[] = [];
  const incorrectWords: number[] = [];
  
  puzzle.words.forEach(word => {
    let isCorrect = true;
    
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'down' ? word.startRow + i : word.startRow;
      const col = word.direction === 'across' ? word.startCol + i : word.startCol;
      
      if (userGrid[row]?.[col] !== word.word[i]) {
        isCorrect = false;
        break;
      }
    }
    
    if (isCorrect) {
      correctWords.push(word.number);
    } else {
      incorrectWords.push(word.number);
    }
  });
  
  return {
    isComplete: correctWords.length === puzzle.words.length,
    correctWords,
    incorrectWords
  };
};