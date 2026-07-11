import { supabase } from './supabase';
import type { Course, MacroArea, Topic, Question, UserStats, ExamResult, ExamAnswer, ExamRules, Profile } from '@/types';
import { getCachedCourseQuestions, invalidateQuestionsCache } from './questionsCache';
import { getCachedCourse, getCachedCourses, invalidateCoursesCache } from './coursesCache';
import { getCachedMacroAreas, getCachedTopics, invalidateMetaCache } from './metaCache';

// ─── Courses ──────────────────────────────────────────────────────────────────
// I corsi ora passano dalla cache (src/lib/coursesCache.ts): prima venivano
// riscaricati con select=* a ogni pagina (~788 volte/giorno).

export async function getCourses(): Promise<Course[]> {
  return getCachedCourses();
}

export async function getCourse(id: string): Promise<Course | null> {
  return getCachedCourse(id);
}

export async function upsertCourse(course: Partial<Course> & { name: string }): Promise<{ data: Course | null; error: string | null }> {
  const payload = { ...course, updated_at: new Date().toISOString() };
  const { data, error } = await supabase.from('courses').upsert(payload).select().single();
  if (error) return { data: null, error: error.message };
  invalidateCoursesCache(); // la modifica è subito visibile
  return { data: data as Course, error: null };
}

export async function deleteCourse(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('courses').delete().eq('id', id);
  if (!error) invalidateCoursesCache();
  return { error: error?.message ?? null };
}

// ─── Macro Areas ──────────────────────────────────────────────────────────────

// Le macro-aree passano dalla cache (src/lib/metaCache.ts): stesso
// ordinamento (display_order) e stesso risultato, ma niente rete se
// già viste negli ultimi 10 minuti.
export async function getMacroAreas(courseId: string): Promise<MacroArea[]> {
  return getCachedMacroAreas(courseId);
}

export async function upsertMacroArea(area: Partial<MacroArea> & { course_id: string; name: string }): Promise<{ data: MacroArea | null; error: string | null }> {
  const { data, error } = await supabase.from('macro_areas').upsert(area).select().single();
  if (error) return { data: null, error: error.message };
  invalidateMetaCache(area.course_id);
  return { data: data as MacroArea, error: null };
}

export async function deleteMacroArea(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('macro_areas').delete().eq('id', id);
  if (!error) invalidateMetaCache(); // qui abbiamo solo l'id → invalida tutte le materie
  return { error: error?.message ?? null };
}

// ─── Topics ───────────────────────────────────────────────────────────────────
// Gli argomenti passano dalla cache (src/lib/metaCache.ts): stesso
// ordinamento (name) e stesso risultato.
export async function getTopics(courseId: string): Promise<Topic[]> {
  return getCachedTopics(courseId);
}

export async function upsertTopic(topic: Partial<Topic> & { macro_area_id: string; course_id: string; name: string }): Promise<{ data: Topic | null; error: string | null }> {
  const { data, error } = await supabase.from('topics').upsert(topic).select().single();
  if (error) return { data: null, error: error.message };
  invalidateMetaCache(topic.course_id);
  return { data: data as Topic, error: null };
}
export async function deleteTopic(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('topics').delete().eq('id', id);
  if (!error) invalidateMetaCache();
  return { error: error?.message ?? null };
}

// ─── Questions ────────────────────────────────────────────────────────────────
// Le domande passano dalla cache (src/lib/questionsCache.ts).

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
  invalidateQuestionsCache(question.course_id);
  return { data: data as Question, error: null };
}

