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

/** Mostra l'icona curata se `icon` è una chiave nota, altrimenti l'emoji legacy. */
export function CourseIcon({ icon, className = 'w-6 h-6' }: { icon?: string; className?: string }) {
  if (isCourseIconKey(icon)) return <Icon name={icon} className={className} />;
  return <span className="text-[22px] leading-none">{icon || '📘'}</span>;
}
