'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses } from '@/lib/db';
import { PageShell, Card, Spinner } from '@/components/ui';
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

        {courses.length === 0 ? (
          <Card className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">📚</div>
            <p className="font-medium">Nessuna materia disponibile al momento.</p>
            {user.is_admin && (
              <Link href="/admin/courses" className="btn-primary inline-block mt-4 text-sm">
                Aggiungi una materia →
              </Link>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

function CourseCard({ course }: { course: Course }) {
  if (!course.is_available) {
    return (
      <div className="relative rounded-2xl border-2 border-gray-100 bg-gray-50 p-5 opacity-60 cursor-not-allowed">
        <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${course.accent_color} opacity-30`} />
        <div className="flex items-start gap-4 mt-1">
          <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0">{course.icon}</div>
          <div>
            <h3 className="font-bold text-gray-500">{course.name}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{course.subtitle}</p>
            <span className="inline-block mt-2 text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">In arrivo</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link href={`/course/${course.id}`}
      className="group relative rounded-2xl border-2 border-gray-100 bg-white p-5 hover:shadow-lg hover:scale-[1.02] hover:border-[rgb(32,44,71)] transition-all duration-200 cursor-pointer">
      <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${course.accent_color}`} />
      <div className="flex items-start gap-4 mt-1">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 group-hover:bg-gray-100 flex items-center justify-center text-2xl flex-shrink-0 transition-colors">{course.icon}</div>
        <div>
          <h3 className="font-bold text-[rgb(32,44,71)]">{course.name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{course.subtitle}</p>
        </div>
      </div>
    </Link>
  );
}
