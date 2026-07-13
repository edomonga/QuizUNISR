import { SVGProps } from 'react';

// ─── Icon system ──────────────────────────────────────────────────────────────
// Set di icone vettoriali disegnate a mano (tratto coerente 1.75, terminazioni
// arrotondate), pensato per sostituire le emoji nell'interfaccia. Uso:
//   <Icon name="pulse" className="w-4 h-4 text-[rgb(32,44,71)]" />
// Il colore segue `currentColor`, la dimensione la className (w-*/h-*).

export type IconName =
  | 'pulse' | 'scale' | 'microbe' | 'flask'
  | 'users' | 'user' | 'book' | 'help' | 'flag' | 'message' | 'sliders'
  | 'bulb' | 'bug' | 'refresh' | 'award' | 'check' | 'x'
  | 'chevron-right' | 'chevron-left' | 'arrow-right'
  | 'trend-down' | 'zap' | 'chart' | 'clock' | 'square' | 'target'
  | 'mail' | 'lock' | 'edit' | 'logout' | 'shield'
  | 'sparkles' | 'alert' | 'trophy' | 'shuffle' | 'dice' | 'file'
  | 'layers' | 'eye' | 'folder' | 'list' | 'inbox' | 'grid'
  | 'heart' | 'brain' | 'bone' | 'pill' | 'lungs' | 'tooth' | 'syringe'
  | 'trash' | 'plus' | 'upload' | 'download' | 'search' | 'key' | 'bookmark';

