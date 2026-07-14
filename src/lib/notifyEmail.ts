// src/lib/notifyEmail.ts
//
// Invio email di notifica all'amministratore (solo lato server).
// Usato quando un utente effettua l'accesso da un dispositivo mai visto:
// possibile indizio di condivisione dell'account.
//
// Provider: Resend (https://resend.com) — REST API, funziona su Vercel.
// Variabili d'ambiente richieste (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY           la API key del progetto Resend
//   ADMIN_NOTIFICATION_EMAIL indirizzo a cui inviare l'avviso (es. la tua email)
//   EMAIL_FROM               mittente verificato su Resend
//                            (default: "UniQuiz <onboarding@resend.dev>")
//
// Se le variabili non sono configurate la funzione NON lancia errori:
// si limita a loggare un warning e a non inviare nulla, così il login
// dell'utente non viene mai bloccato da un problema di email.

interface NewDeviceEmailInput {
  userName: string;
  userEmail: string;
  userAgent: string;
  ip: string;
  when: Date;
  knownDevicesCount: number; // quanti dispositivi ha già in totale (incluso questo)
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function sendNewDeviceEmail(input: NewDeviceEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  const from = process.env.EMAIL_FROM || 'UniQuiz <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.warn(
      '[notifyEmail] Notifica saltata: RESEND_API_KEY o ADMIN_NOTIFICATION_EMAIL non configurate.'
    );
    return;
  }

  const when = input.when.toLocaleString('it-IT', { timeZone: 'Europe/Rome' });
  const subject = `⚠️ Nuovo dispositivo: ${input.userName}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;color:#202C47">
      <h2 style="color:#202C47">Accesso da un nuovo dispositivo</h2>
      <p>L'utente qui sotto ha effettuato l'accesso da un dispositivo mai usato prima.
      Se non riconosci questa attività, potrebbe indicare una condivisione dell'account.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#6b7280">Utente</td><td style="padding:6px 0;font-weight:600">${escapeHtml(input.userName)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Email</td><td style="padding:6px 0">${escapeHtml(input.userEmail)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Quando</td><td style="padding:6px 0">${escapeHtml(when)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Indirizzo IP</td><td style="padding:6px 0">${escapeHtml(input.ip)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Dispositivo</td><td style="padding:6px 0">${escapeHtml(input.userAgent)}</td></tr>
        <tr><td style="padding:6px 0;color:#6b7280">Dispositivi totali</td><td style="padding:6px 0;font-weight:600">${input.knownDevicesCount}</td></tr>
      </table>
      <p style="color:#9ca3af;font-size:12px;margin-top:20px">
        Notifica automatica di UniQuiz. Il dispositivo precedente dell'utente è stato disconnesso
        automaticamente (un solo dispositivo attivo per account).
      </p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[notifyEmail] Invio fallito:', res.status, detail);
    }
  } catch (e) {
    console.error('[notifyEmail] Errore di rete:', e);
  }
}
