// src/app/api/admin/delete-user/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'userId mancante.' }, { status: 400 });
    }

    // Verifica che il chiamante sia admin
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

    // Elimina prima il profilo (cascade sulle altre tabelle)
    await supabaseAdmin.from('profiles').delete().eq('id', userId);

    // Elimina l'utente da auth.users (richiede service role)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });

  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Errore interno.' }, { status: 500 });
  }
}
