// next.config.mjs
//
// Aggiunge gli header di sicurezza HTTP (oggi assenti) e alcune
// ottimizzazioni. Sostituisci il tuo next.config.js/mjs con questo,
// oppure integra la funzione headers() nel file esistente.
//
// NOTA CSP: la direttiva connect-src deve includere il TUO dominio
// Supabase. Sostituisci TUOPROGETTO con il subdominio reale
// (es. abcdefghij.supabase.co).

import { withSentryConfig } from '@sentry/nextjs';

const SUPABASE_HOST = 'https://mxecukuguyulubminxks.supabase.co';

const securityHeaders = [
  // Forza HTTPS per 2 anni (Vercel serve già HTTPS, questo lo blinda).
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // Impedisce di incorniciare il sito in iframe (clickjacking).
  { key: 'X-Frame-Options', value: 'DENY' },
  // Impedisce al browser di "indovinare" i MIME type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Non inviare l'URL completo come referrer a siti esterni.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Disattiva API del browser che non usi.
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  // Content Security Policy pragmatica per Next.js + Supabase.
  // 'unsafe-inline'/'unsafe-eval' servono a Next in questa configurazione;
  // una CSP con nonce è possibile ma richiede refactoring.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      // ${SUPABASE_HOST}: immagini delle domande servite da Supabase Storage
      // (bucket "question-images"). Senza questa riga il browser le blocca
      // per violazione della CSP — il sito prova comunque a caricarle
      // (nessun errore visibile "rotto"), semplicemente non appaiono mai.
      `img-src 'self' data: blob: ${SUPABASE_HOST}`,
      "font-src 'self' data:",
      // *.sentry.io: invio errori dal browser al monitoraggio Sentry (se
      // configurato). Senza questa riga, la CSP bloccherebbe silenziosamente
      // ogni report anche con Sentry attivo e il DSN impostato.
      `connect-src 'self' ${SUPABASE_HOST} wss://${SUPABASE_HOST.replace('https://', '')} https://*.sentry.io`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Nasconde l'header "X-Powered-By: Next.js" (meno info agli attaccanti).
  poweredByHeader: false,
  // Comprime le risposte (di default true, esplicitato per chiarezza).
  compress: true,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

// Avvolge la config con Sentry: abilita il caricamento automatico dei
// source map quando (e solo quando) sono impostate le variabili d'ambiente
// SENTRY_ORG/SENTRY_PROJECT/SENTRY_AUTH_TOKEN. Senza di esse la build
// funziona lo stesso, semplicemente niente upload dei source map (righe di
// stack meno leggibili in Sentry finché non le aggiungi).
export default withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  webpack: { treeshake: { removeDebugLogging: true } },
});
