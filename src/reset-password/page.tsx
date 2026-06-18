'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase passa i token nell'hash — la libreria li processa automaticamente
    // Aspettiamo che la sessione sia disponibile
    const check = async () => {
      // Piccolo delay per dare tempo alla libreria di processare l'hash
      await new Promise(r => setTimeout(r, 500));
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setReady(true);
      } else {
        setError('Link non valido o scaduto. Richiedi un nuovo reset della password.');
      }
    };
    check();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }
    if (password !== confirm) {
      setError('Le password non corrispondono.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError('Errore durante l\'aggiornamento. Riprova o richiedi un nuovo link.');
      return;
    }

    setDone(true);
    setTimeout(() => router.push('/dashboard'), 2500);
  };

  // ── Link scaduto / non valido ──
  if (error && !ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Link non valido</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
        </div>
      </div>
    );
  }

  // ── Password aggiornata ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Password aggiornata!</h2>
          <p className="text-gray-500 text-sm">Reindirizzamento alla dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Loading iniziale ──
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-8 h-8 border-4 border-[rgb(32,44,71)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Verifica del link in corso…</p>
        </div>
      </div>
    );
  }

  // ── Form nuova password ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Reimposta la tua password</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-2">Nuova password</h2>
          <p className="text-xs text-gray-400 mb-5">Scegli una password sicura di almeno 8 caratteri.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuova password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="Minimo 8 caratteri"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-1"
            >
              {loading ? 'Aggiornamento in corso…' : 'Salva nuova password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