export async function deleteQuestion(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  if (!error) invalidateQuestionsCache();
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

// ─────────────────────────────────────────────────────────────────────────────
// recordQuizAnswers — VERSIONE RPC
//
// Tutto il salvataggio di fine quiz (statistiche per argomento + archivio
// errori) avviene in UNA sola richiesta, dentro la funzione Postgres
// record_quiz_answers. Vantaggi rispetto alla versione batch:
//  - da ~6 richieste a 1 per ogni quiz/esame completato;
//  - niente più errori 403 (gli upsert parziali violavano il WITH CHECK
//    delle policy RLS e gli aggiornamenti andavano persi);
//  - atomico: o si salva tutto o niente;
//  - user_id preso da auth.uid() lato server, non dal client.
// La firma resta identica: nessuna modifica nei componenti che la chiamano.
// ─────────────────────────────────────────────────────────────────────────────

export async function recordQuizAnswers(
  userId: string, // mantenuto per compatibilità di firma; lato server si usa auth.uid()
  courseId: string,
  answers: { question: Question; correct: boolean }[]
): Promise<void> {
  if (answers.length === 0) return;

  const payload = answers.map(({ question, correct }) => ({
    question_id: question.id,
    topic_id: question.topic_id,
    topic_name: question.topic_name ?? '',
    macro_area_id: question.macro_area_id,
    macro_area_name: question.macro_area_name ?? '',
    correct,
  }));

  const { error } = await supabase.rpc('record_quiz_answers', {
    p_course_id: courseId,
    p_answers: payload,
  });
  if (error) console.error('recordQuizAnswers:', error.message);
}

// ─── Wrong questions (ripasso errori) ────────────────────────────────────────

export interface WrongQuestionEntry {
  question_id: string;
  wrong_count: number;
  consecutive_correct: number;
  is_mastered: boolean;
}

/** Domande sbagliate NON ancora padroneggiate, dalla più sbagliata */
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
    .eq('is_mastered', false)
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

  const all = await getCachedCourseQuestions(courseId);
  const qs = all.filter((q) => idSet.has(q.id) && q.is_active);
  qs.sort((a, b) => (wrongDataMap[b.id]?.wrong_count ?? 0) - (wrongDataMap[a.id]?.wrong_count ?? 0));

  return { questions: qs, wrongDataMap };
}

export async function countWrongQuestions(userId: string, courseId: string): Promise<number> {
  const { count } = await supabase
    .from('user_wrong_questions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .eq('is_mastered', false);
  return count ?? 0;
}

/** Segna manualmente una domanda come "la so" */
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
    .select('id, user_id, course_id, course_name, score_in_30, raw_score, correct, wrong, omitted, duration_seconds, created_at')
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
  status: 'pending' | 'resolved';
  created_at: string;
  // Arricchiti in lettura (non colonne del DB):
  user_name?: string | null;    // nome di chi ha segnalato
  course_name?: string | null;  // materia da cui proviene la domanda
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
  const reports = (data ?? []) as QuestionReport[];
  if (reports.length === 0) return reports;

  // Arricchimento in lettura: nome di chi ha segnalato + materia della domanda.
  // Nessuna colonna aggiuntiva sul DB → funziona anche sulle segnalazioni vecchie.
  const userIds = Array.from(new Set(reports.map(r => r.user_id).filter(Boolean)));
  const questionIds = Array.from(new Set(reports.map(r => r.question_id).filter(Boolean)));

  const [{ data: profs }, { data: qs }, courses] = await Promise.all([
    userIds.length ? supabase.from('profiles').select('id, display_name').in('id', userIds) : Promise.resolve({ data: [] as any[] }),
    questionIds.length ? supabase.from('questions').select('id, course_id').in('id', questionIds) : Promise.resolve({ data: [] as any[] }),
    getCachedCourses(),
  ]);

  const nameById = new Map((profs ?? []).map((p: any) => [p.id, p.display_name]));
  const courseIdByQ = new Map((qs ?? []).map((x: any) => [x.id, x.course_id]));
  const courseNameById = new Map(courses.map(c => [c.id, c.name]));

  for (const r of reports) {
    r.user_name = nameById.get(r.user_id) ?? null;
    const cid = courseIdByQ.get(r.question_id);
    r.course_name = cid ? (courseNameById.get(cid) ?? null) : null;
  }
  return reports;
}

export async function updateReportStatus(id: string, status: 'pending' | 'resolved'): Promise<{ error: string | null }> {
  const { error } = await supabase.from('question_reports').update({
    status,
    // risolta → registra il momento (usato per l'auto-pulizia); riaperta → azzera
    resolved_at: status === 'resolved' ? new Date().toISOString() : null,
  }).eq('id', id);
  return { error: error?.message ?? null };
}

