'use client';

import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@/lib/authHelpers';
import type { AuthUser } from '@/types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({ user: null, loading: true, refresh: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const inFlight = useRef(false);

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

  useEffect(() => {
    loadUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await loadUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, refresh: loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