const paths: Record<IconName, JSX.Element> = {
  pulse: <path d="M2 12h4l2.5-6L12 18l2.5-8L18 12h4" />,
  scale: <><path d="M12 4v16" /><path d="M8 20h8" /><path d="M5 7h14" /><path d="M5 7l-3 6" /><path d="M5 7l3 6" /><path d="M2 13a3 3 0 0 0 6 0" /><path d="M19 7l-3 6" /><path d="M19 7l3 6" /><path d="M16 13a3 3 0 0 0 6 0" /><circle cx="12" cy="4" r="1.3" /></>,
  microbe: <><circle cx="12" cy="12" r="6" /><path d="M12 6V3" /><path d="M18 12h3" /><path d="M12 18v3" /><path d="M6 12H3" /><path d="M16.2 7.8l1.8-1.8" /><path d="M7.8 16.2l-1.8 1.8" /><circle cx="10.2" cy="11" r="1" /><circle cx="14" cy="13.6" r="1.2" /></>,
  flask: <><path d="M9 3h6" /><path d="M10 3v6.5l-4.6 7.4A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 1.7-3.1L14 9.5V3" /><path d="M7.5 15h9" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 6" /><path d="M17.5 20a6 6 0 0 0-3-5.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  book: <><path d="M6 4h11a1 1 0 0 1 1 1v13H7a2 2 0 0 0-2 2V5a1 1 0 0 1 1-1z" /><path d="M18 18H7a2 2 0 0 0-2 2" /></>,
  help: <><circle cx="12" cy="12" r="9" /><path d="M9.4 9.3a2.6 2.6 0 1 1 3.7 2.4c-.8.4-1.1 1-1.1 1.8" /><circle cx="12" cy="16.4" r=".7" fill="currentColor" stroke="none" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4.5h11l-2 3.2 2 3.3H5" /></>,
  message: <path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 3.2V6a1 1 0 0 1 1-1z" />,
  sliders: <><path d="M4 7h9" /><path d="M17 7h3" /><circle cx="15" cy="7" r="2" /><path d="M4 17h3" /><path d="M11 17h9" /><circle cx="9" cy="17" r="2" /></>,
  bulb: <><path d="M9.5 18h5" /><path d="M10 21h4" /><path d="M12 3a6 6 0 0 0-3.8 10.6c.5.5.8 1.1.8 1.9v.5h6v-.5c0-.8.3-1.4.8-1.9A6 6 0 0 0 12 3z" /></>,
  bug: <><path d="M8.5 7a3.5 3.5 0 0 1 7 0" /><rect x="7" y="7" width="10" height="10" rx="5" /><path d="M12 8v9" /><path d="M7 11H4M7 15.5H4.2M7.2 8L5 6.5" /><path d="M17 11h3M17 15.5h2.8M16.8 8L19 6.5" /></>,
  refresh: <><path d="M20 11a8 8 0 1 0-1.5 5.5" /><path d="M20 5v5h-5" /></>,
  award: <><circle cx="12" cy="9" r="5" /><path d="M8.5 13L7 21l5-3 5 3-1.5-8" /></>,
  check: <path d="M5 12.5l4.2 4.2L19 6" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  'chevron-right': <path d="M9 5l7 7-7 7" />,
  'chevron-left': <path d="M15 5l-7 7 7 7" />,
  'arrow-right': <><path d="M4 12h15" /><path d="M13 6l6 6-6 6" /></>,
  'trend-down': <><path d="M3 8l6 6 4-4 8 8" /><path d="M21 18v-5" /><path d="M16 18h5" /></>,
  zap: <path d="M13 3L5 13h6l-1 8 8-11h-6z" />,
  chart: <><path d="M4 20h16" /><path d="M6 20v-6" /><path d="M11 20V6" /><path d="M16 20v-9" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5l3.2 2" /></>,
  square: <rect x="5" y="5" width="14" height="14" rx="3" />,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M4 7.5l8 5.5 8-5.5" /></>,
  lock: <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
  edit: <><path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17z" /><path d="M13.5 6.5l3 3" /></>,
  logout: <><path d="M15 12H4" /><path d="M8 8l-4 4 4 4" /><path d="M11 4h7a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-7" /></>,
  shield: <><path d="M12 3l7 3v5.5c0 4.3-3 7.4-7 8.5-4-1.1-7-4.2-7-8.5V6z" /><path d="M9 12l2 2 4-4" /></>,
  sparkles: <><path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" /><path d="M18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z" /></>,
  alert: <><path d="M12 4l9 15.5H3z" /><path d="M12 10v4.5" /><circle cx="12" cy="17.5" r=".7" fill="currentColor" stroke="none" /></>,
  trophy: <><path d="M7 4h10v4a5 5 0 0 1-10 0z" /><path d="M7 6H4v1a3 3 0 0 0 3 3" /><path d="M17 6h3v1a3 3 0 0 1-3 3" /><path d="M9 15h6" /><path d="M10 15l-.5 4h5l-.5-4" /><path d="M8 21h8" /></>,
  shuffle: <><path d="M16 3h5v5" /><path d="M4 20L21 3" /><path d="M21 16v5h-5" /><path d="M15 15l6 6" /><path d="M4 4l5 5" /></>,
  dice: <><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="15" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="15" r="1" fill="currentColor" stroke="none" /></>,
  file: <><path d="M6 3h8l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M14 3v4h4" /><path d="M9 13h6M9 16.5h4" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3.5 12L12 16.5 20.5 12" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="2.7" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h3.5l2 2H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  list: <><path d="M9 6h11" /><path d="M9 12h11" /><path d="M9 18h11" /><circle cx="4.5" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1.1" fill="currentColor" stroke="none" /></>,
  inbox: <><path d="M4 13l2.2-7.1A2 2 0 0 1 8.1 4.5h7.8a2 2 0 0 1 1.9 1.4L20 13v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /><path d="M4 13h4l1.5 2.5h5L16 13h4" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  heart: <path d="M12 20s-7-4.6-9.2-8.4C1.3 8.8 2.7 5.5 6 5.5c2 0 3.2 1.3 4 2.4.8-1.1 2-2.4 4-2.4 3.3 0 4.7 3.3 3.2 6.1C19 15.4 12 20 12 20z" />,
  brain: <><path d="M12 5a3 3 0 0 0-5.5 1.7A2.8 2.8 0 0 0 5 12a2.8 2.8 0 0 0 1.6 4.3A2.8 2.8 0 0 0 12 18z" /><path d="M12 5a3 3 0 0 1 5.5 1.7A2.8 2.8 0 0 1 19 12a2.8 2.8 0 0 1-1.6 4.3A2.8 2.8 0 0 1 12 18z" /><path d="M12 5v13" /></>,
  bone: <path d="M7 7a2 2 0 1 1 2.6 2.6l4.8 4.8A2 2 0 1 1 17 17a2 2 0 1 1-2.6-2.6L9.6 9.6A2 2 0 1 1 7 7z" />,
  pill: <><path d="M10.5 3.6l9.9 9.9a4.95 4.95 0 0 1-7 7l-9.9-9.9a4.95 4.95 0 0 1 7-7z" /><path d="M7 7l10 10" /></>,
  lungs: <><path d="M12 4v8" /><path d="M9 8.5c-3 1.2-4 4-4 7.5 0 1.9 2 2.9 3 2s2-1.9 2-3.8V9.4c0-.8-.6-1.2-1-.9z" /><path d="M15 8.5c3 1.2 4 4 4 7.5 0 1.9-2 2.9-3 2s-2-1.9-2-3.8V9.4c0-.8.6-1.2 1-.9z" /></>,
  tooth: <path d="M8 4c-2 0-4 1.5-4 4 0 2 1 3 1.5 6C6 17 6.4 20 8 20c1.2 0 1.4-2 2-4 .3-1 .5-1.4 2-1.4s1.7.4 2 1.4c.6 2 .8 4 2 4 1.6 0 2-3 2.5-6 .5-3 1.5-4 1.5-6 0-2.5-2-4-4-4-1.6 0-2.4 1-4 1s-2.4-1-4-1z" />,
  syringe: <><path d="M18 3l3 3" /><path d="M15 6l3 3" /><path d="M16.5 7.5L7 17l-2.5 4.5-.5-.5L8.5 18 18 8.5" /><path d="M9 11l3 3" /></>,
  trash: <><path d="M4 7h16" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12" /><path d="M10 11v6M14 11v6" /></>,
  plus: <><path d="M12 5v14" /><path d="M5 12h14" /></>,
  upload: <><path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  download: <><path d="M12 4v11" /><path d="M8 11l4 4 4-4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="M11 11l8 8" /><path d="M16 16l2-2" /></>,
  bookmark: <path d="M6 4.5h12v15l-6-4-6 4z" />,
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
}

export function Icon({ name, className = 'w-5 h-5', ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
