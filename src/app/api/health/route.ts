// Endpoint di health-check per il monitoraggio uptime (es. UptimeRobot,
// BetterStack). Verifica che il DATABASE sia davvero raggiungibile, non
// solo che il server risponda: un semplice ping alla home page potrebbe
// dare 200 OK anche con Supabase irraggiungibile (pagine statiche/cache).
//
// Endpoint pubblico e senza autenticazione per design: un monitor esterno
// deve poterlo interrogare senza credenziali. Non espone dati sensibili,
// solo lo stato "ok"/"errore".

import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/adminAuth';

export const runtime = 'nodejs';
// Mai cacheare: ogni chiamata deve controllare lo stato reale in quel momento.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('courses').select('id', { count: 'exact', head: true }).limit(1);
    if (error) {
      return NextResponse.json({ status: 'error', db: 'unreachable' }, { status: 503 });
    }
    return NextResponse.json({ status: 'ok', db: 'ok', timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
