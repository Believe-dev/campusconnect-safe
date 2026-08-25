import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, CheckCircle, XCircle } from 'lucide-react';
import { GameMusic } from './GameMusic';
import { soundEffects } from '@/utils/soundEffects';

interface QuizGameProps {
  level: number;
  userId: string;
  onGameComplete: (score: number, gameType: string) => void;
}

interface Question {
  id: number;
  question: string;
  options: string[];
  correct: number;
  difficulty: number;
}

const allQuestions: Question[] = [
  // Level 1 (Easy)
  { id: 1, question: "What is the capital of Nigeria?", options: ["Lagos", "Abuja", "Kano", "Port Harcourt"], correct: 1, difficulty: 1 },
  { id: 2, question: "Which university is known as the 'First and the Best'?", options: ["University of Lagos", "University of Ibadan", "Ahmadu Bello University", "University of Nigeria"], correct: 1, difficulty: 1 },
  { id: 3, question: "What does JAMB stand for?", options: ["Joint Admissions and Matriculation Board", "Junior Academic Merit Board", "Joint Academic Management Board", "Junior Admissions Merit Board"], correct: 0, difficulty: 1 },
  { id: 4, question: "Which is Nigeria's currency?", options: ["Naira", "Dollar", "Pound", "Euro"], correct: 0, difficulty: 1 },
  { id: 5, question: "How many states are in Nigeria?", options: ["35", "36", "37", "38"], correct: 1, difficulty: 1 },
  { id: 6, question: "What is the full meaning of NYSC?", options: ["National Youth Service Corps", "Nigerian Youth Service Center", "National Young Service Corps", "Nigerian Young Service Center"], correct: 0, difficulty: 1 },
  { id: 7, question: "Which state is Lagos located in?", options: ["Lagos", "Ogun", "Oyo", "Osun"], correct: 0, difficulty: 1 },
  { id: 8, question: "What does UI stand for?", options: ["University of Ibadan", "University of Ilorin", "University of Ife", "University of Imo"], correct: 0, difficulty: 1 },
  { id: 9, question: "Nigeria gained independence in which year?", options: ["1958", "1960", "1962", "1963"], correct: 1, difficulty: 1 },
  { id: 10, question: "What is the largest city in Nigeria?", options: ["Abuja", "Lagos", "Kano", "Ibadan"], correct: 1, difficulty: 1 },
  { id: 11, question: "Which language is widely spoken in Nigeria?", options: ["French", "English", "Arabic", "Portuguese"], correct: 1, difficulty: 1 },
  { id: 12, question: "What does FCT stand for?", options: ["Federal Capital Territory", "Federal Central Territory", "Federal City Territory", "Federal Capital Town"], correct: 0, difficulty: 1 },
  { id: 13, question: "Which is the smallest state in Nigeria?", options: ["Lagos", "Anambra", "Abia", "Ekiti"], correct: 0, difficulty: 1 },
  { id: 14, question: "What is the national anthem's first line?", options: ["Arise O compatriots", "Nigeria we hail thee", "Great lofty heights", "Land of our birth"], correct: 0, difficulty: 1 },
  { id: 15, question: "Which university is in Zaria?", options: ["University of Jos", "Ahmadu Bello University", "University of Maiduguri", "Bayero University"], correct: 1, difficulty: 1 },
  { id: 16, question: "What does WAEC stand for?", options: ["West African Examinations Council", "Western African Education Council", "West Africa Education Center", "Western Africa Examinations Center"], correct: 0, difficulty: 1 },
  { id: 17, question: "Nigeria is located in which continent?", options: ["Asia", "Europe", "Africa", "America"], correct: 2, difficulty: 1 },
  { id: 18, question: "What is the duration of NYSC service?", options: ["6 months", "1 year", "18 months", "2 years"], correct: 1, difficulty: 1 },
  { id: 19, question: "Which is the federal capital of Nigeria?", options: ["Lagos", "Abuja", "Kano", "Port Harcourt"], correct: 1, difficulty: 1 },
  { id: 20, question: "What does NECO stand for?", options: ["National Examinations Council", "Nigerian Education Council", "National Education Commission", "Nigerian Examinations Council"], correct: 0, difficulty: 1 },
  
  // Level 2-3 (Medium)
  { id: 21, question: "When was the University of Ibadan established?", options: ["1948", "1950", "1952", "1955"], correct: 0, difficulty: 2 },
  { id: 22, question: "Which university was formerly known as University of Ife?", options: ["OAU", "UNILAG", "UI", "UNIBEN"], correct: 0, difficulty: 2 },
  { id: 23, question: "What is the maximum JAMB score?", options: ["300", "350", "400", "450"], correct: 2, difficulty: 2 },
  { id: 24, question: "Which Nigerian university has the largest land mass?", options: ["ABU", "UNIJOS", "UNILORIN", "FUTO"], correct: 0, difficulty: 2 },
  { id: 25, question: "Which university is located in Nsukka?", options: ["UNIZIK", "UNN", "IMSU", "FUTO"], correct: 1, difficulty: 2 },
  { id: 26, question: "Which is the first private university in Nigeria?", options: ["Babcock", "Covenant", "Igbinedion", "Madonna"], correct: 2, difficulty: 2 },
  { id: 27, question: "What does ASUU stand for?", options: ["Academic Staff Union of Universities", "Association of Staff Union of Universities", "Academic Students Union of Universities", "Association of Students Union of Universities"], correct: 0, difficulty: 2 },
  { id: 28, question: "Which university is known as 'Great Ife'?", options: ["UI", "OAU", "UNILAG", "UNIBEN"], correct: 1, difficulty: 2 },
  { id: 29, question: "What is the minimum JAMB score for most universities?", options: ["120", "140", "160", "180"], correct: 3, difficulty: 2 },
  { id: 30, question: "Which state has the most universities in Nigeria?", options: ["Lagos", "Ogun", "Oyo", "Kano"], correct: 1, difficulty: 2 },
  { id: 31, question: "What does TETFUND stand for?", options: ["Tertiary Education Trust Fund", "Technical Education Trust Fund", "Teacher Education Trust Fund", "Technology Education Trust Fund"], correct: 0, difficulty: 2 },
  { id: 32, question: "Which university is in Ile-Ife?", options: ["UI", "OAU", "UNILAG", "UNIBEN"], correct: 1, difficulty: 2 },
  { id: 33, question: "What is the full form of UNIBEN?", options: ["University of Benin", "University of Benue", "University of Bauchi", "University of Borno"], correct: 0, difficulty: 2 },
  { id: 34, question: "Which year was UNILAG established?", options: ["1962", "1965", "1967", "1970"], correct: 0, difficulty: 2 },
  { id: 35, question: "What does JUPEB stand for?", options: ["Joint Universities Preliminary Examinations Board", "Junior University Preliminary Education Board", "Joint University Pre-Entry Board", "Junior Universities Pre-Entry Examinations Board"], correct: 0, difficulty: 2 },
  { id: 36, question: "Which is the oldest university in Nigeria?", options: ["University of Ibadan", "University of Lagos", "Ahmadu Bello University", "University of Nigeria"], correct: 0, difficulty: 2 },
  { id: 37, question: "What is the motto of University of Nigeria?", options: ["To Restore the Dignity of Man", "Veritas et Excellentia", "Recte Sapere Fons", "In Lumine Tuo"], correct: 0, difficulty: 2 },
  { id: 38, question: "Which university is located in Akoka?", options: ["UNILAG", "UI", "OAU", "UNIBEN"], correct: 0, difficulty: 2 },
  { id: 39, question: "What does NOUN stand for?", options: ["National Open University of Nigeria", "Nigerian Open University Network", "National Online University of Nigeria", "Nigerian Open University of Nigeria"], correct: 0, difficulty: 2 },
  { id: 40, question: "Which is the largest university by student population?", options: ["University of Lagos", "National Open University", "Ahmadu Bello University", "University of Ilorin"], correct: 1, difficulty: 2 },
  
  // Level 4+ (Hard)
  { id: 41, question: "Who was the first Vice-Chancellor of University of Ibadan?", options: ["Kenneth Mellanby", "Tekena Tamuno", "Ayo Banjo", "Isaac Adewole"], correct: 0, difficulty: 3 },
  { id: 42, question: "In which year was the National Universities Commission (NUC) established?", options: ["1962", "1974", "1975", "1979"], correct: 1, difficulty: 3 },
  { id: 43, question: "Which university was the first to introduce the course-unit system in Nigeria?", options: ["UI", "UNILAG", "ABU", "UNN"], correct: 2, difficulty: 3 },
  { id: 44, question: "What is the motto of University of Lagos?", options: ["Recte Sapere Fons", "Veritas et Excellentia", "Accedat Lux", "In Lumine Tuo Videbimus Lumen"], correct: 0, difficulty: 3 },
  { id: 45, question: "Which Nigerian university first offered Medicine as a course?", options: ["UI", "UNILAG", "ABU", "UCH"], correct: 0, difficulty: 3 },
  { id: 46, question: "Which university has the motto 'To Restore the Dignity of Man'?", options: ["FUTO", "UNIZIK", "IMSU", "UNN"], correct: 3, difficulty: 3 },
  { id: 47, question: "In which year was the first university in Nigeria established?", options: ["1948", "1950", "1952", "1960"], correct: 0, difficulty: 3 },
  { id: 48, question: "Which is the first university of technology in Nigeria?", options: ["FUTO", "FUTA", "FUTMINNA", "LAUTECH"], correct: 1, difficulty: 3 },
  { id: 49, question: "Who established the University of Ibadan?", options: ["British Colonial Government", "Nigerian Government", "Missionaries", "Private Investors"], correct: 0, difficulty: 3 },
  { id: 50, question: "What was the original name of OAU?", options: ["University of Ife", "Obafemi Awolowo University", "Western Nigeria University", "Yoruba University"], correct: 0, difficulty: 3 },
  { id: 51, question: "Which university was established by Nnamdi Azikiwe?", options: ["UNN", "UNIZIK", "UI", "UNILAG"], correct: 0, difficulty: 3 },
  { id: 52, question: "What is the full name of FUTO?", options: ["Federal University of Technology, Owerri", "Federal University of Technology, Ogun", "Federal University of Technology, Osun", "Federal University of Technology, Oyo"], correct: 0, difficulty: 3 },
  { id: 53, question: "Which year did Nigeria adopt the 6-3-3-4 education system?", options: ["1982", "1985", "1988", "1990"], correct: 0, difficulty: 3 },
  { id: 54, question: "Who was the first Nigerian Vice-Chancellor of UI?", options: ["Kenneth Dike", "Tekena Tamuno", "Ayo Banjo", "T.M. Aluko"], correct: 0, difficulty: 3 },
  { id: 55, question: "Which university has the largest medical school in West Africa?", options: ["UI", "UNILAG", "ABU", "UNN"], correct: 0, difficulty: 3 },
  { id: 56, question: "What does LAUTECH stand for?", options: ["Ladoke Akintola University of Technology", "Lagos University of Technology", "Lautech University of Technology", "Liberal Arts University of Technology"], correct: 0, difficulty: 3 },
  { id: 57, question: "Which was the first state university in Nigeria?", options: ["Rivers State University", "Imo State University", "Ondo State University", "Bendel State University"], correct: 3, difficulty: 3 },
  { id: 58, question: "Who founded Covenant University?", options: ["David Oyedepo", "Enoch Adeboye", "T.B. Joshua", "Chris Oyakhilome"], correct: 0, difficulty: 3 },
  { id: 59, question: "Which university was formerly University of Maiduguri?", options: ["UNIMAID", "University of Borno", "Ramat Polytechnic", "Kashim Ibrahim College"], correct: 0, difficulty: 3 },
  { id: 60, question: "What is the motto of Ahmadu Bello University?", options: ["Zazzau", "Samaru", "Arewa", "Zaria"], correct: 0, difficulty: 3 },
  
  // Additional questions for higher levels
  { id: 61, question: "Which Nigerian university has a campus in Dubai?", options: ["UNILAG", "Nile University", "American University of Nigeria", "Afe Babalola University"], correct: 1, difficulty: 4 },
  { id: 62, question: "What is the student capacity of University of Ibadan?", options: ["25,000", "30,000", "35,000", "40,000"], correct: 2, difficulty: 4 },
  { id: 63, question: "Which university established the first Law Faculty in Nigeria?", options: ["UI", "UNILAG", "UNN", "ABU"], correct: 0, difficulty: 4 },
  { id: 64, question: "What year was the Joint Admissions and Matriculation Board established?", options: ["1977", "1978", "1979", "1980"], correct: 1, difficulty: 4 },
  { id: 65, question: "Which is the most expensive private university in Nigeria?", options: ["Babcock University", "Covenant University", "American University of Nigeria", "Bowen University"], correct: 2, difficulty: 4 },
  { id: 66, question: "What does CRUTECH stand for?", options: ["Cross River University of Technology", "Central River University of Technology", "Calabar River University of Technology", "Cross Roads University of Technology"], correct: 0, difficulty: 4 },
  { id: 67, question: "Which university has the largest engineering faculty in Nigeria?", options: ["ABU", "UI", "FUTO", "OAU"], correct: 0, difficulty: 4 },
  { id: 68, question: "Who was the longest serving Vice-Chancellor of UNILAG?", options: ["Oyewusi Ibidapo-Obe", "Adetokunbo Sofoluwe", "Oye Ibidapo-Obe", "Rahamon Bello"], correct: 0, difficulty: 4 },
  { id: 69, question: "Which year did University of Abuja become a conventional university?", options: ["1988", "1990", "1992", "1995"], correct: 2, difficulty: 4 },
  { id: 70, question: "What is the original name of UNIZIK?", options: ["Anambra State University", "Nnamdi Azikiwe University", "East Central State University", "Awka University"], correct: 0, difficulty: 4 },
  { id: 71, question: "Which university has the motto 'Veritas et Excellentia'?", options: ["UNILAG", "UI", "OAU", "UNN"], correct: 0, difficulty: 4 },
  { id: 72, question: "What does MOUAU stand for?", options: ["Michael Okpara University of Agriculture", "Modibbo Adama University of Agriculture", "Murtala Mohammed University of Agriculture", "Moshood Abiola University of Agriculture"], correct: 0, difficulty: 4 },
  { id: 73, question: "Which was the first university to offer Computer Science in Nigeria?", options: ["UI", "UNILAG", "ABU", "UNN"], correct: 0, difficulty: 4 },
  { id: 74, question: "What is the land area of University of Ibadan?", options: ["1,030 hectares", "1,130 hectares", "1,230 hectares", "1,330 hectares"], correct: 0, difficulty: 4 },
  { id: 75, question: "Which university established the first Veterinary Medicine program?", options: ["ABU", "UI", "UNILORIN", "UNIMAID"], correct: 0, difficulty: 4 },
  { id: 76, question: "What does EKSU stand for?", options: ["Ekiti State University", "Edo State University", "Enugu State University", "Ebonyi State University"], correct: 0, difficulty: 4 },
  { id: 77, question: "Which university has the largest library in West Africa?", options: ["UI", "UNILAG", "ABU", "UNN"], correct: 0, difficulty: 4 },
  { id: 78, question: "Who was the first female Vice-Chancellor in Nigeria?", options: ["Grace Alele-Williams", "Bolanle Awe", "Jadesola Akande", "Folake Solanke"], correct: 0, difficulty: 4 },
  { id: 79, question: "Which year was the University of Port Harcourt established?", options: ["1975", "1977", "1979", "1981"], correct: 1, difficulty: 4 },
  { id: 80, question: "What is the motto of Federal University of Technology, Akure?", options: ["Technology for Self Reliance", "Technology for Development", "Innovation and Excellence", "Knowledge and Technology"], correct: 0, difficulty: 4 },
  { id: 81, question: "Which university was established as University of Science and Technology?", options: ["FUTO", "FUTA", "FUTMINNA", "All of the above"], correct: 3, difficulty: 5 },
  { id: 82, question: "What does DELSU stand for?", options: ["Delta State University", "Deltaic State University", "Delta Land State University", "Delta River State University"], correct: 0, difficulty: 5 },
  { id: 83, question: "Which university has produced the most Nigerian presidents?", options: ["ABU", "UI", "UNILAG", "UNN"], correct: 0, difficulty: 5 },
  { id: 84, question: "What is the student-teacher ratio at University of Ibadan?", options: ["15:1", "20:1", "25:1", "30:1"], correct: 1, difficulty: 5 },
  { id: 85, question: "Which was the first university to offer Petroleum Engineering?", options: ["UI", "UNIPORT", "FUTO", "ABU"], correct: 1, difficulty: 5 },
  { id: 86, question: "What does AAUA stand for?", options: ["Adekunle Ajasin University", "Adeyemi Adebayo University", "Adebayo Adefarati University", "Afe Babalola University"], correct: 0, difficulty: 5 },
  { id: 87, question: "Which university established the first Pharmacy school?", options: ["UI", "UNILAG", "OAU", "ABU"], correct: 0, difficulty: 5 },
  { id: 88, question: "What year did JAMB introduce the Unified Tertiary Matriculation Examination?", options: ["1978", "1979", "1980", "1981"], correct: 1, difficulty: 5 },
  { id: 89, question: "Which university has the motto 'In Lumine Tuo Videbimus Lumen'?", options: ["UI", "UNILAG", "OAU", "UNN"], correct: 2, difficulty: 5 },
  { id: 90, question: "What does RSUST stand for?", options: ["Rivers State University of Science and Technology", "Rivers State University", "Rivers State University of Technology", "Rivers Science University of Technology"], correct: 0, difficulty: 5 },
  { id: 91, question: "Which was the first university to offer Mass Communication?", options: ["UNILAG", "UI", "UNN", "ABU"], correct: 0, difficulty: 5 },
  { id: 92, question: "What is the acceptance rate of University of Lagos?", options: ["5%", "8%", "12%", "15%"], correct: 1, difficulty: 5 },
  { id: 93, question: "Which university established the first Architecture program?", options: ["ABU", "UI", "UNILAG", "UNN"], correct: 0, difficulty: 5 },
  { id: 94, question: "What does PLASU stand for?", options: ["Plateau State University", "Placer State University", "Plains State University", "Plato State University"], correct: 0, difficulty: 5 },
  { id: 95, question: "Which university has the largest medical research center?", options: ["UI", "UNILAG", "ABU", "UCH"], correct: 0, difficulty: 5 },
  { id: 96, question: "What year was the first PhD awarded in Nigeria?", options: ["1963", "1965", "1967", "1969"], correct: 0, difficulty: 5 },
  { id: 97, question: "Which university established the first Dentistry program?", options: ["UI", "UNILAG", "ABU", "UNN"], correct: 0, difficulty: 5 },
  { id: 98, question: "What does KASU stand for?", options: ["Kaduna State University", "Kano State University", "Kebbi State University", "Kogi State University"], correct: 0, difficulty: 5 },
  { id: 99, question: "Which was the first university to offer Nuclear Physics?", options: ["ABU", "UI", "UNILAG", "OAU"], correct: 0, difficulty: 5 },
  { id: 100, question: "What is the total number of federal universities in Nigeria as of 2024?", options: ["43", "45", "47", "49"], correct: 0, difficulty: 5 }
];

