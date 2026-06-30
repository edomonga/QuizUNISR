'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function ChangePasswordPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // Se non loggato → login
  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  // Se loggato e NON ha bisogno di cambiare password → dashboard
  useEffect(() => {
    if (!loading && user && !user.must_change_password) router.push('/dashboard');
  }, [user, loading, router]);

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

    setSaving(true);

    // 1. Aggiorna la password su Supabase Auth
    const { error: authErr } = await supabase.auth.updateUser({ password });
    if (authErr) {
      setError('Errore durante il salvataggio. Riprova.');
      setSaving(false);
      return;
    }

    // 2. Rimuovi il flag must_change_password dal profilo
    await supabase
      .from('profiles')
      .update({ must_change_password: false })
      .eq('id', user!.id);

    // 3. Aggiorna il contesto auth
    await refresh();

    setSaving(false);
    setDone(true);
    setTimeout(() => router.push('/dashboard'), 2000);
  };

  if (loading) return null;

  // ── Password cambiata con successo ──
  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Password aggiornata!</h2>
          <p className="text-gray-500 text-sm">Reindirizzamento alla dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-3xl">🔑</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Preparazione esami · UniSR</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Imposta una nuova password</h2>
          <p className="text-sm text-gray-500 mb-6">
            Stai usando una password temporanea. Scegli una nuova password per continuare.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nuova password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="Minimo 8 caratteri"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Conferma password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-3 text-base mt-1"
            >
              {saving ? 'Salvataggio…' : 'Imposta password →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
