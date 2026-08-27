// Monitoraggio errori lato server (Sentry). Come per il client, resta
// inattivo finché non è impostata NEXT_PUBLIC_SENTRY_DSN.
//
// Questo progetto non usa Edge Runtime (nessuna route/middleware Edge:
// tutte le API route sono `export const runtime = 'nodejs'`), quindi
// inizializziamo Sentry solo per il runtime Node.js.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 0.1,
    });
  }
}

// Cattura gli errori sfuggiti al rendering lato server (Server Components,
// route handler) che altrimenti non avrebbero visibilità in Sentry.
export const onRequestError = Sentry.captureRequestError;
