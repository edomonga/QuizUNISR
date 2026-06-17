// ─── Database row types (mirror Supabase tables) ─────────────────────────────

export interface Profile {
  id: string;           // uuid, matches auth.users.id
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;   // false until admin approves or email confirmed
  created_at: string;
}

export interface Course {
  id: string;           // uuid
  name: string;
  subtitle: string;
  icon: string;         // emoji
  accent_color: string; // tailwind class e.g. "bg-blue-600"
  text_color: string;
  border_color: string;
  is_available: boolean;
  // Exam rules stored as JSON column
  exam_rules: ExamRules;
  created_at: string;
  updated_at: string;
}

export interface ExamRules {
  total_questions: number;
  time_limit_seconds: number;
  correct_score: number;
  wrong_penalty: number;
  omitted_score: number;
  options_per_question: number;   // 4 or 5
  allow_multiple_correct: boolean;
  distribution: Record<string, number>; // macro_area_id -> count
}

export interface MacroArea {
  id: string;           // uuid
  course_id: string;
  name: string;         // e.g. "Igiene e Sanità Pubblica"
  display_order: number;
  created_at: string;
}

export interface Topic {
  id: string;           // uuid
  macro_area_id: string;
  course_id: string;
  name: string;
  created_at: string;
}

export interface Question {
  id: string;           // uuid
  course_id: string;
  macro_area_id: string;
  topic_id: string;
  question_text: string;
  options: string[];    // JSON array, 4 or 5 items
  correct_answers: number[]; // 0-based indices (array supports multiple correct)
  explanation?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields (not in DB)
  macro_area_name?: string;
  topic_name?: string;
}

export interface UserStats {
  id: string;
  user_id: string;
  course_id: string;
  topic_id: string;
  topic_name: string;
  macro_area_id: string;
  macro_area_name: string;
  correct: number;
  total: number;
  updated_at: string;
}

export interface ExamResult {
  id: string;
  user_id: string;
  course_id: string;
  course_name: string;
  score_in_30: number;
  raw_score: number;
  correct: number;
  wrong: number;
  omitted: number;
  duration_seconds: number;
  answers: ExamAnswer[];
  created_at: string;
}

export interface ExamAnswer {
  question_id: string;
  selected: number[];   // selected option indices
  correct: boolean;
}

// ─── UI-only types ────────────────────────────────────────────────────────────

export interface QuizSession {
  questions: Question[];
  courseId: string;
}

export interface AuthUser {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
}
