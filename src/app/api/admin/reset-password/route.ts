// src/app/api/admin/reset-password/route.ts
//
// VERSIONE CORRETTA.
// Bug precedente (critico): il controllo admin era dentro
// `if (authHeader) { ... }` — bastava NON inviare l'header
// Authorization per resettare la password di qualunque utente.
// Ora il controllo è obbligatorio e la route fallisce in modo
// sicuro (fail-closed).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, requireSuperAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Autenticazione OBBLIGATORIA: solo super admin attivi.
    const check = await requireSuperAdmin(supabaseAdmin, req.headers.get('Authorization'));
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    // 2. Validazione input.
    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    const newPassword = body?.newPassword;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId mancante.' }, { status: 400 });
    }
    if (
      !newPassword ||
      typeof newPassword !== 'string' ||
      newPassword.length < 8 ||
      newPassword.length > 72
    ) {
      return NextResponse.json(
        { error: 'Password non valida (8–72 caratteri).' },
        { status: 400 }
      );
    }

    // 3. Aggiorna la password tramite Admin API.
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (error) {
      console.error('reset-password:', error.message);
      return NextResponse.json(
        { error: 'Impossibile aggiornare la password.' },
        { status: 500 }
      );
    }

    // 4. Forza il cambio password al prossimo login.
    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Mai restituire e.message al client: può rivelare dettagli interni.
    console.error('reset-password unexpected:', e);
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 });
  }
}
