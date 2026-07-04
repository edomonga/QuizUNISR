// src/lib/coursesCache.ts
//
// Cache dei corsi. I corsi (nome, icona, exam_rules) cambiano molto di rado,
// ma venivano riscaricati con select=* a ogni apertura di quiz/esame/profilo:
// ~788 chiamate in 24 ore. Qui li teniamo in localStorage con una scadenza
// breve (10 minuti) e li invalidiamo subito quando l'admin li modifica.

import { supabase } from './supabase';
import type { Course } from '@/types';

const KEY = 'uniquiz:courses';
const TS_KEY = 'uniquiz:courses:ts';
const TTL_MS = 10 * 60 * 1000; // 10 minuti di validità

function readList(): Course[] | null {
  try {
    const ts = Number(localStorage.getItem(TS_KEY) ?? 0);
    if (Date.now() - ts > TTL_MS) return null; // scaduta
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Course[]) : null;
  } catch {
    return null;
  }
}

function writeList(list: Course[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    localStorage.setItem(TS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function invalidateCoursesCache() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(TS_KEY);
  } catch {
    /* ignore */
  }
}

async function fetchList(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as Course[];
}

/** Lista corsi, dalla cache quando possibile. */
export async function getCachedCourses(): Promise<Course[]> {
  const cached = readList();
  if (cached) return cached;
  const fresh = await fetchList();
  if (fresh.length) writeList(fresh);
  return fresh;
}

/** Singolo corso: preso dalla lista in cache; fetch mirato solo se assente. */
export async function getCachedCourse(id: string): Promise<Course | null> {
  const list = await getCachedCourses();
  const found = list.find((c) => c.id === id);
  if (found) return found;

  const { data } = await supabase.from('courses').select('*').eq('id', id).single();
  return (data as Course) ?? null;
}
