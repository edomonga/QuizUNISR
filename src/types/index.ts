// ─── Database row types (mirror Supabase tables) ─────────────────────────────

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  is_active: boolean;
  must_change_password?: boolean;
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  accent_color: string;
  text_color: string;
  border_color: string;
  is_available: boolean;
  year: number | null;
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
  options_per_question: number;
  allow_multiple_correct: boolean;
  no_navigation?: boolean;
  distribution: Record<string, number>;
  // Two-phase exam support (e.g. Microbiologia)
  exam_type?: 'standard' | 'two_phase';
  preselection?: {
    questions: number;           // how many preselection questions
    max_errors: number;          // max errors allowed to pass
    time_limit_seconds: number;  // time for preselection phase
    distribution: Record<string, number>; // macro_area_id -> count
  };
}

export interface MacroArea {
  id: string;
  course_id: string;
  name: string;
  display_order: number;
  created_at: string;
}

export interface Topic {
  id: string;
  macro_area_id: string;
  course_id: string;
  name: string;
  created_at: string;
}

export interface Question {
  id: string;
  course_id: string;
  macro_area_id: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_answers: number[];
  explanation?: string;
  is_active: boolean;
  shuffle_options: boolean;  // NEW: whether to shuffle options for this question
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

// Tracks which specific questions a user has seen
export interface UserQuestionSeen {
  id: string;
  user_id: string;
  course_id: string;
  question_id: string;
  seen_at: string;
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
  selected: number[];
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
  must_change_password?: boolean;
}
