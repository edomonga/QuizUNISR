import { supabase } from './supabase';
import type { Course, MacroArea, Topic, Question, UserStats, ExamResult, ExamAnswer, ExamRules, Profile } from '@/types';
import { getCachedCourseQuestions, invalidateQuestionsCache } from './questionsCache';

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) { console.error(error); return []; }
  return data as Course[];
}

export async function getCourse(id: string): Promise<Course | null> {
  const { data } = await supabase.from('courses').select('*').eq('id', id).single();
  return data as Course | null;
}

export async function upsertCourse(course: Partial<Course> & { name: string }): Promise<{ data: Course | null; error: string | null }> {
  const payload = { ...course, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('courses').upsert(payload).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Course, error: null };
}

export async function deleteCourse(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Macro Areas ──────────────────────────────────────────────────────────────

export async function getMacroAreas(courseId: string): Promise<MacroArea[]> {
  const { data } = await supabase
    .from('macro_areas')
    .select('*')
    .eq('course_id', courseId)
    .order('display_order', { ascending: true });
  return (data ?? []) as MacroArea[];
}

export async function upsertMacroArea(area: Partial<MacroArea> & { course_id: string; name: string }): Promise<{ data: MacroArea | null; error: string | null }> {
  const { data, error } = await supabase.from('macro_areas').upsert(area).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as MacroArea, error: null };
}

