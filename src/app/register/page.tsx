'use client';
import { useState } from 'react';
import Link from 'next/link';
import { signUp, isAllowedEmail } from '@/lib/authHelpers';
import { Icon } from '@/components/Icon';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isAllowedEmail(email)) {
      setError('Puoi registrarti solo con un indirizzo @studenti.unisr.it');
      return;
    }
    if (password.length < 8) {
      setError('La password deve essere di almeno 8 caratteri.');
      return;
    }
    if (password !== confirm) {
      setError('Le password non corrispondono.');
      return;
    }

    setLoading(true);
    const { error: err } = await signUp(email, password, displayName);
    setLoading(false);

    if (err) { setError(err); return; }
    setSuccess(true);
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--sig-soft)] text-[color:var(--sig)]"><Icon name="mail" className="h-8 w-8" /></div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Registrazione completata!</h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            Ti abbiamo inviato una email di conferma a <strong>{email}</strong>.<br /><br />
            Dopo aver confermato l&apos;indirizzo, il tuo account dovrà essere <strong>attivato da un amministratore</strong>.
            Riceverai una notifica appena sarai abilitato ad accedere.
          </p>
          <Link href="/login" className="btn-primary inline-block mt-6 px-8">
            Torna al login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 text-[#8FE3DE] mb-4">
            <Icon name="pulse" className="w-8 h-8" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-2">Crea account</h2>
          <p className="text-xs text-gray-400 mb-5">
            Riservato agli indirizzi <strong>@studenti.unisr.it</strong>
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome e Cognome</label>
              <input
                type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="Mario Rossi" required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email universitaria</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="nome@studenti.unisr.it" required
              />
              {email && !isAllowedEmail(email) && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><Icon name="alert" className="w-3 h-3" />Usa il tuo indirizzo @studenti.unisr.it</p>
              )}
              {email && isAllowedEmail(email) && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1"><Icon name="check" className="w-3 h-3" />Indirizzo valido</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="Minimo 8 caratteri" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
              <input
                type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="••••••••" required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base mt-1">
              {loading ? 'Registrazione in corso…' : 'Registrati →'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Hai già un account?{' '}
            <Link href="/login" className="text-[rgb(32,44,71)] font-semibold hover:underline">Accedi</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
