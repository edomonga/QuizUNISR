import { describe, it, expect } from 'vitest';
import { parseCorrect } from './importParsing';

describe('parseCorrect', () => {
  it('interpreta una singola lettera', () => {
    expect(parseCorrect('B', 5)).toEqual([1]);
  });

  it('interpreta una singola lettera minuscola', () => {
    expect(parseCorrect('c', 5)).toEqual([2]);
  });

  it('interpreta un singolo numero (1-based)', () => {
    expect(parseCorrect('2', 5)).toEqual([1]);
  });

  it('interpreta più risposte separate da virgola', () => {
    expect(parseCorrect('A,C', 5)).toEqual([0, 2]);
  });

  it('interpreta più risposte separate da punto e virgola, con spazi', () => {
    expect(parseCorrect(' B ; D ', 5)).toEqual([1, 3]);
  });

  it('ignora lettere fuori dal numero di opzioni disponibili', () => {
    // Con solo 3 opzioni (A,B,C), "E" (indice 4) va scartata.
    expect(parseCorrect('A,E', 3)).toEqual([0]);
  });

  it('ignora numeri fuori range (0 o oltre optCount)', () => {
    expect(parseCorrect('0,6', 5)).toEqual([]);
  });

  it('ignora token non riconoscibili', () => {
    expect(parseCorrect('A,??,C', 5)).toEqual([0, 2]);
  });

  it('valore vuoto o assente → nessuna risposta corretta', () => {
    expect(parseCorrect('', 5)).toEqual([]);
    expect(parseCorrect(null, 5)).toEqual([]);
    expect(parseCorrect(undefined, 5)).toEqual([]);
    expect(parseCorrect('   ', 5)).toEqual([]);
  });
});
