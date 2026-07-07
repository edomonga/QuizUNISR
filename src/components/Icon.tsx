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
  | 'mail' | 'lock' | 'edit' | 'logout' | 'shield';

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
