export interface User {
  username: string;
  displayName: string;
}

export interface UserStats {
  username: string;
  totalQuizzes: number;
  totalQuestions: number;
  correctAnswers: number;
  topicStats: Record<string, { correct: number; total: number }>;
  macroAreaStats: Record<string, { correct: number; total: number }>;
  examHistory: ExamResult[];
}

export interface ExamResult {
  date: string;
  score: number;
  maxScore: number;
  scoreIn30: number;
  correct: number;
  wrong: number;
  omitted: number;
  durationSeconds: number;
}

// Simple in-memory user store (in production would use a DB)
const USERS: Record<string, string> = {
  'studente': 'medicina2024',
  'admin': 'admin123',
};

export function authenticate(username: string, password: string): User | null {
  const storedPassword = USERS[username.toLowerCase()];
  if (storedPassword && storedPassword === password) {
    return {
      username: username.toLowerCase(),
      displayName: username.charAt(0).toUpperCase() + username.slice(1),
    };
  }
  return null;
}

export function getDefaultStats(username: string): UserStats {
  return {
    username,
    totalQuizzes: 0,
    totalQuestions: 0,
    correctAnswers: 0,
    topicStats: {},
    macroAreaStats: {},
    examHistory: [],
  };
}
