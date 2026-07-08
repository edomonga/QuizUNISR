'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Icon } from '@/components/Icon';

// ─── Link PayPal ──────────────────────────────────────────────────────────────
// Sovrascrivibile in Vercel con la variabile d'ambiente NEXT_PUBLIC_PAYPAL_URL.
// Il suffisso /1EUR pre-compila un importo di 1€.
const PAYPAL_URL =
  process.env.NEXT_PUBLIC_PAYPAL_URL || 'https://paypal.me/EMongardini/1EUR';

const SEEN_KEY = 'uniquiz_support_seen_v1';

export function SupportWidget() {
  const { user, loading } = useAuth();
  const [intro, setIntro] = useState(false);   // pop-up alla prima apertura
  const [open, setOpen] = useState(false);      // popover dal pulsante d'angolo

  // Mostra il pop-up una sola volta, poco dopo l'ingresso nell'app.
  useEffect(() => {
    if (loading || !user) return;
    let show = false;
    try { show = !localStorage.getItem(SEEN_KEY); } catch { show = false; }
    if (!show) return;
    const t = setTimeout(() => setIntro(true), 700);
    return () => clearTimeout(t);
  }, [loading, user]);

  const markSeen = () => { try { localStorage.setItem(SEEN_KEY, '1'); } catch {} };
  const closeIntro = () => { setIntro(false); markSeen(); };

  if (loading || !user) return null;

  return (
    <>
      {/* ── Pulsante fisso in un angolo (non invasivo) ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Sostieni UniQuiz"
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-[rgb(32,44,71)] text-white pl-3 pr-4 py-2.5 text-sm font-semibold shadow-lg shadow-black/20 opacity-90 hover:opacity-100 hover:bg-[rgb(46,61,96)] transition-all"
      >
        <Icon name="heart" className="w-4 h-4 text-[#8FE3DE]" />
        <span className="hidden sm:inline">Sostieni</span>
      </button>

      {/* ── Popover del pulsante ── */}
      {open && (
        <div className="fixed bottom-[70px] right-4 z-40 w-[min(320px,calc(100vw-2rem))] rounded-2xl bg-white shadow-2xl border border-gray-100 p-4"
          role="dialog" aria-label="Sostieni il progetto">
          <button onClick={() => setOpen(false)} aria-label="Chiudi"
            className="absolute top-2.5 right-2.5 p-1 rounded-lg text-gray-400 hover:bg-gray-100">
            <Icon name="x" className="w-4 h-4" />
          </button>
          <DonateContent compact onDonate={markSeen} />
        </div>
      )}

      {/* ── Pop-up alla prima apertura ── */}
      {intro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeIntro}>
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <DonateContent onDonate={closeIntro} />
            <button onClick={closeIntro} className="mt-3 w-full text-sm font-medium text-gray-500 hover:text-gray-700 py-2">
              Magari più tardi
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function DonateContent({ compact, onDonate }: { compact?: boolean; onDonate: () => void }) {
  return (
    <div className={compact ? 'text-left' : 'text-center'}>
      <div className={`flex ${compact ? 'items-center gap-3' : 'flex-col items-center'} mb-3`}>
        <span className={`flex items-center justify-center rounded-2xl bg-[color:var(--sig-soft)] text-[color:var(--sig)] ${compact ? 'w-10 h-10' : 'w-14 h-14 mb-3'}`}>
          <Icon name="heart" className={compact ? 'w-5 h-5' : 'w-7 h-7'} />
        </span>
        <h3 className={`font-extrabold text-[rgb(32,44,71)] ${compact ? 'text-base' : 'text-lg'}`}>Dai una mano a UniQuiz</h3>
      </div>
      <p className={`text-gray-500 ${compact ? 'text-xs' : 'text-sm'} leading-relaxed ${compact ? 'mb-3' : 'mb-5'}`}>
        UniQuiz è gratuito e fatto con passione. Se ti è utile, puoi lasciare un
        contributo di <strong>1&nbsp;€</strong> per il lavoro svolto. Nessun obbligo — l&apos;app resta gratis.
      </p>
      <a
        href={PAYPAL_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onDonate}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <Icon name="heart" className="w-4 h-4" />Contribuisci 1&nbsp;€
      </a>
    </div>
  );
}
