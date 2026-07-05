// src/lib/questionsCache.ts
//
// Cache lato browser delle domande di un corso, per ridurre drasticamente
// l'egress di Supabase. Le domande vengono scaricate UNA volta e riusate
// da localStorage; si riscaricano SOLO quando cambiano davvero.
//
// Come capiamo se sono cambiate ("versione"):
//   count(domande del corso)  +  updated_at più recente
// - un INSERT o un UPDATE cambia updated_at  → versione diversa → refetch
// - un DELETE fa scendere il count            → versione diversa → refetch
// La verifica costa 2 query minuscole (poche centinaia di byte) invece di
// riscaricare l'intero archivio a ogni apertura del quiz.

import { supabase } from './supabase';
import type { Question } from '@/types';

const DATA_PREFIX  = 'uniquiz:questions:';
const CHECK_PREFIX = 'uniquiz:qcheck:';
// Non ricontrolliamo la versione più di una volta al minuto: se l'utente
// naviga quiz → profilo → quiz in pochi secondi, non rifacciamo la verifica.
const RECHECK_MS = 5 * 60 * 1000; // 5 minuti

interface CacheEntry {
  version: string;
  questions: Question[];
}

function readCache(courseId: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + courseId);
    return raw ? (JSON.parse(raw) as CacheEntry) : null;
  } catch {
    return null; // localStorage assente (SSR) o JSON corrotto → nessuna cache
  }
}

function writeCache(courseId: string, entry: CacheEntry) {
  try {
    localStorage.setItem(DATA_PREFIX + courseId, JSON.stringify(entry));
  } catch {
    // Quota superata: libera le cache di altri corsi e riprova una volta.
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(DATA_PREFIX) && k !== DATA_PREFIX + courseId) {
          localStorage.removeItem(k);
        }
      }
      localStorage.setItem(DATA_PREFIX + courseId, JSON.stringify(entry));
    } catch {
      /* rinuncia in silenzio: resta comunque il fallback di rete */
    }
  }
}

function recentlyChecked(courseId: string): boolean {
  try {
    const t = Number(localStorage.getItem(CHECK_PREFIX + courseId) ?? 0);
    return Date.now() - t < RECHECK_MS;
  } catch {
    return false;
  }
}

function markChecked(courseId: string) {
  try {
    localStorage.setItem(CHECK_PREFIX + courseId, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/**
 * Query leggera UNIFICATA: in una sola richiesta ottiene sia il numero
 * totale di domande del corso (header Content-Range, via count:'exact')
 * sia l'updated_at più recente (unica riga restituita, ~100 byte).
 * Prima erano DUE richieste separate (HEAD count + GET limit 1).
 */
async function fetchVersion(courseId: string): Promise<string> {
  const { data, count, error } = await supabase
    .from('questions')
    .select('updated_at', { count: 'exact' })
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return `${count ?? 0}:${data?.[0]?.updated_at ?? '0'}`;
}

/** Scarica TUTTE le domande del corso (con i nomi di area/argomento). */
async function fetchAll(courseId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*, macro_areas ( name ), topics ( name )')
    .eq('course_id', courseId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []).map((row: any) => ({
    ...row,
    macro_area_name: row.macro_areas?.name,
    topic_name: row.topics?.name,
  })) as Question[];
}

/**
 * Punto di ingresso unico: restituisce tutte le domande del corso,
 * dalla cache quando possibile. Tutti i filtri (area, argomento, is_active,
 * quiz, esame, ripasso errori) si applicano poi in memoria su questo elenco.
 */
export async function getCachedCourseQuestions(courseId: string): Promise<Question[]> {
  const cached = readCache(courseId);

  // Verifica appena fatta di recente → usa la cache senza toccare la rete.
  if (cached && recentlyChecked(courseId)) return cached.questions;

  let version: string;
  try {
    version = await fetchVersion(courseId);
  } catch {
    // Rete non disponibile: se abbiamo una copia, meglio quella che niente.
    return cached?.questions ?? [];
  }

  // La cache è ancora valida → nessun download.
  if (cached && cached.version === version) {
    markChecked(courseId);
    return cached.questions;
  }

  // Prima volta o dati cambiati → scarica e salva.
  const fresh = await fetchAll(courseId);
  writeCache(courseId, { version, questions: fresh });
  markChecked(courseId);
  return fresh;
}

/** Forza il refetch al prossimo accesso (usata dopo modifiche admin). */
export function invalidateQuestionsCache(courseId?: string) {
  try {
    if (courseId) {
      localStorage.removeItem(DATA_PREFIX + courseId);
      localStorage.removeItem(CHECK_PREFIX + courseId);
      return;
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(DATA_PREFIX) || k.startsWith(CHECK_PREFIX))) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
}
