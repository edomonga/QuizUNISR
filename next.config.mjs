// next.config.mjs
//
// Aggiunge gli header di sicurezza HTTP (oggi assenti) e alcune
// ottimizzazioni. Sostituisci il tuo next.config.js/mjs con questo,
// oppure integra la funzione headers() nel file esistente.
//
// NOTA CSP: la direttiva connect-src deve includere il TUO dominio
// Supabase. Sostituisci TUOPROGETTO con il subdominio reale
// (es. abcdefghij.supabase.co).

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
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      `connect-src 'self' ${SUPABASE_HOST} wss://${SUPABASE_HOST.replace('https://', '')}`,
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

export default nextConfig;
