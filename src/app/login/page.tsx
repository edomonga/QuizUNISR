'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/authHelpers';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/Icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { refresh } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { user, error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); return; }
    await refresh();
    router.push(user?.must_change_password ? '/change-password' : '/dashboard');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 text-[#8FE3DE] mb-4">
            <Icon name="pulse" className="w-8 h-8" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Preparazione esami · UniSR</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-6">Accedi</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="nome@studenti.unisr.it" required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
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
