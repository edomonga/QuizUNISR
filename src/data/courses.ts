// ─── Course registry ─────────────────────────────────────────────────────────
// Each "course" groups a set of macro-areas and carries its own
// exam rules (question distribution, time, scoring).
// New courses can be added here in the future without touching the UI.

export interface CourseExamRule {
  totalQuestions: number;       // e.g. 30
  timeLimitSeconds: number;     // e.g. 45 * 60
  correctScore: number;         // +1
  wrongPenalty: number;         // -0.2
  omittedScore: number;         // 0
  // Distribution per macroArea key → count
  distribution: Record<string, number>;
}

export interface Course {
  id: string;
  name: string;
  subtitle: string;
  icon: string;             // emoji
  accentColor: string;      // tailwind bg class for card accent
  textColor: string;
  borderColor: string;
  available: boolean;
  macroAreaIds: string[];   // which macroArea keys belong to this course
  examRule: CourseExamRule;
}

export const COURSES: Course[] = [
  {
    id: 'med_legale',
    name: 'Medicina Legale',
    subtitle: 'Igiene · Medicina Legale · Med. Lavoro · Economia Sanitaria',
    icon: '⚖️',
    accentColor: 'bg-blue-600',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    available: true,
    macroAreaIds: ['igiene', 'medicina_legale', 'medicina_del_lavoro', 'economia_sanitaria'],
    examRule: {
      totalQuestions: 30,
      timeLimitSeconds: 45 * 60,
      correctScore: 1,
      wrongPenalty: 0.2,
      omittedScore: 0,
      distribution: {
        igiene: 12,
        medicina_legale: 12,
        medicina_del_lavoro: 3,
        economia_sanitaria: 3,
      },
    },
  },
  // ── Future courses — set available: false until questions are added ──
  {
    id: 'farmacologia',
    name: 'Farmacologia',
    subtitle: 'In arrivo',
    icon: '💊',
    accentColor: 'bg-purple-600',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    available: false,
    macroAreaIds: [],
    examRule: { totalQuestions: 30, timeLimitSeconds: 40 * 60, correctScore: 1, wrongPenalty: 0.25, omittedScore: 0, distribution: {} },
  },
  {
    id: 'patologia',
    name: 'Patologia Generale',
    subtitle: 'In arrivo',
    icon: '🔬',
    accentColor: 'bg-emerald-600',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    available: false,
    macroAreaIds: [],
    examRule: { totalQuestions: 30, timeLimitSeconds: 40 * 60, correctScore: 1, wrongPenalty: 0.25, omittedScore: 0, distribution: {} },
  },
  {
    id: 'anatomia',
    name: 'Anatomia',
    subtitle: 'In arrivo',
    icon: '🫀',
    accentColor: 'bg-rose-600',
    textColor: 'text-rose-700',
    borderColor: 'border-rose-200',
    available: false,
    macroAreaIds: [],
    examRule: { totalQuestions: 30, timeLimitSeconds: 40 * 60, correctScore: 1, wrongPenalty: 0.25, omittedScore: 0, distribution: {} },
  },
];

export function getCourse(id: string): Course | undefined {
  return COURSES.find(c => c.id === id);
}
