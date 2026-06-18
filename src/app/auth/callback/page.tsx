'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/ui';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Verifica in corso…');
  const [error, setError] = useState('');

  useEffect(() => {
    const handle = async () => {
      // Supabase manda i token come hash fragment (#access_token=...) oppure come query param
      // La libreria li gestisce automaticamente con getSession()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        setError('Errore durante la verifica. Riprova o contatta un amministratore.');
        return;
      }

      if (session) {
        // Controlla se il profilo è attivo
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active, display_name')
          .eq('id', session.user.id)
          .single();

        if (profile?.is_active) {
          setMessage('Email confermata! Reindirizzamento…');
          setTimeout(() => router.push('/dashboard'), 1500);
        } else {
          // Email confermata ma account non ancora attivato dall'admin
          setMessage('');
          await supabase.auth.signOut();
        }
      } else {
        // Nessuna sessione — prova a leggere i parametri dall'URL
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', '?'));
        const type = params.get('type') || new URLSearchParams(window.location.search).get('type');

        if (type === 'recovery') {
          // Reset password — reindirizza alla pagina di reset
          router.push('/reset-password' + window.location.hash);
          return;
        }

        setMessage('');
      }
    };

    handle();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Errore di verifica</h2>
          <p className="text-gray-500 text-sm mb-6">{error}</p>
          <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📬</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Email confermata!</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Il tuo indirizzo email è stato verificato con successo.<br /><br />
            Il tuo account deve essere <strong>attivato da un amministratore</strong> prima che tu possa accedere.
            Riceverai una notifica appena sarà abilitato.
          </p>
          <a href="/login" className="btn-primary inline-block px-8">Torna al login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <Spinner className="mb-4" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  );
}
