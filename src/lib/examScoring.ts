// Logica di punteggio dell'esame, estratta in un modulo puro e testabile.
// Prima era duplicata (esame standard + esame bifasico): stessa formula
// scritta due volte, a rischio di divergere ad ogni modifica futura.

export interface ExamScoreRule {
  correct_score: number;
  wrong_penalty: number;
  total_questions: number;
}

export interface ExamScore {
  correct: number;
  wrong: number;
  omitted: number;
  raw: number;
  scoreIn30: number;
}

/** Una risposta è corretta solo se seleziona ESATTAMENTE l'insieme delle opzioni corrette (nessuna omessa conta come corretta). */
export function isAnswerCorrect(selected: number[], correctIndices: number[]): boolean {
  if (selected.length === 0) return false;
  return selected.length === correctIndices.length && selected.every(i => correctIndices.includes(i));
}

/**
 * Calcola corrette/errate/omesse e il punteggio in trentesimi per un esame.
 * `answers[i]` sono gli indici selezionati per la domanda i, `correctByQuestion[i]`
 * i corrispondenti indici corretti (già nell'ordine mescolato mostrato allo studente).
 */
export function computeExamScore(
  answers: number[][],
  correctByQuestion: number[][],
  rule: ExamScoreRule
): ExamScore {
  let correct = 0, wrong = 0, omitted = 0;
  answers.forEach((sel, i) => {
    if (sel.length === 0) { omitted++; return; }
    if (isAnswerCorrect(sel, correctByQuestion[i] ?? [])) correct++; else wrong++;
  });
  const raw = Number((correct * rule.correct_score - wrong * rule.wrong_penalty).toFixed(10));
  // Il massimo è il numero di domande MOLTIPLICATO per i punti di una corretta.
  // Dividere soltanto per le domande penalizzava i corsi con correct_score < 1.
  const maximum = rule.total_questions * rule.correct_score;
  const scoreIn30 = maximum > 0 ? roundExamGrade((raw / maximum) * 30) : 0;
  return { correct, wrong, omitted, raw, scoreIn30 };
}

/** Punti leggibili in italiano, senza residui della rappresentazione binaria. */
export function formatExamPoints(points: number): string {
  return new Intl.NumberFormat('it-IT', { maximumFractionDigits: 2 }).format(points);
}

/** Arrotonda solo il voto finale: da 0,5 in su per eccesso, altrimenti per difetto. */
export function roundExamGrade(score: number): number {
  // Rimuove esclusivamente il rumore numerico, senza arrotondare prima ai decimi.
  return Math.max(0, Math.min(30, Math.round(Number(score.toFixed(10)))));
}
