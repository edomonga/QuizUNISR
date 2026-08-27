// @vitest-environment jsdom
//
// shouldSignOut legge window.localStorage: serve un ambiente jsdom
// (a differenza degli altri test, che girano su Node puro per velocità).
import { describe, it, expect, beforeEach } from 'vitest';
import { shouldSignOut, setLocalSessionId, clearLocalSessionId } from './deviceSession';

describe('shouldSignOut', () => {
  beforeEach(() => {
    clearLocalSessionId();
  });

  it('non disconnette se il server non indica ancora nessuna sessione', () => {
    expect(shouldSignOut(null)).toBe(false);
    expect(shouldSignOut(undefined)).toBe(false);
  });

  it('non disconnette se questo dispositivo non ha ancora rivendicato una sessione locale (login in corso)', () => {
    // Nessun setLocalSessionId chiamato: local è assente.
    expect(shouldSignOut('sessione-server-123')).toBe(false);
  });

  it('non disconnette se la sessione locale coincide con quella del server', () => {
    setLocalSessionId('sessione-abc');
    expect(shouldSignOut('sessione-abc')).toBe(false);
  });

  it('disconnette se un altro dispositivo ha rivendicato una sessione diversa', () => {
    setLocalSessionId('sessione-vecchia');
    expect(shouldSignOut('sessione-nuova-da-altro-dispositivo')).toBe(true);
  });
});
