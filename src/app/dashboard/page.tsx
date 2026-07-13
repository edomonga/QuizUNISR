'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses } from '@/lib/db';
import { PageShell, Card, Spinner } from '@/components/ui';
import { FeedbackButton } from '@/components/FeedbackButton';
import { Icon } from '@/components/Icon';
import { YearPicker } from '@/components/YearPicker';
import { CourseIcon } from '@/lib/courseIcons';
import type { Course } from '@/types';

const LAST_COURSE_KEY = 'uniquiz_last_course';

export default function DashboardPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);
  const [pickYear, setPickYear] = useState(false);
  const [openYears, setOpenYears] = useState<Set<string>>(new Set());
  const [lastCourseId, setLastCourseId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    getCourses().then(data => { setCourses(data); setFetching(false); });
    try {
      const raw = localStorage.getItem(LAST_COURSE_KEY);
      if (raw) setLastCourseId(JSON.parse(raw).id ?? null);
    } catch { /* ignore */ }
  }, []);

  if (loading || fetching) return (
    <PageShell><Spinner className="mt-20" /></PageShell>
  );
  if (!user) return null;

  // ── Raggruppa per anno ──────────────────────────────────────────────────────
  const grouped: Record<number, Course[]> = {};
  const unassigned: Course[] = [];
  courses.forEach(course => {
    if (course.year != null) {
      (grouped[course.year] ??= []).push(course);
    } else {
      unassigned.push(course);
    }
  });
  const sortedYears = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const hasAnyCourse = courses.length > 0;

  const myYear = user.year ?? null;
  const myYearCourses = myYear != null ? (grouped[myYear] ?? []) : [];
  const otherYears = sortedYears.filter(y => y !== myYear);

  const resumeCourse = lastCourseId
    ? courses.find(c => c.id === lastCourseId && c.is_available) ?? null
    : null;

  const toggleYear = (key: string) =>
    setOpenYears(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Ciao, {user.display_name}! 👋</h2>
            <p className="text-gray-400 mt-0.5 text-sm">
              {myYear != null ? 'Ecco su cosa concentrarti adesso' : 'Scegli la materia su cui vuoi esercitarti'}
            </p>
            {hasAnyCourse && (
              <button onClick={() => setPickYear(true)}
                className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full bg-[color:var(--sig-soft)] text-[color:var(--sig)] hover:brightness-95 transition">
                <Icon name="user" className="w-3.5 h-3.5" />
                {myYear != null ? `${myYear}º Anno · modifica` : 'Imposta il tuo anno'}
              </button>
            )}
          </div>
          {user.is_admin && (
            <Link href="/admin"
              className="flex-shrink-0 flex items-center gap-2 text-sm font-medium text-[rgb(32,44,71)] bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm">
              <Icon name="sliders" className="w-4 h-4" />
              <span className="hidden sm:inline">Pannello Admin</span>
            </Link>
          )}
        </div>

        {/* Riprendi da dove eri */}
        {resumeCourse && (
          <Link href={`/course/${resumeCourse.id}`}
            className="group mb-6 flex items-center gap-3 rounded-2xl p-4 bg-[color:var(--sig-soft)] border border-[color:var(--sig)]/25 hover:shadow-sm transition">
            <span className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-[color:var(--sig)] flex-shrink-0">
              <Icon name="refresh" className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wide text-[color:var(--sig)]">Riprendi da dove eri</div>
              <div className="font-bold text-[rgb(32,44,71)] truncate">{resumeCourse.name}</div>
            </div>
            <Icon name="chevron-right" className="w-5 h-5 ml-auto flex-shrink-0 text-[color:var(--sig)]" />
          </Link>
        )}

        {!hasAnyCourse ? (
          <Card className="text-center py-12 text-gray-400">
            <Icon name="book" className="w-9 h-9 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nessuna materia disponibile al momento.</p>
          </Card>
        ) : myYear != null ? (
          /* ── Vista personalizzata: il mio anno in evidenza ── */
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-6 h-6 rounded-lg bg-[color:var(--sig)] text-white flex items-center justify-center flex-shrink-0">
                  <Icon name="bookmark" className="w-3.5 h-3.5" />
                </span>
                <h3 className="text-sm font-extrabold text-[rgb(32,44,71)]">I tuoi esami · {myYear}º Anno</h3>
              </div>
              {myYearCourses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {myYearCourses.map(c => <CourseCard key={c.id} course={c} />)}
                </div>
              ) : (
                <Card className="text-center py-8 text-gray-400 text-sm">
                  Nessuna materia per il {myYear}º anno al momento. Le trovi tutte qui sotto.
                </Card>
              )}
            </section>

            {(otherYears.length > 0 || unassigned.length > 0) && (
              <section>
                <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-400 mb-3 px-1">Altri anni</p>
                <div className="space-y-2.5">
                  {otherYears.map(year => (
                    <YearAccordion key={year} yearKey={String(year)} badge={String(year)} title={`${year}º Anno`}
                      courses={grouped[year]} open={openYears.has(String(year))} onToggle={toggleYear} />
                  ))}
                  {unassigned.length > 0 && (
                    <YearAccordion yearKey="altro" badge="•" title="Altro"
                      courses={unassigned} open={openYears.has('altro')} onToggle={toggleYear} />
                  )}
                </div>
              </section>
            )}
          </div>
        ) : (
          /* ── Fallback: anno non impostato → invito + vista classica per anno ── */
          <div className="space-y-8">
            <button onClick={() => setPickYear(true)}
              className="w-full flex items-center gap-3 rounded-2xl p-4 bg-[rgb(32,44,71)] text-white text-left hover:bg-[rgb(46,61,96)] transition">
              <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#8FE3DE] flex-shrink-0">
                <Icon name="user" className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <div className="font-bold">Imposta il tuo anno di corso</div>
                <div className="text-xs text-blue-100/80">Vedrai in cima le materie del tuo anno.</div>
              </div>
              <Icon name="chevron-right" className="w-5 h-5 ml-auto flex-shrink-0 text-[#8FE3DE]" />
            </button>

            {sortedYears.map(year => (
              <section key={year}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(32,44,71)] text-white text-sm font-bold flex-shrink-0">{year}</div>
                  <h3 className="text-base font-semibold text-[rgb(32,44,71)]">{year}º Anno</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[year].map(c => <CourseCard key={c.id} course={c} />)}
                </div>
              </section>
            ))}
            {unassigned.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 text-sm font-bold flex-shrink-0">•</div>
                  <h3 className="text-base font-semibold text-gray-500">Altro</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unassigned.map(c => <CourseCard key={c.id} course={c} />)}
                </div>
              </section>
            )}
          </div>
        )}

        {/* Feedback utenti */}
        <div className="mt-10">
          <FeedbackButton />
        </div>
      </div>

      {pickYear && (
        <YearPicker current={myYear} userId={user.id} onClose={() => setPickYear(false)} onSaved={refresh} />
      )}
    </PageShell>
  );
}

