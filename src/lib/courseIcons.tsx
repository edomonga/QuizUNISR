import { Icon, type IconName } from '@/components/Icon';

// ─── Icone curate per le materie ──────────────────────────────────────────────
// L'admin sceglie un'icona dal set curato; la chiave viene salvata in
// `course.icon`. Le materie già esistenti hanno un'emoji salvata nel DB:
// CourseIcon resta retro-compatibile e la mostra così com'è (nessuna
// migrazione distruttiva necessaria).

export const COURSE_ICONS: { key: IconName; label: string }[] = [
  { key: 'pulse',   label: 'Medicina' },
  { key: 'scale',   label: 'Medicina legale' },
  { key: 'microbe', label: 'Microbiologia' },
  { key: 'flask',   label: 'Chimica / Lab' },
  { key: 'heart',   label: 'Cardiologia' },
  { key: 'brain',   label: 'Neurologia' },
  { key: 'bone',    label: 'Ortopedia' },
  { key: 'lungs',   label: 'Pneumologia' },
  { key: 'pill',    label: 'Farmacologia' },
  { key: 'tooth',   label: 'Odontoiatria' },
  { key: 'syringe', label: 'Anestesia' },
  { key: 'eye',     label: 'Oculistica' },
  { key: 'book',    label: 'Teoria' },
  { key: 'users',   label: 'Comunità' },
];

const KEYS = new Set(COURSE_ICONS.map(c => c.key));

export function isCourseIconKey(value?: string): value is IconName {
  return !!value && KEYS.has(value as IconName);
}

/** Icona personalizzata caricata dall'admin (data URI o URL immagine). */
export function isImageIcon(value?: string): boolean {
  return !!value && (value.startsWith('data:image/') || value.startsWith('http://') || value.startsWith('https://'));
}

/**
 * Mostra:
 *  - un'immagine caricata (data URI/URL), oppure
 *  - l'icona curata se `icon` è una chiave nota, oppure
 *  - l'emoji legacy salvata nel DB.
 */
export function CourseIcon({ icon, className = 'w-6 h-6' }: { icon?: string; className?: string }) {
  // Immagine caricata → resa come maschera con `currentColor`, così eredita il
  // colore dal contesto esattamente come le icone del catalogo (teal sul banner
  // scuro, navy sulle tile, grigio per «in arrivo»).
  if (isImageIcon(icon)) {
    return (
      <span
        role="img"
        aria-hidden="true"
        className={`${className} inline-block flex-shrink-0`}
        style={{
          backgroundColor: 'currentColor',
          WebkitMaskImage: `url("${icon}")`,
          maskImage: `url("${icon}")`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    );
  }
  if (isCourseIconKey(icon)) return <Icon name={icon} className={className} />;
  return <span className="text-[22px] leading-none">{icon || '📘'}</span>;
}
