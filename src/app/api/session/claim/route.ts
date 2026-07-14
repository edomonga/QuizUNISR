// src/app/api/session/claim/route.ts
//
// Rivendica la sessione attiva per il dispositivo che ha appena fatto login.
// Regola: "il nuovo dispositivo vince" — impostando profiles.active_session_id
// a un nuovo id, il dispositivo precedente (che aveva l'id vecchio) verrà
// disconnesso al successivo controllo lato client.
//
// Inoltre registra il dispositivo in user_devices: se è un dispositivo mai
// visto per quell'utente, invia una notifica email all'amministratore.
//
// Autorizzazione: richiede il bearer token dell'utente (non serve essere
// admin), ma l'utente deve avere un profilo ATTIVO. Tutte le scritture usano
// la service-role key, quindi bypassano la RLS in modo controllato.

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getSupabaseAdmin } from '@/lib/adminAuth';
import { sendNewDeviceEmail } from '@/lib/notifyEmail';

export const runtime = 'nodejs';

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'sconosciuto';
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Autenticazione: token valido obbligatorio.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Autenticazione richiesta.' }, { status: 401 });
    }
    const token = authHeader.slice('Bearer '.length).trim();
    const { data: { user }, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !user) {
      return NextResponse.json({ error: 'Sessione non valida.' }, { status: 401 });
    }

    // 2. Il profilo deve esistere ed essere attivo.
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, email, display_name, is_active')
      .eq('id', user.id)
      .single();
    if (!profile || !profile.is_active) {
      return NextResponse.json({ error: 'Profilo non attivo.' }, { status: 403 });
    }

    // 3. Validazione input.
    const body = await req.json().catch(() => null);
    const deviceId = body?.deviceId;
    const userAgent = (body?.userAgent ?? req.headers.get('user-agent') ?? '').toString().slice(0, 500);
    if (!deviceId || typeof deviceId !== 'string' || deviceId.length > 100) {
      return NextResponse.json({ error: 'deviceId mancante o non valido.' }, { status: 400 });
    }
    const ip = clientIp(req);

    // 4. Genera e imposta la nuova sessione attiva (il nuovo dispositivo vince).
    const sessionId = randomUUID();
    const { error: updErr } = await supabaseAdmin
      .from('profiles')
      .update({ active_session_id: sessionId, active_session_updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (updErr) {
      console.error('session/claim update:', updErr.message);
      return NextResponse.json({ error: 'Impossibile registrare la sessione.' }, { status: 500 });
    }

    // 5. Registra il dispositivo. È "nuovo" se non esiste già per questo utente.
    const { data: existing } = await supabaseAdmin
      .from('user_devices')
      .select('id')
      .eq('user_id', user.id)
      .eq('device_id', deviceId)
      .maybeSingle();

    const isNewDevice = !existing;

    if (isNewDevice) {
      await supabaseAdmin.from('user_devices').insert({
        user_id: user.id,
        device_id: deviceId,
        user_agent: userAgent,
        last_ip: ip,
      });
    } else {
      await supabaseAdmin
        .from('user_devices')
        .update({ last_seen: new Date().toISOString(), last_ip: ip, user_agent: userAgent })
        .eq('id', existing!.id);
    }

    // 6. Notifica email SOLO per dispositivi mai visti.
    if (isNewDevice) {
      const { count } = await supabaseAdmin
        .from('user_devices')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Non attendiamo l'esito dell'email per non rallentare il login,
      // ma la awaitiamo comunque perché su serverless il processo può
      // terminare subito dopo la risposta.
      await sendNewDeviceEmail({
        userName: profile.display_name,
        userEmail: profile.email,
        userAgent,
        ip,
        when: new Date(),
        knownDevicesCount: count ?? 1,
      });
    }

    return NextResponse.json({ sessionId });
  } catch (e) {
    console.error('session/claim unexpected:', e);
    return NextResponse.json({ error: 'Errore interno.' }, { status: 500 });
  }
}
