'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/authHelpers';
import { consumeKicked } from '@/lib/deviceSession';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/Icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  // Se siamo finiti qui perché un altro dispositivo ha preso il nostro posto,
  // mostra un avviso chiaro (una sola volta).
  useEffect(() => {
    if (consumeKicked()) {
      setNotice('Sei stato disconnesso perché è stato effettuato l’accesso da un altro dispositivo. Ogni account può essere usato su un solo dispositivo alla volta.');
    }
  }, []);

  // Rete di sicurezza: se risulti già autenticato (anche dopo un rimbalzo dovuto
  // a un intoppo momentaneo), entra automaticamente invece di restare qui.
  useEffect(() => {
    if (!authLoading && user) {
      router.replace(user.must_change_password ? '/change-password' : '/dashboard');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { user, error: err } = await signIn(email, password);
    if (err) { setError(err); setLoading(false); return; }
    await refresh();
    router.replace(user?.must_change_password ? '/change-password' : '/dashboard');
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden p-4 nav-grad">
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.14]"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #8FE3DE 1.3px, transparent 0)', backgroundSize: '28px 28px', WebkitMaskImage: 'radial-gradient(120% 70% at 50% 0%, #000, transparent 72%)', maskImage: 'radial-gradient(120% 70% at 50% 0%, #000, transparent 72%)' }} />
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(18,147,143,.35), transparent 60%)' }} />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 ring-1 ring-inset ring-white/15 text-[#8FE3DE] mb-4 shadow-lg shadow-black/20">
            <Icon name="pulse" className="w-8 h-8" strokeWidth={2} />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">UniQuiz</h1>
          <p className="text-[#A9D9D6] mt-1.5 text-sm">La tua palestra di quiz per l&apos;università</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-6">Accedi</h2>

          {notice && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm font-medium flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{notice}</span>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
                placeholder="nome@studenti.unisr.it" required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 bg-gray-50 rounded-xl px-4 py-2.5 text-base transition-shadow focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)] focus:border-transparent focus:bg-white"
                placeholder="••••••••" required
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-1 flex items-center justify-center gap-2"
            >
              {loading ? 'Accesso in corso…' : <>Accedi <Icon name="arrow-right" className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-gray-500">
            Non hai un account?{' '}
            <Link href="/register" className="font-semibold text-[color:var(--sig)] hover:underline">
              Registrati
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