export const QuizGame = ({ level, userId, onGameComplete }: QuizGameProps) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [timeLeft, setTimeLeft] = useState(Math.max(8, 20 - level));
  const [isPlaying, setIsPlaying] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const saveKey = `savedGame_quiz`;

  const getQuestionsForLevel = (level: number, userId: string) => {
    let filteredQuestions;
    if (level === 1) filteredQuestions = allQuestions.filter(q => q.difficulty === 1);
    else if (level <= 3) filteredQuestions = allQuestions.filter(q => q.difficulty <= 2);
    else if (level <= 6) filteredQuestions = allQuestions.filter(q => q.difficulty <= 3);
    else if (level <= 10) filteredQuestions = allQuestions.filter(q => q.difficulty <= 4);
    else filteredQuestions = allQuestions.filter(q => q.difficulty <= 5);
    
    // Shuffle based on user ID for consistent randomization per user
    let seed = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const shuffled = [...filteredQuestions].sort(() => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x) - 0.5;
    });
    
    return shuffled.slice(0, Math.min(5 + Math.floor(level / 2), 15)).map(q => {
      const correctAnswer = q.options[q.correct];
      const shuffledOptions = [...q.options].sort(() => {
        const x = Math.sin(seed++) * 10000;
        return x - Math.floor(x) - 0.5;
      });
      return {
        ...q,
        options: shuffledOptions,
        correct: shuffledOptions.indexOf(correctAnswer)
      };
    });
  };

  useEffect(() => {
    loadSavedGame();
  }, []);

  const saveGame = () => {
    if (gameEnded) return;
    
    const gameState = {
      currentQuestion,
      score,
      selectedAnswer,
      showResult,
      timeLeft,
      questions,
      level
    };
    
    localStorage.setItem(saveKey, JSON.stringify(gameState));
  };

  const loadSavedGame = () => {
    const savedData = localStorage.getItem(saveKey);
    if (savedData) {
      try {
        const gameState = JSON.parse(savedData);
        setCurrentQuestion(gameState.currentQuestion);
        setScore(gameState.score);
        setSelectedAnswer(gameState.selectedAnswer);
        setShowResult(gameState.showResult);
        setTimeLeft(gameState.timeLeft);
        setQuestions(gameState.questions);
      } catch (error) {
        console.error('Error loading saved game:', error);
        localStorage.removeItem(saveKey);
        setQuestions(getQuestionsForLevel(level, userId));
      }
    } else {
      setQuestions(getQuestionsForLevel(level, userId));
    }
  };

  const clearSavedGame = () => {
    localStorage.removeItem(saveKey);
  };

  useEffect(() => {
    if (timeLeft > 0 && !showResult && !gameEnded) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
        saveGame();
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && !showResult) {
      handleAnswer(-1); // Time's up, wrong answer
    }
  }, [timeLeft, showResult, gameEnded]);

  const handleAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    setShowResult(true);
    
    const isCorrect = answerIndex === questions[currentQuestion].correct;
    if (isCorrect) {
      setScore(prev => prev + 10);
    }

    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setTimeLeft(Math.max(8, 20 - level));
        saveGame();
      } else {
        setGameEnded(true);
        clearSavedGame();
      }
    }, 1500);
  };

  const restartGame = () => {
    clearSavedGame();
    const newQuestions = getQuestionsForLevel(level, userId);
    setQuestions(newQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setGameEnded(false);
    setTimeLeft(Math.max(8, 20 - level));
    setIsPlaying(true);
  };

  const finishGame = () => {
    clearSavedGame();
    setIsPlaying(false);
    if (score > questions.length * 5) {
      soundEffects.playWinSound();
    } else {
      soundEffects.playLoseSound();
    }
    onGameComplete(score, 'quiz');
  };

  if (questions.length === 0) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading quiz...</p>
        </CardContent>
      </Card>
    );
  }

  if (gameEnded) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quiz Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div>
            <div className="text-4xl font-bold text-green-600 mb-2">{score}</div>
            <p className="text-muted-foreground">
              Level {level}: {score} out of {questions.length * 10} points
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={restartGame} variant="outline" className="flex-1">
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

  const question = questions[currentQuestion];

  return (
    <div className="relative">
      <GameMusic gameType="quiz" isPlaying={isPlaying && !gameEnded} />
      <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Campus Quiz
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">
            Question {currentQuestion + 1} of {questions.length}
          </span>
          <span className="text-sm font-medium">Score: {score}</span>
        </div>

        <Progress value={((currentQuestion + 1) / questions.length) * 100} />

        <div className="text-center">
          <div className="text-lg font-medium mb-2">Time: {timeLeft}s</div>
          <Progress value={(timeLeft / Math.max(8, 20 - level)) * 100} className="h-2" />
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
          <div className="space-y-2">
            {question.options.map((option, index) => {
              let buttonClass = "w-full text-left justify-start";
              let icon = null;

              if (showResult) {
                if (index === question.correct) {
                  buttonClass += " bg-green-100 border-green-500 text-green-700";
                  icon = <CheckCircle className="h-4 w-4 ml-auto" />;
                } else if (index === selectedAnswer && index !== question.correct) {
                  buttonClass += " bg-red-100 border-red-500 text-red-700";
                  icon = <XCircle className="h-4 w-4 ml-auto" />;
                }
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={buttonClass}
                  onClick={() => !showResult && handleAnswer(index)}
                  disabled={showResult}
                >
                  {option}
                  {icon}
                </Button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
    </div>
  );
};