// src/lib/adminAuth.ts
//
// Helper server-side condiviso dalle API route admin.
// Verifica in modo OBBLIGATORIO che il chiamante abbia un token
// valido E sia admin. Prima questo controllo era facoltativo:
// senza header Authorization la verifica veniva saltata del tutto.

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export function getSupabaseAdmin(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export interface AdminCheck {
  ok: boolean;
  status: number;
  error?: string;
  callerId?: string;
}

/**
 * Ritorna ok:true SOLO se il token è presente, valido e appartiene
 * a un profilo con is_admin = true. In ogni altro caso la richiesta
 * va rifiutata (401/403) — mai proseguire senza verifica.
 */
export async function requireAdmin(
  supabaseAdmin: SupabaseClient,
  authHeader: string | null
): Promise<AdminCheck> {
  return checkCaller(supabaseAdmin, authHeader, false);
}

/**
 * Come requireAdmin, ma esige un SUPER admin. Usato dalle operazioni
 * riservate (gestione utenti: reset password, eliminazione account).
 */
export async function requireSuperAdmin(
  supabaseAdmin: SupabaseClient,
  authHeader: string | null
): Promise<AdminCheck> {
  return checkCaller(supabaseAdmin, authHeader, true);
}

async function checkCaller(
  supabaseAdmin: SupabaseClient,
  authHeader: string | null,
  superOnly: boolean
): Promise<AdminCheck> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Autenticazione richiesta.' };
  }

  const token = authHeader.slice('Bearer '.length).trim();
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return { ok: false, status: 401, error: 'Sessione non valida o scaduta.' };
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, is_active, is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin || !profile?.is_active) {
    return { ok: false, status: 403, error: 'Non autorizzato.' };
  }
  if (superOnly && !profile?.is_super_admin) {
    return { ok: false, status: 403, error: 'Operazione riservata ai super admin.' };
  }

  return { ok: true, status: 200, callerId: user.id };
}
