'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/authHelpers';
import { shouldSignOut, markKicked, clearLocalSessionId } from '@/lib/deviceSession';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refresh: async () => {} });

// Ogni quanto ricontrollare che la sessione attiva sul server sia ancora
// la nostra (regola "un solo dispositivo per utente").
const SESSION_CHECK_MS = 45_000;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

  // Disconnette questo dispositivo perché un altro ha preso il suo posto.
  const kickOut = async () => {
    markKicked();
    clearLocalSessionId();
    await supabase.auth.signOut();
    setUser(null);
  };

  const loadUser = async () => {
    // Evita run concorrenti (login scatena sia SIGNED_IN sia un refresh esplicito):
    // due loadUser in parallelo potevano pestarsi i piedi e causare login "a vuoto".
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setUser(null);
        return;
      }
      const profile = await getProfile(session.user.id);
      if (profile && !profile.is_active) {
        // Profilo caricato ed effettivamente NON attivo → sicurezza: esci.
        await supabase.auth.signOut();
        setUser(null);
      } else if (profile && shouldSignOut(profile.active_session_id)) {
        // Un altro dispositivo ha rivendicato l'account: veniamo disconnessi.
        await kickOut();
      } else if (profile) {
        setUser(profile);
      }
      // Se `profile` è null (errore transitorio di rete / race): NON fare signOut.
      // La sessione resta valida e il profilo verrà riletto al prossimo giro o al
      // reload — così un semplice intoppo di rete non ti butta fuori durante il login.
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  // Controllo leggero della sola sessione attiva (senza ricaricare tutto il profilo).
  const checkActiveSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;
    const { data } = await supabase
      .from('profiles')
      .select('active_session_id')
      .eq('id', session.user.id)
      .single();
    // `data` null = intoppo di rete: non fare nulla, riprova al prossimo giro.
    if (data && shouldSignOut(data.active_session_id)) {
      await kickOut();
    }
  };

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    // Polling periodico + ricontrollo quando la scheda torna in primo piano.
    const interval = setInterval(() => { checkActiveSession(); }, SESSION_CHECK_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') checkActiveSession(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
