// src/app/api/admin/reset-password/route.ts
//
// API route che usa la Service Role Key di Supabase (con permessi admin)
// per impostare una nuova password a un utente.
// NON esporre mai la service role key lato client.

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Usa la service role key (solo server-side, non NEXT_PUBLIC_)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ← variabile d'ambiente da aggiungere su Vercel
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId, newPassword } = await req.json();

    // Validazione input
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId mancante.' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password troppo corta (min 8 caratteri).' }, { status: 400 });
    }

    // Verifica che il chiamante sia admin leggendo il suo token dalla sessione
    // (sicurezza extra: solo utenti admin possono chiamare questa route)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
      if (caller) {
        const { data: callerProfile } = await supabaseAdmin
          .from('profiles')
          .select('is_admin')
          .eq('id', caller.id)
          .single();
        if (!callerProfile?.is_admin) {
          return NextResponse.json({ error: 'Non autorizzato.' }, { status: 403 });
        }
      }
    }

    // Imposta la nuova password tramite Admin API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Opzionale: salva un flag "must_change_password" nel profilo
    await supabaseAdmin
      .from('profiles')
      .update({ must_change_password: true })
      .eq('id', userId);

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore interno.' }, { status: 500 });
  }
}
