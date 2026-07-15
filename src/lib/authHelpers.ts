import { supabase } from './supabase';
import { claimSession, clearLocalSessionId } from './deviceSession';
import type { AuthUser } from '@/types';

const ALLOWED_DOMAIN = '@studenti.unisr.it';

export function isAllowedEmail(email: string): boolean {
  return email.toLowerCase().endsWith(ALLOWED_DOMAIN);
}

/** Sign up – only @studenti.unisr.it addresses are accepted */
export async function signUp(email: string, password: string, displayName: string, year?: number | null): Promise<{ error: string | null }> {
  if (!isAllowedEmail(email)) {
    return { error: `Registrazione riservata agli indirizzi ${ALLOWED_DOMAIN}` };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
      // `year` viene letto dal trigger handle_new_user per pre-impostare l'anno.
      data: { display_name: displayName, year: year ?? null },
    },
  });

  if (error) return { error: error.message };

  return { error: null };
}

/** Sign in with email + password */
export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  // Azzera SUBITO l'id di sessione locale: durante il login l'evento SIGNED_IN
  // può far partire il controllo "un solo dispositivo" prima che la nuova
  // sessione sia rivendicata. Con l'id locale assente il controllo non
  // disconnette (vedi shouldSignOut), evitando di buttarci fuori da soli.
  clearLocalSessionId();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Se l'email non è ancora stata confermata, spiegalo in modo chiaro invece
    // del generico "credenziali errate" (che confonderebbe chi si è appena iscritto).
    const msg = (error.message || '').toLowerCase();
    if (msg.includes('not confirmed') || (error as { code?: string }).code === 'email_not_confirmed') {
      return { user: null, error: 'Devi prima confermare la tua email: controlla la casella di posta (anche nello spam) e clicca sul link di conferma.' };
    }
    return { user: null, error: 'Email o password non corretti.' };
  }

  const profile = await getProfile(data.user.id);
  // Se il profilo manca o non è attivo, chiudi SUBITO la sessione: altrimenti
  // resterebbe un JWT valido con cui accedere ai dati/navigare via URL.
  if (!profile) {
    await supabase.auth.signOut();
    return { user: null, error: 'Profilo non trovato. Contatta un amministratore.' };
  }
  if (!profile.is_active) {
    await supabase.auth.signOut();
    return { user: null, error: 'Account non ancora attivato. Controlla la tua email oppure contatta un amministratore.' };
  }

  // Rivendica la sessione per QUESTO dispositivo: imposta active_session_id
  // lato server (disconnettendo l'eventuale dispositivo precedente) e salva
  // localmente l'id ricevuto. Va fatto PRIMA che il controllo periodico giri.
  if (data.session?.access_token) {
    await claimSession(data.session.access_token);
  }

  return { user: profile, error: null };
}

/** Sign out */
export async function signOut() {
  clearLocalSessionId();
  await supabase.auth.signOut();
}

/** Fetch profile by user id */
export async function getProfile(userId: string): Promise<AuthUser | null> {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, display_name, is_admin, is_active, is_super_admin, admin_years, must_change_password, year, active_session_id')
    .eq('id', userId)
    .single();

  if (!data) return null;
  return {
    id: data.id,
    email: data.email,
    display_name: data.display_name,
    is_admin: data.is_admin,
    is_active: data.is_active,
    is_super_admin: data.is_super_admin ?? false,
    admin_years: data.admin_years ?? [],
    must_change_password: data.must_change_password ?? false,
    year: data.year ?? null,
    active_session_id: data.active_session_id ?? null,
  };
}

/** Get current session user */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  return getProfile(session.user.id);
}
