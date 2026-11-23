import { describe, it, expect } from 'vitest';
import { isAllowedEmail, resendErrorMessage } from './authHelpers';

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

describe('resendErrorMessage', () => {
  it('spiega di attendere quando Supabase limita gli invii', () => {
    expect(resendErrorMessage('For security purposes, you can only request this after 58 seconds.')).toMatch(/Attendi un minuto/);
    expect(resendErrorMessage('Email rate limit exceeded')).toMatch(/Attendi un minuto/);
  });

  it('invita ad accedere se l\'email è già confermata', () => {
    expect(resendErrorMessage('Email already confirmed')).toMatch(/già confermata/);
  });

  it('dà un messaggio generico per gli altri errori', () => {
    expect(resendErrorMessage('Unexpected failure')).toMatch(/Invio non riuscito/);
  });
});
