import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, computeExamScore, formatExamPoints, roundExamGrade, type ExamScoreRule } from './examScoring';

describe('isAnswerCorrect', () => {
  it('nessuna selezione (omessa) non è mai corretta', () => {
    expect(isAnswerCorrect([], [0])).toBe(false);
  });

  it('selezione identica alle corrette è corretta', () => {
    expect(isAnswerCorrect([1, 2], [2, 1])).toBe(true); // ordine non conta
  });

  it('selezione parziale (manca un\'opzione corretta) non è corretta', () => {
    expect(isAnswerCorrect([1], [1, 2])).toBe(false);
  });

  it('selezione con opzione extra sbagliata non è corretta', () => {
    expect(isAnswerCorrect([0, 1], [0])).toBe(false);
  });
});

describe('computeExamScore', () => {
  const rule: ExamScoreRule = { correct_score: 1, wrong_penalty: 0.25, total_questions: 4 };

  it('calcola corrette/errate/omesse e il punteggio in trentesimi', () => {
    // 2 corrette, 1 errata, 1 omessa su 4 domande.
    const answers = [[0], [1], [], [2]];
    const correctByQuestion = [[0], [0], [1], [2]];
    const score = computeExamScore(answers, correctByQuestion, rule);
    expect(score.correct).toBe(2);
    expect(score.wrong).toBe(1);
    expect(score.omitted).toBe(1);
    // raw = 1.75 → 13.125/30 → 13 (un solo arrotondamento finale)
    expect(score.raw).toBeCloseTo(1.75);
    expect(score.scoreIn30).toBe(13);
  });

  it('il punteggio non scende mai sotto zero anche con molte risposte errate', () => {
    const answers = [[9], [9], [9], [9]];
    const correctByQuestion = [[0], [0], [0], [0]];
    const score = computeExamScore(answers, correctByQuestion, rule);
    expect(score.wrong).toBe(4);
    expect(score.scoreIn30).toBe(0);
  });

  it('tutte omesse → punteggio zero, nessuna corretta né errata', () => {
    const answers = [[], [], [], []];
    const correctByQuestion = [[0], [0], [0], [0]];
    const score = computeExamScore(answers, correctByQuestion, rule);
    expect(score.correct).toBe(0);
    expect(score.wrong).toBe(0);
    expect(score.omitted).toBe(4);
    expect(score.raw).toBe(0);
    expect(score.scoreIn30).toBe(0);
  });

  it('tutte corrette → punteggio massimo 30', () => {
    const answers = [[0], [0], [0], [0]];
    const correctByQuestion = [[0], [0], [0], [0]];
    const score = computeExamScore(answers, correctByQuestion, rule);
    expect(score.scoreIn30).toBe(30);
  });
});

describe('formatExamPoints', () => {
  it('mostra 39 risposte da 0,7 punti senza residui decimali', () => {
    expect(formatExamPoints(39 * 0.7)).toBe('27,3');
  });

  it('preserva le penalità da un quarto di punto', () => {
    expect(formatExamPoints(3 * 0.25)).toBe('0,75');
    expect(formatExamPoints(0)).toBe('0');
  });
});

describe('roundExamGrade', () => {
  it.each([
    [27.3, 27], [27.4, 27], [27.49, 27], [27.499, 27],
    [27.5, 28], [27.6, 28], [17.49, 17], [17.5, 18],
    [29.5, 30], [31.5, 30], [-0.5, 0], [-2, 0], [0, 0],
    [27.499999999999996, 28],
  ])('%s diventa %s', (points, expected) => {
    expect(roundExamGrade(points)).toBe(expected);
  });
});

describe('punteggi pesati e normalizzazione', () => {
  function exam(correct: number, wrong: number, omitted: number, points: number, penalty = 0) {
    const answers = [...Array.from({ length: correct }, () => [0]),
      ...Array.from({ length: wrong }, () => [1]),
      ...Array.from({ length: omitted }, () => [] as number[])];
    return computeExamScore(answers, answers.map(() => [0]), {
      correct_score: points, wrong_penalty: penalty, total_questions: answers.length,
    });
  }

  it('regressione Testa-Collo: 39 corrette da 0,7 e 6 errate valgono 26/30', () => {
    expect(exam(39, 6, 0, 0.7)).toEqual({
      correct: 39, wrong: 6, omitted: 0, raw: 27.3, scoreIn30: 26,
    });
  });

  it.each([0.7, 1, 2])('tutte corrette con %s punti valgono 30/30', points => {
    expect(exam(45, 0, 0, points).scoreIn30).toBe(30);
  });

  it('le omesse restano nel massimo ottenibile', () => {
    expect(exam(39, 0, 6, 0.7).scoreIn30).toBe(26);
  });

  it('sottrae le penalità prima della normalizzazione e arrotonda una sola volta', () => {
    const score = exam(39, 6, 0, 0.7, 0.25);
    expect(score.raw).toBe(25.8);
    expect(score.scoreIn30).toBe(25);
  });

  it('arrotonda 17,5 a 18 anche nel percorso completo', () => {
    expect(exam(35, 25, 0, 0.7).scoreIn30).toBe(18);
  });

  it('un massimo nullo non produce NaN o Infinity', () => {
    expect(exam(0, 0, 0, 0.7).scoreIn30).toBe(0);
    expect(exam(4, 0, 0, 0).scoreIn30).toBe(0);
  });
});
