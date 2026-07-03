// src/app/api/admin/deleteuser/route.ts
//
// VERSIONE CORRETTA.
// Bug precedente (critico): come per reset-password, senza header
// Authorization il controllo admin veniva saltato e CHIUNQUE
// poteva eliminare definitivamente qualsiasi utente.
// Aggiunte anche due protezioni: un admin non può eliminare
// se stesso né un altro admin (prima va declassato).

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin, requireAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Autenticazione OBBLIGATORIA: solo admin attivi.
    const check = await requireAdmin(supabaseAdmin, req.headers.get('Authorization'));
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    // 2. Validazione input.
    const body = await req.json().catch(() => null);
    const userId = body?.userId;
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId mancante.' }, { status: 400 });
    }

    // 3. Protezioni: no auto-eliminazione, no eliminazione di altri admin.
    if (userId === check.callerId) {
      return NextResponse.json(
        { error: 'Non puoi eliminare il tuo stesso account.' },
        { status: 400 }
      );
    }
    const { data: target } = await supabaseAdmin
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();
    if (target?.is_admin) {
      return NextResponse.json(
        { error: 'Rimuovi prima i privilegi admin a questo utente.' },
        { status: 400 }
      );
    }

    // 4. Eliminazione: prima il profilo (cascade sulle tabelle figlie),
    //    poi l'utente da auth.users.
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error('deleteuser:', error.message);
      return NextResponse.json(
        { error: "Impossibile eliminare l'utente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('deleteuser unexpected:', e);
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 });
  }
}
