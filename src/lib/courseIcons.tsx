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

// Le icone del catalogo (SVG) sono disegnate a tratto sottile e il loro glifo
// occupa solo ~75-80% della viewBox, lasciando dell'aria attorno. Le immagini
// caricate dall'admin invece riempiono quasi tutto il riquadro: con
// `maskSize: contain` finirebbero per apparire più grandi e «pesanti» delle
// icone di default. Applichiamo quindi un piccolo margine ottico in fase di
// resa, così ogni icona caricata rientra nello stesso ingombro visivo del
// catalogo — senza dover ricaricare nulla. Valore regolabile qui in un punto
// solo (0.82 = il glifo occupa l'82% del riquadro, centrato).
const IMAGE_ICON_SCALE = 0.82;

/**
 * Mostra:
 *  - un'immagine caricata (data URI/URL), oppure
 *  - l'icona curata se `icon` è una chiave nota, oppure
 *  - l'emoji legacy salvata nel DB.
 */
export function CourseIcon({ icon, className = 'w-6 h-6' }: { icon?: string; className?: string }) {
  // Immagine caricata → resa come maschera con `currentColor`, così eredita il
  // colore dal contesto esattamente come le icone del catalogo (teal sul banner
  // scuro, navy sulle tile, grigio per «in arrivo»). Il margine ottico è
  // applicato via `maskSize` percentuale + centratura, così l'immagine è
  // rimpicciolita in modo uniforme mantenendo l'aspect-ratio.
  if (isImageIcon(icon)) {
    const pct = `${Math.round(IMAGE_ICON_SCALE * 100)}%`;
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
          // `contain` entro un riquadro ridotto all'82%: il glifo mantiene le
          // proporzioni ma lascia dell'aria come le icone del catalogo.
          WebkitMaskSize: `${pct} ${pct}`,
          maskSize: `${pct} ${pct}`,
        }}
      />
    );
  }
  if (isCourseIconKey(icon)) return <Icon name={icon} className={className} />;
  return <span className="text-[22px] leading-none">{icon || '📘'}</span>;
}
