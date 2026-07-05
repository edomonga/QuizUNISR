// src/lib/metaCache.ts
//
// Cache di macro-aree e argomenti per corso. Cambiano di rado (solo da
// admin) ma venivano riscaricati a ogni apertura del setup quiz/esame.
// TTL breve (10 minuti) + invalidazione immediata alle modifiche admin:
// stessa strategia di coursesCache.

import { supabase } from './supabase';
import type { MacroArea, Topic } from '@/types';

const AREAS_PREFIX  = 'uniquiz:areas:';
const TOPICS_PREFIX = 'uniquiz:topics:';
const TTL_MS = 10 * 60 * 1000;

interface Entry<T> { ts: number; items: T[] }

function read<T>(key: string): T[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry<T>;
    if (!e || Date.now() - e.ts > TTL_MS || !Array.isArray(e.items)) return null;
    return e.items;
  } catch {
    return null;
  }
}

function write<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    /* ignore */
  }
}

/** Invalida aree+argomenti di un corso, o di tutti se courseId assente. */
export function invalidateMetaCache(courseId?: string) {
  try {
    if (courseId) {
      localStorage.removeItem(AREAS_PREFIX + courseId);
      localStorage.removeItem(TOPICS_PREFIX + courseId);
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(AREAS_PREFIX) || k.startsWith(TOPICS_PREFIX))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}

export async function getCachedMacroAreas(courseId: string): Promise<MacroArea[]> {
  const cached = read<MacroArea>(AREAS_PREFIX + courseId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('macro_areas')
    .select('*')
    .eq('course_id', courseId)
    .order('display_order', { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  const list = (data ?? []) as MacroArea[];
  write(AREAS_PREFIX + courseId, list);
  return list;
}

export async function getCachedTopics(courseId: string): Promise<Topic[]> {
  const cached = read<Topic>(TOPICS_PREFIX + courseId);
  if (cached) return cached;

  const { data, error } = await supabase
    .from('topics')
    .select('*')
    .eq('course_id', courseId)
    .order('name', { ascending: true });
  if (error) {
    console.error(error);
    return [];
  }
  const list = (data ?? []) as Topic[];
  write(TOPICS_PREFIX + courseId, list);
  return list;
}
