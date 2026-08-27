import { describe, it, expect } from 'vitest';
import { isAllowedEmail } from './authHelpers';

describe('isAllowedEmail', () => {
  it('accetta un indirizzo @studenti.unisr.it', () => {
    expect(isAllowedEmail('mario.rossi@studenti.unisr.it')).toBe(true);
  });

  it('è case-insensitive sul dominio', () => {
    expect(isAllowedEmail('mario.rossi@STUDENTI.UNISR.IT')).toBe(true);
  });

  it('rifiuta domini diversi', () => {
    expect(isAllowedEmail('mario.rossi@gmail.com')).toBe(false);
  });

  it('rifiuta un dominio che contiene la stringa ma non termina così', () => {
    expect(isAllowedEmail('mario.rossi@studenti.unisr.it.evil.com')).toBe(false);
  });

  it('rifiuta una stringa vuota', () => {
    expect(isAllowedEmail('')).toBe(false);
  });
});
