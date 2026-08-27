import { describe, it, expect } from 'vitest';
import { isAnswerCorrect, computeExamScore, type ExamScoreRule } from './examScoring';

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
    // raw = 2*1 - 1*0.25 = 1.75 → scoreIn30 = round((1.75/4)*30*10)/10 = 13.1
    expect(score.raw).toBeCloseTo(1.75);
    expect(score.scoreIn30).toBeCloseTo(13.1);
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
