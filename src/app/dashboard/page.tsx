'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses } from '@/lib/db';
import { PageShell, Card, Spinner } from '@/components/ui';
import { FeedbackButton } from '@/components/FeedbackButton';
import { Icon } from '@/components/Icon';
import { CourseIcon } from '@/lib/courseIcons';
import type { Course } from '@/types';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    getCourses().then(data => { setCourses(data); setFetching(false); });
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
      if (!grouped[course.year]) grouped[course.year] = [];
      grouped[course.year].push(course);
    } else {
      unassigned.push(course);
    }
  });

  const sortedYears = Object.keys(grouped)
    .map(Number)
    .sort((a, b) => a - b);

  const hasAnyCourse = courses.length > 0;

  return (
    <PageShell>
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Ciao, {user.display_name}! 👋</h2>
            <p className="text-gray-400 mt-0.5 text-sm">Scegli la materia su cui vuoi esercitarti</p>
          </div>
          {user.is_admin && (
            <Link href="/admin"
              className="flex items-center gap-2 text-sm font-medium text-[rgb(32,44,71)] bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Pannello Admin
            </Link>
          )}
        </div>

        {!hasAnyCourse ? (
          <Card className="text-center py-12 text-gray-400">
            <Icon name="book" className="w-9 h-9 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nessuna materia disponibile al momento.</p>
            {user.is_admin && (
              <Link href="/admin/courses" className="btn-primary inline-block mt-4 text-sm">
                Aggiungi una materia →
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Sezioni per anno */}
            {sortedYears.map(year => (
              <section key={year}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[rgb(32,44,71)] text-white text-sm font-bold flex-shrink-0">
                    {year}
                  </div>
                  <h3 className="text-base font-semibold text-[rgb(32,44,71)]">{year}° Anno</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {grouped[year].map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              </section>
            ))}

            {/* Sezione «Altro» per materie senza anno */}
            {unassigned.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-300 text-gray-600 text-sm font-bold flex-shrink-0">
                    •
                  </div>
                  <h3 className="text-base font-semibold text-gray-500">Altro</h3>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {unassigned.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
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
    </PageShell>
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
