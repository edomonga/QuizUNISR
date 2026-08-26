// Persistenza LOCALE (solo su questo browser/dispositivo) delle risposte
// date durante un esame in corso, così una ricarica accidentale della
// pagina, una tab chiusa per sbaglio o un crash del browser non fanno
// perdere il lavoro fatto fino a quel momento.
//
// Limite noto e accettato: non sincronizza sul server. Se lo studente
// cambia dispositivo o svuota i dati del browser, il progresso si perde
// comunque. È un livello di protezione base, non un salvataggio remoto.
//
// Importante: viene salvato anche `startedAt` (istante di inizio reale),
// non solo le risposte — necessario per calcolare il tempo REALMENTE
// trascorso al momento della ripresa, così una ricarica non "resetta" il
// timer regalando tempo extra.

const PREFIX = 'uniquiz:examProgress:';

export interface StoredExamProgress<Q> {
  courseId: string;
  userId: string;
  startedAt: number;       // epoch ms
  timeLimitSeconds: number;
  questions: Q[];           // le domande già pescate/mescolate a inizio esame
  answers: number[][];
  cur: number;
}

function storageKey(userId: string, courseId: string): string {
  return `${PREFIX}${userId}:${courseId}`;
}

export function saveExamProgress<Q>(progress: StoredExamProgress<Q>): void {
  try {
    localStorage.setItem(storageKey(progress.userId, progress.courseId), JSON.stringify(progress));
  } catch {
    // localStorage pieno/non disponibile: il salvataggio locale è un extra,
    // non deve mai interrompere lo svolgimento dell'esame.
  }
}

export function loadExamProgress<Q>(userId: string, courseId: string): StoredExamProgress<Q> | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, courseId));
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredExamProgress<Q>;
    if (!p || p.userId !== userId || p.courseId !== courseId || !Array.isArray(p.questions) || !Array.isArray(p.answers) || typeof p.startedAt !== 'number') {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

export function clearExamProgress(userId: string, courseId: string): void {
  try {
    localStorage.removeItem(storageKey(userId, courseId));
  } catch {
    /* ignore */
  }
}
