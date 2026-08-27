// Monitoraggio errori lato browser (Sentry). Attivo SOLO se la variabile
// d'ambiente NEXT_PUBLIC_SENTRY_DSN è impostata: senza DSN, Sentry non
// invia nulla (comportamento di default dell'SDK) — questo file è quindi
// sicuro da avere anche prima di creare un account Sentry.
//
// Per attivarlo: crea un account gratuito su sentry.io, un progetto
// "Next.js", copia il DSN e impostalo come variabile d'ambiente
// NEXT_PUBLIC_SENTRY_DSN su Vercel (Production + Preview), poi redeploy.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // Traccia solo il 10% delle richieste per le performance: sufficiente per
  // farsi un'idea senza consumare in fretta la quota gratuita.
  tracesSampleRate: 0.1,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
