'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearLocalSessionId } from '@/lib/deviceSession';
import { Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';

// Reimpostazione password (self-service). L'utente arriva qui dal link
// dell'email di recupero. Il link è sul dominio dell'app
// ({{ .SiteURL }}/auth/reset?token_hash=...&type=recovery) per la deliverability.

// IMPORTANTE: Shell è definito a livello di modulo, NON dentro ResetInner.
// Se fosse interno, verrebbe ricreato ad ogni render (ogni tasto premuto) e
// React rimonterebbe i campi input facendogli perdere il focus.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden nav-grad p-4">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(18,147,143,.35), transparent 60%)' }} />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  );
}

function ResetInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [phase, setPhase] = useState<'verifying' | 'ready' | 'error' | 'done'>('verifying');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const verify = async () => {
      const token_hash = params.get('token_hash');
      const type = (params.get('type') as EmailOtpType | null) ?? 'recovery';

      if (token_hash) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash });
        if (verifyError) { setPhase('error'); return; }
        setPhase('ready');
        return;
      }

      // Flusso alternativo (link di default con token nell'hash): la sessione
      // di recupero potrebbe essere già stata stabilita automaticamente.
      const { data: { session } } = await supabase.auth.getSession();
      setPhase(session ? 'ready' : 'error');
    };
    verify();
  }, [params]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return; }
    if (password !== confirm) { setError('Le password non corrispondono.'); return; }

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setError('Sessione di recupero non trovata. Riapri il link dall’email (usane uno nuovo, non uno già cliccato).');
      setSaving(false);
      return;
    }
    const { error: updErr } = await supabase.auth.updateUser({ password });
    if (updErr) {
      // Mostra il messaggio tecnico reale per capire la causa (sessione, policy, ecc.).
      console.error('reset updateUser:', updErr);
      setError(`Errore durante il salvataggio: ${updErr.message}`);
      setSaving(false);
      return;
    }
    // Se l'utente aveva una password temporanea dell'admin, togli il flag.
    if (session?.user) {
      await supabase.from('profiles').update({ must_change_password: false }).eq('id', session.user.id);
    }
    // Esci e manda al login: così l'accesso riparte pulito (e rivendica il
    // dispositivo secondo la regola "un solo dispositivo").
    clearLocalSessionId();
    await supabase.auth.signOut();
    setSaving(false);
    setPhase('done');
  };

  if (phase === 'verifying') {
    return <Shell><div className="bg-white rounded-3xl shadow-2xl p-8 text-center"><Spinner className="mb-4" /><p className="text-gray-600 text-sm">Verifica del link in corso…</p></div></Shell>;
  }

  if (phase === 'error') {
    return (
      <Shell>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Icon name="x" className="h-8 w-8" strokeWidth={2.2} /></div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Link non valido o scaduto</h2>
          <p className="text-gray-500 text-sm mb-6">Richiedi un nuovo link di reimpostazione dalla pagina di accesso.</p>
          <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
        </div>
      </Shell>
    );
  }

  if (phase === 'done') {
    return (
      <Shell>
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="check" className="h-8 w-8" strokeWidth={2.4} /></div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Password aggiornata!</h2>
          <p className="text-gray-500 text-sm mb-6">Ora puoi accedere con la nuova password.</p>
          <a href="/login" className="btn-primary inline-block px-8">Vai al login</a>
        </div>
      </Shell>
    );
  }

  // phase === 'ready'
  return (
    <Shell>
      <div className="text-center mb-7">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 text-[#8FE3DE] mb-4 shadow-lg shadow-black/20">
          <Icon name="lock" className="w-8 h-8" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">UniQuiz</h1>
      </div>
      <div className="bg-white rounded-3xl shadow-2xl p-8">
        <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Imposta una nuova password</h2>
        <p className="text-sm text-gray-500 mb-6">Scegli una nuova password per il tuo account.</p>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuova password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
              placeholder="Minimo 8 caratteri" required autoFocus />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
              placeholder="••••••••" required />
          </div>
          <button type="submit" disabled={saving} className="btn-primary w-full py-3 text-base mt-1 flex items-center justify-center gap-2">
            {saving ? 'Salvataggio…' : <>Imposta password <Icon name="arrow-right" className="w-4 h-4" /></>}
          </button>
        </form>
      </div>
    </Shell>
  );
}

export default function AuthResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}
