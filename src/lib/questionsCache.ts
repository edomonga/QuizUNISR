// src/lib/questionsCache.ts
//
// Cache lato browser delle domande di un corso, per ridurre drasticamente
// l'egress di Supabase. Le domande vengono scaricate UNA volta e riusate
// da localStorage; quando cambiano, si scaricano SOLO le righe modificate
// (delta sync); il download completo resta come fallback per prima visita
// e cancellazioni.
//
// Rilevamento modifiche (una sola richiesta, ~100 byte):
//   count(domande del corso) + updated_at più recente
// - INSERT/UPDATE alzano updated_at → si scarica il delta e si fonde;
// - DELETE fa scendere il count → il merge non torna → full refetch;
// - qualsiasi dubbio → full refetch (comportamento identico a prima).

import { supabase } from './supabase';
import type { Question } from '@/types';

const DATA_PREFIX  = 'uniquiz:questions:v2:'; // v2: nuovo formato cache
const CHECK_PREFIX = 'uniquiz:qcheck:';
// Non ricontrolliamo la versione più di una volta ogni RECHECK_MS: se
// l'utente naviga quiz → profilo → quiz in pochi secondi, nessuna verifica.
const RECHECK_MS = 5 * 60 * 1000;

interface CacheEntry {
  count: number;       // n. domande sul server all'ultimo sync
  maxUpdated: string;  // updated_at ISO più recente all'ultimo sync
  questions: Question[];
}

function readCache(courseId: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(DATA_PREFIX + courseId);
    if (!raw) return null;
    const e = JSON.parse(raw) as CacheEntry;
    // valida la forma: entry di versioni vecchie → ignorata (full refetch)
    if (typeof e?.count !== 'number' || typeof e?.maxUpdated !== 'string' || !Array.isArray(e?.questions)) return null;
    return e;
  } catch {
    return null;
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
      /* rinuncia in silenzio: resta il fallback di rete */
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

/** Mappa una riga PostgREST (con join) nel tipo Question usato dall'app. */
function mapRow(row: any): Question {
  return {
    ...row,
    macro_area_name: row.macro_areas?.name,
    topic_name: row.topics?.name,
  } as Question;
}

/**
 * Query leggera UNIFICATA (una richiesta): count esatto via header
 * Content-Range + updated_at più recente come unica riga (~100 byte).
 */
async function fetchVersion(courseId: string): Promise<{ count: number; maxUpdated: string }> {
  const { data, count, error } = await supabase
    .from('questions')
    .select('updated_at', { count: 'exact' })
    .eq('course_id', courseId)
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) throw error;
  return { count: count ?? 0, maxUpdated: data?.[0]?.updated_at ?? '0' };
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
  return (data ?? []).map(mapRow);
}

/** Scarica SOLO le domande modificate/aggiunte dopo `sinceIso`. */
async function fetchDelta(courseId: string, sinceIso: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('*, macro_areas ( name ), topics ( name )')
    .eq('course_id', courseId)
    .gt('updated_at', sinceIso);

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Full fetch + scrittura cache (percorso "prima volta" o fallback). */
async function fullRefresh(courseId: string): Promise<Question[]> {
  const fresh = await fetchAll(courseId);
  const maxUpd = fresh.reduce((m, q: any) => (q.updated_at > m ? q.updated_at : m), '0');
  writeCache(courseId, { count: fresh.length, maxUpdated: maxUpd, questions: fresh });
  markChecked(courseId);
  return fresh;
}

/**
 * Punto di ingresso unico: restituisce tutte le domande del corso,
 * dalla cache quando possibile, aggiornata con il solo delta quando
 * cambia qualcosa. Tutti i filtri (area, argomento, is_active, quiz,
 * esame, ripasso errori) si applicano poi in memoria, come prima.
 */
export async function getCachedCourseQuestions(courseId: string): Promise<Question[]> {
  const cached = readCache(courseId);

  // Verifica fatta di recente → usa la cache senza toccare la rete.
  if (cached && recentlyChecked(courseId)) return cached.questions;

  let remote: { count: number; maxUpdated: string };
  try {
    remote = await fetchVersion(courseId);
  } catch {
    // Rete non disponibile: se abbiamo una copia, meglio quella che niente.
    return cached?.questions ?? [];
  }

  // Nessuna cache → primo download completo.
  if (!cached) return fullRefresh(courseId);

  // Cache ancora valida → nessun download.
  if (cached.count === remote.count && cached.maxUpdated === remote.maxUpdated) {
    markChecked(courseId);
    return cached.questions;
  }

  // Ci sono novità: prova il DELTA (solo righe con updated_at più recente).
  if (remote.maxUpdated > cached.maxUpdated) {
    try {
      const delta = await fetchDelta(courseId, cached.maxUpdated);
      const byId = new Map<string, Question>(cached.questions.map((q) => [q.id, q]));
      for (const q of delta) byId.set(q.id, q);

      // Se i conti tornano, il merge è completo (nessuna cancellazione).
      if (byId.size === remote.count) {
        const merged = Array.from(byId.values()).sort((a: any, b: any) =>
          a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0
        );
        writeCache(courseId, { count: remote.count, maxUpdated: remote.maxUpdated, questions: merged });
        markChecked(courseId);
        return merged;
      }
      // I conti non tornano (es. domande cancellate) → full refetch sotto.
    } catch {
      /* delta fallito → full refetch sotto */
    }
  }

  // Fallback sicuro: download completo (comportamento identico a prima).
  return fullRefresh(courseId);
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
