'use client';

// Rete di sicurezza finale: cattura un errore così grave da sfuggire anche
// al layout principale (rarissimo). Sostituisce l'INTERO <html>, per questo
// importa di nuovo lo stile globale invece di ereditarlo dal layout.
import './globals.css';
import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="it">
      <body>
        <div className="relative min-h-screen flex items-center justify-center overflow-hidden nav-grad p-4">
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 text-3xl">⚠️</div>
            <h2 className="text-xl font-bold text-[rgb(32,44,71)] mb-3">Qualcosa è andato storto</h2>
            <p className="text-gray-500 text-sm mb-6">
              Si è verificato un errore imprevisto. Siamo stati avvisati automaticamente e ce ne occupiamo.
            </p>
            <button onClick={() => window.location.assign('/dashboard')} className="btn-primary inline-block px-8 py-3">
              Torna alla dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
