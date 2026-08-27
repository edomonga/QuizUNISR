// Parsing delle risposte corrette dal file Excel/CSV di import domande.
// Estratto in un modulo a parte (era una funzione locale nel pannello admin)
// per poterlo testare in isolamento: un import da centinaia di domande che
// interpreta male "B" o "2,4" silenziosamente è un errore difficile da notare
// a mano nel pannello.

/**
 * Converte il valore della colonna "correct" (es. "B", "2,4", "A;C") negli
 * indici (da 0) delle opzioni corrette. Lettere e numeri fuori dal range
 * delle opzioni disponibili vengono ignorati; un valore vuoto dà nessuna
 * risposta corretta.
 */
export function parseCorrect(val: unknown, optCount: number): number[] {
  if (val === null || val === undefined || String(val).trim() === '') return [];
  const str = String(val).trim().toUpperCase();
  return str.split(/[,;]/).map(s => s.trim()).reduce<number[]>((acc, token) => {
    if (/^[A-Z]$/.test(token)) { const idx = token.charCodeAt(0) - 65; if (idx < optCount) acc.push(idx); }
    else if (/^\d+$/.test(token)) { const idx = parseInt(token, 10) - 1; if (idx >= 0 && idx < optCount) acc.push(idx); }
    return acc;
  }, []);
}