function YearAccordion({ yearKey, badge, title, courses, open, onToggle }: {
  yearKey: string; badge: string; title: string; courses: Course[]; open: boolean; onToggle: (k: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm">
      <button onClick={() => onToggle(yearKey)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
        <span className="w-7 h-7 rounded-lg bg-[rgb(240,242,247)] text-gray-500 font-bold text-xs flex items-center justify-center flex-shrink-0">{badge}</span>
        <span className="font-semibold text-sm text-[rgb(32,44,71)]">{title}</span>
        <span className="text-xs text-gray-400">· {courses.length} {courses.length === 1 ? 'materia' : 'materie'}</span>
        <Icon name="chevron-right" className={`w-4 h-4 ml-auto flex-shrink-0 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {courses.map(c => <CourseCard key={c.id} course={c} />)}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  if (!course.is_available) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4 opacity-70 cursor-not-allowed">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-400 grayscale opacity-70"><CourseIcon icon={course.icon} className="w-6 h-6" /></div>
          <div className="min-w-0">
            <h3 className="font-bold text-gray-500">{course.name}</h3>
            <p className="text-sm text-gray-400 mt-0.5 truncate">{course.subtitle}</p>
          </div>
          <span className="ml-auto flex-shrink-0 text-xs font-medium bg-gray-200 text-gray-500 px-2.5 py-1 rounded-full">In arrivo</span>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/course/${course.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:-translate-y-0.5 hover:shadow-lg hover:border-[color:var(--sig)] transition-all duration-200 cursor-pointer">
      <div className="w-12 h-12 rounded-2xl bg-[color:var(--navy-pale)] group-hover:bg-[color:var(--sig-soft)] flex items-center justify-center flex-shrink-0 text-[rgb(32,44,71)] transition-colors"><CourseIcon icon={course.icon} className="w-6 h-6" /></div>
      <div className="min-w-0">
        <h3 className="font-bold text-[rgb(32,44,71)]">{course.name}</h3>
        <p className="text-sm text-gray-400 mt-0.5 truncate">{course.subtitle}</p>
      </div>
      <Icon name="chevron-right" className="w-5 h-5 ml-auto flex-shrink-0 text-gray-300 group-hover:text-[color:var(--sig)] transition-colors" />
    </Link>
  );
}
