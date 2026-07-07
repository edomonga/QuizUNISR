'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/Icon';

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
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden nav-grad p-4">
        <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(18,147,143,.35), transparent 60%)' }} />
        <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="check" className="h-8 w-8" strokeWidth={2.4} /></div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Password aggiornata!</h2>
          <p className="text-gray-500 text-sm">Reindirizzamento alla dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden nav-grad p-4">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full blur-3xl" style={{ background: 'radial-gradient(circle, rgba(18,147,143,.35), transparent 60%)' }} />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 text-[#8FE3DE] mb-4 shadow-lg shadow-black/20">
            <Icon name="lock" className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">UniQuiz</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
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
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
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
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary w-full py-3 text-base mt-1 flex items-center justify-center gap-2"
            >
              {saving ? 'Salvataggio…' : <>Imposta password <Icon name="arrow-right" className="w-4 h-4" /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