export async function deleteMacroArea(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('macro_areas').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getTopics(courseId: string): Promise<Topic[]> {
  const { data } = await supabase
    .from('topics')
    .select('*')
    .eq('course_id', courseId)
    .order('name', { ascending: true });
  return (data ?? []) as Topic[];
}

export async function upsertTopic(topic: Partial<Topic> & { macro_area_id: string; course_id: string; name: string }): Promise<{ data: Topic | null; error: string | null }> {
  const { data, error } = await supabase.from('topics').upsert(topic).select().single();
  if (error) return { data: null, error: error.message };
  return { data: data as Topic, error: null };
}

export async function deleteTopic(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('topics').delete().eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Questions ────────────────────────────────────────────────────────────────
//
// NOVITÀ: le domande passano dalla cache (src/lib/questionsCache.ts).
// getCachedCourseQuestions() scarica l'archivio del corso una sola volta e lo
// riusa da localStorage finché non cambia. Tutti i filtri qui sotto lavorano
// in memoria su quell'elenco: zero traffico extra verso Supabase.

export async function getQuestions(courseId: string, filters?: {
  macroAreaId?: string;
  topicId?: string;
  activeOnly?: boolean;
}): Promise<Question[]> {
  const all = await getCachedCourseQuestions(courseId);
  return all.filter((q) => {
    if (filters?.macroAreaId && q.macro_area_id !== filters.macroAreaId) return false;
    if (filters?.topicId && q.topic_id !== filters.topicId) return false;
    if (filters?.activeOnly && !q.is_active) return false;
    return true;
  });
}

export async function upsertQuestion(question: Partial<Question> & {
  course_id: string;
  macro_area_id: string;
  topic_id: string;
  question_text: string;
  options: string[];
  correct_answers: number[];
}): Promise<{ data: Question | null; error: string | null }> {
  const payload = { ...question, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('questions').upsert(payload).select().single();
  if (error) return { data: null, error: error.message };
  invalidateQuestionsCache(question.course_id); // la modifica è subito visibile
  return { data: data as Question, error: null };
}

export async function deleteQuestion(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (!error) invalidateQuestionsCache(); // course_id non noto qui → svuota tutto
  return { error: error?.message ?? null };
}

export async function bulkInsertQuestions(questions: Array<Omit<Question, 'id' | 'created_at' | 'updated_at'>>): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.from('questions').insert(questions).select('id');
  if (error) return { count: 0, error: error.message };
  invalidateQuestionsCache((questions[0] as any)?.course_id);
  return { count: data?.length ?? 0, error: null };
}

// ─── Random question picker for exams ─────────────────────────────────────────

export async function pickExamQuestions(course: Course): Promise<Question[]> {
  const all = await getCachedCourseQuestions(course.id);
  const results: Question[] = [];

  for (const [macroAreaId, count] of Object.entries(course.exam_rules.distribution)) {
    const pool = all.filter((q) => q.macro_area_id === macroAreaId && q.is_active);
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    results.push(...shuffled.slice(0, count));
  }

  return results.sort(() => Math.random() - 0.5);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getUserStats(userId: string, courseId: string): Promise<UserStats[]> {
  const { data } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  return (data ?? []) as UserStats[];
}

export async function recordQuizAnswers(
  userId: string,
  courseId: string,
  answers: { question: Question; correct: boolean }[]
): Promise<void> {
  // ── 1. Aggrega per topic ───────────────────────────────────────────────────
  const topicMap = new Map<string, { topic_id: string; topic_name: string; macro_area_id: string; macro_area_name: string; correct: number; total: number }>();

  for (const { question, correct } of answers) {
    const key = question.topic_id;
    if (!topicMap.has(key)) {
      topicMap.set(key, {
        topic_id: question.topic_id,
        topic_name: question.topic_name ?? '',
        macro_area_id: question.macro_area_id,
        macro_area_name: question.macro_area_name ?? '',
        correct: 0,
        total: 0,
      });
    }
    const entry = topicMap.get(key)!;
    entry.total++;
    if (correct) entry.correct++;
  }

  for (const entry of Array.from(topicMap.values())) {
    const { data: existing } = await supabase
      .from('user_stats')
      .select('id, correct, total')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('topic_id', entry.topic_id)
      .single();

    if (existing) {
      await supabase.from('user_stats').update({
        correct: existing.correct + entry.correct,
        total: existing.total + entry.total,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
    } else {
      await supabase.from('user_stats').insert({
        user_id: userId,
        course_id: courseId,
        topic_id: entry.topic_id,
        topic_name: entry.topic_name,
        macro_area_id: entry.macro_area_id,
        macro_area_name: entry.macro_area_name,
        correct: entry.correct,
        total: entry.total,
      });
    }
  }

  // ── 2. Aggiorna archivio errori ────────────────────────────────────────────
  const now = new Date().toISOString();
  const MASTERY_THRESHOLD = 5; // risposte corrette consecutive per "padronanza"

  for (const { question, correct } of answers) {
    const { data: existing } = await supabase
      .from('user_wrong_questions')
      .select('id, wrong_count, consecutive_correct, is_mastered')
      .eq('user_id', userId)
      .eq('question_id', question.id)
      .single();

    if (!correct) {
      // Risposta sbagliata
      if (existing) {
        await supabase.from('user_wrong_questions').update({
          wrong_count: existing.wrong_count + 1,
          consecutive_correct: 0,      // azzera la serie positiva
          is_mastered: false,           // torna nell'archivio se era stata rimossa
          last_wrong_at: now,
          updated_at: now,
        }).eq('id', existing.id);
      } else {
        await supabase.from('user_wrong_questions').insert({
          user_id: userId,
          course_id: courseId,
          question_id: question.id,
          wrong_count: 1,
          consecutive_correct: 0,
          is_mastered: false,
          last_wrong_at: now,
          updated_at: now,
        });
      }
    } else {
      // Risposta corretta — aggiorna solo se esiste nell'archivio errori
      if (existing && !existing.is_mastered) {
        const newConsecutive = existing.consecutive_correct + 1;
        const mastered = newConsecutive >= MASTERY_THRESHOLD;
        await supabase.from('user_wrong_questions').update({
          consecutive_correct: newConsecutive,
          is_mastered: mastered,
          last_correct_at: now,
          updated_at: now,
        }).eq('id', existing.id);
      }
    }
  }
}

// ─── Wrong questions (ripasso errori) ────────────────────────────────────────

export interface WrongQuestionEntry {
  question_id: string;
  wrong_count: number;
  consecutive_correct: number;
  is_mastered: boolean;
}

/** Restituisce le domande sbagliate NON ancora padroneggiate, ordinate dalla più sbagliata */
export async function getWrongQuestions(
  userId: string,
  courseId: string,
  limit = 100
): Promise<{ questions: Question[]; wrongDataMap: Record<string, WrongQuestionEntry> }> {
  const { data: wrongData } = await supabase
    .from('user_wrong_questions')
    .select('question_id, wrong_count, consecutive_correct, is_mastered')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('is_mastered', false)           // solo quelle non ancora padroneggiate
    .order('wrong_count', { ascending: false })
    .limit(limit);

  if (!wrongData?.length) return { questions: [], wrongDataMap: {} };

  const idSet = new Set(wrongData.map((r: any) => r.question_id));
  const wrongDataMap: Record<string, WrongQuestionEntry> = {};
  for (const r of wrongData as any[]) {
    wrongDataMap[r.question_id] = {
      question_id: r.question_id,
      wrong_count: r.wrong_count,
      consecutive_correct: r.consecutive_correct,
      is_mastered: r.is_mastered,
    };
  }

  // Le domande arrivano dalla cache: filtriamo in memoria per gli id sbagliati.
  const all = await getCachedCourseQuestions(courseId);
  const qs = all.filter((q) => idSet.has(q.id) && q.is_active);

  qs.sort((a, b) => (wrongDataMap[b.id]?.wrong_count ?? 0) - (wrongDataMap[a.id]?.wrong_count ?? 0));

  return { questions: qs, wrongDataMap };
}

/** Conta le domande sbagliate non ancora padroneggiate */
export async function countWrongQuestions(userId: string, courseId: string): Promise<number> {
  const { count } = await supabase
    .from('user_wrong_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('is_mastered', false);
  return count ?? 0;
}

/** Segna manualmente una domanda come "la so" (rimossa dall'archivio errori) */
export async function markQuestionMastered(userId: string, questionId: string): Promise<void> {
  await supabase.from('user_wrong_questions').update({
    is_mastered: true,
    updated_at: new Date().toISOString(),
  })
    .eq('user_id', userId)
    .eq('question_id', questionId);
}

// ─── Exam results ─────────────────────────────────────────────────────────────

export async function saveExamResult(result: Omit<ExamResult, 'id' | 'created_at'>): Promise<void> {
  await supabase.from('exam_results').insert(result);
}

export async function getExamResults(userId: string): Promise<ExamResult[]> {
  const { data } = await supabase
    .from('exam_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);
  return (data ?? []) as ExamResult[];
}

// ─── Admin: user management ───────────────────────────────────────────────────

export async function getAllProfiles(): Promise<Profile[]> {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });
  return (data ?? []) as Profile[];
}

export async function updateProfile(id: string, patch: Partial<Pick<Profile, 'display_name' | 'is_admin' | 'is_active'>>): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteProfile(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Question reports ─────────────────────────────────────────────────────────

export interface QuestionReport {
  id: string;
  question_id: string;
  user_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  note: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export async function submitReport(report: {
  question_id: string;
  user_id: string;
  question_text: string;
  selected_answer: string;
  correct_answer: string;
  note: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('question_reports').insert(report);
  return { error: error?.message ?? null };
}

export async function getReports(status?: string): Promise<QuestionReport[]> {
  let q = supabase
    .from('question_reports')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as QuestionReport[];
}

export async function updateReportStatus(id: string, status: 'pending' | 'reviewed' | 'resolved'): Promise<{ error: string | null }> {
  const { error } = await supabase.from('question_reports').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

// ─── Unseen questions tracking ────────────────────────────────────────────────

export async function getSeenQuestionIds(userId: string, courseId: string): Promise<Set<string>> {
  const { data: seen } = await supabase
    .from('user_questions_seen')
    .select('question_id')
    .eq('user_id', userId)
    .eq('course_id', courseId);
  return new Set((seen ?? []).map((r: any) => r.question_id));
}

export async function markQuestionsSeen(
  userId: string,
  courseId: string,
  questionIds: string[]
): Promise<void> {
  if (questionIds.length === 0) return;
  const rows = questionIds.map(qid => ({
    user_id: userId,
    course_id: courseId,
    question_id: qid,
  }));
  await supabase.from('user_questions_seen').upsert(rows, { ignoreDuplicates: true });
}

export async function getUnseenQuestions(
  userId: string,
  courseId: string,
  filters?: { macroAreaIds?: string[]; topicIds?: string[] }
): Promise<Question[]> {
  const seenIds = await getSeenQuestionIds(userId, courseId);

  // Domande dalla cache, filtrate in memoria.
  let all = (await getCachedCourseQuestions(courseId)).filter((q) => q.is_active);

  if (filters?.macroAreaIds?.length) all = all.filter((q) => filters.macroAreaIds!.includes(q.macro_area_id));
  if (filters?.topicIds?.length) all = all.filter((q) => filters.topicIds!.includes(q.topic_id));

  return seenIds.size > 0 ? all.filter((q) => !seenIds.has(q.id)) : all;
}

export async function countUnseenQuestions(userId: string, courseId: string): Promise<{ unseen: number; total: number }> {
  const seenIds = await getSeenQuestionIds(userId, courseId);
  const total = (await getCachedCourseQuestions(courseId)).filter((q) => q.is_active).length;
  return { unseen: total - seenIds.size, total };
}
