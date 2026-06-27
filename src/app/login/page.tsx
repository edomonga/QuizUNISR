'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/authHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { user, error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); return; }

    await refresh();

    // ── NUOVO: se l'utente ha una password temporanea → cambio password obbligatorio
    if (user?.must_change_password) {
      router.push('/change-password');
    } else {
      router.push('/dashboard');
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'https://quiz-unisr.vercel.app/reset-password',
    });
    setResetLoading(false);
    setResetSent(true);
  };

  // ── Pannello forgot password ──
  if (showReset) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
              <span className="text-3xl">🩺</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
            <p className="text-blue-200 mt-1 text-sm">Preparazione esami · UniSR</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {resetSent ? (
              <div className="text-center">
                <div className="text-5xl mb-4">📬</div>
                <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-3">Email inviata!</h2>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">
                  Se l&apos;indirizzo <strong>{resetEmail}</strong> è registrato, riceverai un&apos;email con il link per reimpostare la password.<br /><br />
                  Controlla anche la cartella spam.
                </p>
                <button onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); }}
                  className="btn-primary px-8">
                  Torna al login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-2">Recupera password</h2>
                <p className="text-sm text-gray-500 mb-6">Inserisci la tua email universitaria e ti invieremo un link per reimpostare la password.</p>
                <form onSubmit={handleReset} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email universitaria</label>
                    <input
                      type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                      placeholder="nome.cognome@studenti.unisr.it" required
                    />
                  </div>
                  <button type="submit" disabled={resetLoading} className="btn-primary w-full py-3 text-base">
                    {resetLoading ? 'Invio in corso…' : 'Invia link →'}
                  </button>
                </form>
                <button onClick={() => setShowReset(false)}
                  className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600">
                  ← Torna al login
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Login principale ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Preparazione esami · UniSR</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-6">Accedi</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email universitaria</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="nome.cognome@studenti.unisr.it" required
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setShowReset(true)}
                  className="text-xs text-[rgb(32,44,71)] hover:underline">
                  Password dimenticata?
                </button>
              </div>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="••••••••" required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-1"
            >
              {loading ? 'Accesso in corso…' : 'Accedi →'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Non hai un account?{' '}
            <Link href="/register" className="text-[rgb(32,44,71)] font-semibold hover:underline">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
