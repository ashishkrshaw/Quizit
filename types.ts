export enum GameState {
  JOIN_SCREEN,
  AUTH,
  PROFILE_SETUP,
  HOME,
  CREATING,
  LOBBY,
  PLAYING,
  RESULTS,
  VIEWING_INSIGHTS,
}

export enum QuizType {
  MCQ = 'Multiple Choice',
  WRITTEN = 'Written Answer',
}

export enum TimerType {
    None = 'None',
    PerQuestion = 'Per Question',
    TotalQuiz = 'Total Quiz',
}

export interface Question {
  questionText: string;
  options?: string[];
  correctAnswer: string;
}

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  answers: (string | null)[];
  isGuest?: boolean;
}

export interface ChatMessage {
    id: string;
    sender: string;
    senderId: string;
    text: string;
    score: number;
}

export interface GroundingSource {
    uri: string;
    title: string;
}

export interface Room {
  id: string;
  players: Player[];
  quiz: Question[];
  currentQuestionIndex: number;
  status: 'lobby' | 'in-progress' | 'finished';
  quizType: QuizType;
  quizSettings: CreateQuizFormState;
  groundingSources: GroundingSource[] | null;
}

export interface CreateQuizFormState {
  quizType: QuizType;
  mcqOptions: number;
  topic: string;
  customPrompt: string;
  sourceFileName: string;
  sourceFileContent: string;
  rounds: number;
  timerType: TimerType;
  timerDuration: number;
  sourceType: 'topic' | 'exam' | 'it';
  state: string;
  exam: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  isGuest?: boolean;
  profession?: 'student' | 'teacher' | '';
  goals?: string;
  classField?: string;
  lastInsightDate?: string;
}

export interface QuizHistory {
  roomId: string;
  quizTopic: string;
  score: number;
  date: string;
  rank: number;
  playerCount: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}