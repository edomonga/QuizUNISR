'use client';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';

// Conferma email con link SUL NOSTRO DOMINIO (www.uniquiz.pro) invece che su
// *.supabase.co. Il template email di Supabase punta qui con token_hash + type;
// qui completiamo la verifica via verifyOtp. Vantaggio: mittente e link stanno
// sullo stesso dominio → molto meno spam/quarantena (soprattutto sui tenant
// Microsoft come quello dell'università).

function ConfirmInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState('Verifica in corso…');
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = async () => {
      const token_hash = params.get('token_hash');
      const type = (params.get('type') as EmailOtpType | null) ?? 'email';

      if (!token_hash) {
        setError('Link non valido: manca il codice di verifica. Riprova dal link ricevuto via email.');
        return;
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash });
      if (verifyError) {
        setError('Link non valido o scaduto. Richiedi una nuova email di conferma o contatta un amministratore.');
        return;
      }

      // Verificata: controlla se l'account è già stato attivato dall'admin.
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_active) {
          setMessage('Email confermata! Reindirizzamento…');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          // Email confermata ma account non ancora attivato dall'admin.
          setMessage('');
          await supabase.auth.signOut();
        }
      } else {
        setMessage('');
      }
    };

    handle();
  }, [params, router]);

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden nav-grad p-4">
      <div aria-hidden className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[440px] h-[440px] rounded-full blur-3xl"
        style={{ background: 'radial-gradient(circle, rgba(18,147,143,.35), transparent 60%)' }} />
      <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
        {children}
      </div>
    </div>
  );

  if (error) {
    return (
      <Shell>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Icon name="x" className="h-8 w-8" strokeWidth={2.2} /></div>
        <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Errore di verifica</h2>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
      </Shell>
    );
  }

  if (!message) {
    return (
      <Shell>
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--sig-soft)] text-[color:var(--sig)]"><Icon name="mail" className="h-8 w-8" /></div>
        <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Email confermata!</h2>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">
          Il tuo indirizzo email è stato verificato con successo.<br /><br />
          Il tuo account deve essere <strong>attivato da un amministratore</strong> prima che tu possa accedere.
          Riceverai una notifica appena sarà abilitato.
        </p>
        <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
      </Shell>
    );
  }

  return (
    <Shell>
      <Spinner className="mb-4" />
      <p className="text-gray-600 text-sm">{message}</p>
    </Shell>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmInner />
    </Suspense>
  );
}
