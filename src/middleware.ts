// src/middleware.ts
//
// Redirect TEMPORANEO dal vecchio indirizzo *.vercel.app al nuovo dominio.
//
// Si attiva SOLO quando la variabile d'ambiente `LEGACY_REDIRECT_TO` è
// impostata su Vercel (es. "uniquiz.pro"). Così puoi accenderlo e spegnerlo
// dal pannello Vercel senza toccare il codice:
//   - da spento (variabile assente) il vecchio URL funziona normalmente;
//   - da acceso, chi apre il vecchio URL viene mandato al nuovo dominio.
//
// Consiglio: imposta la variabile solo per l'ambiente "Production" e, dopo
// qualche giorno, rimuovila (o svuotala) e fai un redeploy per disattivarlo.

import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const target = process.env.LEGACY_REDIRECT_TO?.trim();
  const host = req.headers.get('host') ?? '';

  // Ridireziona solo il vecchio dominio vercel.app, e solo in produzione
  // (le anteprime "preview" restano raggiungibili per i test).
  if (
    target &&
    process.env.VERCEL_ENV === 'production' &&
    host.endsWith('.vercel.app')
  ) {
    const url = req.nextUrl.clone();
    url.protocol = 'https:';
    url.hostname = target;
    url.port = '';
    // 307 = redirect temporaneo: i browser non lo memorizzano in modo
    // permanente, così quando lo disattivi torna tutto come prima.
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  // Applica a tutte le pagine tranne gli asset statici di Next.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
