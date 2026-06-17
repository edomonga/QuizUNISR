import { supabase } from './supabase';
import type { Course, MacroArea, Topic, Question, UserStats, ExamResult, ExamAnswer, ExamRules, Profile } from '@/types';

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

export async function getQuestions(courseId: string, filters?: {
  macroAreaId?: string;
  topicId?: string;
  activeOnly?: boolean;
}): Promise<Question[]> {
  let q = supabase
    .from('questions')
    .select(`
      *,
      macro_areas ( name ),
      topics ( name )
    `)
    .eq('course_id', courseId);

  if (filters?.macroAreaId) q = q.eq('macro_area_id', filters.macroAreaId);
  if (filters?.topicId) q = q.eq('topic_id', filters.topicId);
  if (filters?.activeOnly) q = q.eq('is_active', true);

  q = q.order('created_at', { ascending: true });

  const { data, error } = await q;
  if (error) { console.error(error); return []; }

  return (data ?? []).map((row: any) => ({
    ...row,
    macro_area_name: row.macro_areas?.name,
    topic_name: row.topics?.name,
  })) as Question[];
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
  return { data: data as Question, error: null };
}

export async function deleteQuestion(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('questions').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function bulkInsertQuestions(questions: Array<Omit<Question, 'id' | 'created_at' | 'updated_at'>>): Promise<{ count: number; error: string | null }> {
  const { data, error } = await supabase.from('questions').insert(questions).select('id');
  if (error) return { count: 0, error: error.message };
  return { count: data?.length ?? 0, error: null };
}

// ─── Random question picker for exams ─────────────────────────────────────────

export async function pickExamQuestions(course: Course): Promise<Question[]> {
  const results: Question[] = [];

  for (const [macroAreaId, count] of Object.entries(course.exam_rules.distribution)) {
    const { data } = await supabase
      .from('questions')
      .select(`*, macro_areas(name), topics(name)`)
      .eq('course_id', course.id)
      .eq('macro_area_id', macroAreaId)
      .eq('is_active', true);

    if (!data) continue;

    const pool = data.map((row: any) => ({
      ...row,
      macro_area_name: row.macro_areas?.name,
      topic_name: row.topics?.name,
    })) as Question[];

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
  // Group by topic and macro area, upsert aggregates
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
    // Fetch existing
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
  // Deleting from profiles cascades (auth.users deletion must be done via service-role key, so we just deactivate)
  const { error } = await supabase.from('profiles').update({ is_active: false }).eq('id', id);
  return { error: error?.message ?? null };
}
