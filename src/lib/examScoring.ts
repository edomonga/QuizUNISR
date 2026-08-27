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
  const raw = correct * rule.correct_score - wrong * rule.wrong_penalty;
  const scoreIn30 = Math.max(0, Math.round((raw / rule.total_questions) * 30 * 10) / 10);
  return { correct, wrong, omitted, raw, scoreIn30 };
}