/** Elimina definitivamente una segnalazione. */
export async function deleteReport(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('question_reports').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Elimina tutte le segnalazioni risolte (svuota la sezione «Risolte»). */
export async function deleteResolvedReports(): Promise<{ error: string | null }> {
  const { error } = await supabase.from('question_reports').delete().eq('status', 'resolved');
  return { error: error?.message ?? null };
}

/**
 * Auto-pulizia: elimina le segnalazioni risolte da più di `hours` ore.
 * Viene richiamata all'apertura della sezione segnalazioni, così la lista
 * delle risolte non cresce all'infinito. Ritorna quante ne ha eliminate.
 */
export async function purgeOldResolvedReports(hours = 24): Promise<number> {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from('question_reports')
    .delete()
    .eq('status', 'resolved')
    .lt('resolved_at', cutoff)
    .select('id');
  if (error) { console.error('purgeOldResolvedReports:', error.message); return 0; }
  return data?.length ?? 0;
}

// ─── Account summary (riepilogo globale su tutte le materie) ──────────────────

export interface AccountCourseStat {
  course_id: string;
  course_name: string;
  accuracy: number;
  total: number;
}

export interface AccountSummary {
  totalQuestions: number;
  accuracy: number;
  exams: number;
  bestScore: number;
  perCourse: AccountCourseStat[];
}

export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  const [{ data: stats }, { data: exams }, courses] = await Promise.all([
    supabase.from('user_stats').select('course_id, correct, total').eq('user_id', userId),
    supabase.from('exam_results').select('score_in_30').eq('user_id', userId),
    getCachedCourses(),
  ]);

  const rows = (stats ?? []) as { course_id: string; correct: number; total: number }[];
  const totalQ = rows.reduce((s, x) => s + (x.total ?? 0), 0);
  const totalC = rows.reduce((s, x) => s + (x.correct ?? 0), 0);
  const bestScore = (exams ?? []).reduce((m, e: any) => Math.max(m, Number(e.score_in_30) || 0), 0);

  const byCourse = new Map<string, { correct: number; total: number }>();
  for (const r of rows) {
    const acc = byCourse.get(r.course_id) ?? { correct: 0, total: 0 };
    acc.correct += r.correct ?? 0; acc.total += r.total ?? 0;
    byCourse.set(r.course_id, acc);
  }
  const nameOf = new Map(courses.map(c => [c.id, c.name]));
  const perCourse: AccountCourseStat[] = Array.from(byCourse.entries())
    .filter(([, v]) => v.total > 0)
    .map(([course_id, v]) => ({
      course_id,
      course_name: nameOf.get(course_id) ?? 'Materia',
      accuracy: Math.round((v.correct / v.total) * 100),
      total: v.total,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    totalQuestions: totalQ,
    accuracy: totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0,
    exams: (exams ?? []).length,
    bestScore,
    perCourse,
  };
}

// ─── App feedback ─────────────────────────────────────────────────────────────
// Feedback generale degli utenti per migliorare l'app (diverso dalle
// segnalazioni: quelle riguardano una singola domanda, questo l'app in generale).

export type FeedbackCategory = 'suggerimento' | 'bug' | 'contenuti' | 'altro';

export interface AppFeedback {
  id: string;
  user_id: string;
  user_name: string;
  category: FeedbackCategory;
  message: string;
  status: 'new' | 'reviewed';
  created_at: string;
}

export async function submitFeedback(feedback: {
  user_id: string;
  user_name: string;
  category: FeedbackCategory;
  message: string;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.from('app_feedback').insert(feedback);
  return { error: error?.message ?? null };
}

export async function getFeedback(status?: string): Promise<AppFeedback[]> {
  let q = supabase
    .from('app_feedback')
    .select('*')
    .order('created_at', { ascending: false });
  if (status) q = q.eq('status', status);
  const { data } = await q;
  return (data ?? []) as AppFeedback[];
}

export async function updateFeedbackStatus(id: string, status: 'new' | 'reviewed'): Promise<{ error: string | null }> {
  const { error } = await supabase.from('app_feedback').update({ status }).eq('id', id);
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

// ─────────────────────────────────────────────────────────────────────────────
// markQuestionsSeen — VERSIONE UPSERT IDEMPOTENTE
//
// Un solo upsert con ignoreDuplicates (= ON CONFLICT DO NOTHING):
//  - niente lettura preliminare (−1 richiesta a ogni avvio quiz);
//  - niente errori 409 anche con chiamate concorrenti (StrictMode, doppi click);
//  - risultato identico: le righe già presenti non vengono toccate.
// onConflict combacia con il vincolo unico reale della tabella:
// user_questions_seen_user_id_course_id_question_id_key
// su (user_id, course_id, question_id).
// ─────────────────────────────────────────────────────────────────────────────

export async function markQuestionsSeen(
  userId: string,
  courseId: string,
  questionIds: string[]
): Promise<void> {
  if (questionIds.length === 0) return;

  const rows = questionIds.map((qid) => ({
    user_id: userId,
    course_id: courseId,
    question_id: qid,
  }));

  const { error } = await supabase
    .from('user_questions_seen')
    .upsert(rows, {
      onConflict: 'user_id,course_id,question_id',
      ignoreDuplicates: true,
    });
  if (error) console.error('markQuestionsSeen:', error.message);
}

export async function getUnseenQuestions(
  userId: string,
  courseId: string,
  filters?: { macroAreaIds?: string[]; topicIds?: string[] }
): Promise<Question[]> {
  const seenIds = await getSeenQuestionIds(userId, courseId);

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
