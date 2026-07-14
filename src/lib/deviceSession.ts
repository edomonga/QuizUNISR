// src/lib/deviceSession.ts
//
// Gestione lato client dell'identità di dispositivo e della sessione attiva,
// per la regola "un solo dispositivo per utente".
//
//  - device_id  : id casuale PERSISTENTE del browser/dispositivo. Serve a
//                 riconoscere i dispositivi già visti (per le notifiche).
//  - session_id : id della sessione corrente. Ad ogni login il server ne
//                 genera uno nuovo e lo salva su profiles.active_session_id;
//                 noi lo teniamo qui. Se quello sul server cambia (perché è
//                 entrato un altro dispositivo) veniamo disconnessi.

const DEVICE_ID_KEY = 'quizunisr_device_id';
const SESSION_ID_KEY = 'quizunisr_session_id';
const KICKED_KEY = 'quizunisr_kicked'; // flag temporaneo per il messaggio in /login

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback molto improbabile (browser vecchissimi).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Id persistente del dispositivo (creato la prima volta e mai più cambiato). */
export function getDeviceId(): string {
  const ls = safeLocalStorage();
  if (!ls) return randomId();
  let id = ls.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = randomId();
    ls.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getLocalSessionId(): string | null {
  return safeLocalStorage()?.getItem(SESSION_ID_KEY) ?? null;
}

export function setLocalSessionId(id: string): void {
  safeLocalStorage()?.setItem(SESSION_ID_KEY, id);
}

export function clearLocalSessionId(): void {
  safeLocalStorage()?.removeItem(SESSION_ID_KEY);
}

/** Segna che siamo stati disconnessi da un altro dispositivo (per /login). */
export function markKicked(): void {
  safeLocalStorage()?.setItem(KICKED_KEY, '1');
}

/** Legge e azzera il flag "kicked". Ritorna true se era impostato. */
export function consumeKicked(): boolean {
  const ls = safeLocalStorage();
  if (!ls) return false;
  const was = ls.getItem(KICKED_KEY) === '1';
  if (was) ls.removeItem(KICKED_KEY);
  return was;
}

/**
 * "Rivendica" la sessione per questo dispositivo dopo un login riuscito:
 * chiede al server di impostare active_session_id e memorizza l'id ricevuto.
 * Un eventuale errore NON blocca il login (viene solo loggato).
 */
export async function claimSession(accessToken: string): Promise<void> {
  try {
    const res = await fetch('/api/session/claim', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      }),
    });
    if (!res.ok) {
      console.warn('[deviceSession] claim non riuscito:', res.status);
      return;
    }
    const json = await res.json().catch(() => null);
    if (json?.sessionId) setLocalSessionId(json.sessionId);
  } catch (e) {
    console.warn('[deviceSession] claim errore di rete:', e);
  }
}

/**
 * Decide se questo dispositivo deve essere disconnesso.
 * Regola: si esce SOLO se sappiamo di aver rivendicato una sessione (local
 * presente) e il server ne indica un'altra (dbId presente e diverso).
 * Se local è assente non disconnettiamo: significa che stiamo effettuando
 * ora il login (rivendicazione in corso) oppure è una sessione "legacy".
 */
export function shouldSignOut(dbSessionId: string | null | undefined): boolean {
  const local = getLocalSessionId();
  if (!dbSessionId) return false;
  if (!local) return false;
  return local !== dbSessionId;
}
