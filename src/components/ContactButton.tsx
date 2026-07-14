'use client';

import { Icon } from '@/components/Icon';

// Indirizzo di contatto dell'app. Cliccando si apre il client di posta
// dell'utente già pre-compilato verso info@uniquiz.pro.
export const CONTACT_EMAIL = 'info@uniquiz.pro';

export function ContactButton() {
  const href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Contatto UniQuiz')}`;
  return (
    <a
      href={href}
      className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 px-4 py-3 text-sm font-medium text-gray-500 transition-all hover:border-[color:var(--sig)] hover:text-[color:var(--sig)] hover:bg-[color:var(--sig-soft)] hover:shadow-sm"
    >
      <Icon name="message" className="w-4 h-4 transition-transform group-hover:scale-110" />
      Hai bisogno di aiuto o un suggerimento? Scrivici a {CONTACT_EMAIL}
    </a>
  );
}
