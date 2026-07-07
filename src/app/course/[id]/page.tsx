'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getUserStats, getExamResults } from '@/lib/db';
import { PageShell, Card, Spinner, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Course, UserStats, ExamResult } from '@/types';

function fmt(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

export default function CoursePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<UserStats[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!user || !courseId) return;
    Promise.all([
      getCourse(courseId),
      getUserStats(user.id, courseId),
      getExamResults(user.id),
    ]).then(([c, s, e]) => {
      setCourse(c);
      setStats(s);
      setExams(e.filter(r => r.course_id === courseId));
      setFetching(false);
    });
  }, [user, courseId]);

  if (loading || fetching) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!course) return <PageShell><div className="text-center mt-20 text-gray-400">Materia non trovata.</div></PageShell>;

  const totalQ = stats.reduce((s, x) => s + x.total, 0);
  const totalC = stats.reduce((s, x) => s + x.correct, 0);
  const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  // Group stats by macro area
  const macroMap = new Map<string, { name: string; correct: number; total: number }>();
  stats.forEach(s => {
    const e = macroMap.get(s.macro_area_id) ?? { name: s.macro_area_name, correct: 0, total: 0 };
    e.correct += s.correct; e.total += s.total;
    macroMap.set(s.macro_area_id, e);
  });

  return (
    <PageShell courseName={course.name}>
      <div className="max-w-3xl mx-auto px-4 space-y-5">

        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl nav-grad text-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-2xl mb-1">{course.icon}</div>
              <h2 className="text-xl font-bold">{course.name}</h2>
              <p className="text-blue-200 text-xs mt-0.5">{course.subtitle}</p>
            </div>
            <Link href="/dashboard" className="flex-shrink-0 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">
              Cambia materia
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            {[[totalQ, 'Domande svolte'], [`${acc}%`, 'Accuratezza'], [exams.length, 'Esami simulati']].map(([v, l]) => (
              <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xl font-bold">{v}</div>
                <div className="text-xs text-blue-200 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href={`/quiz/${courseId}`} className="card-hover group">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(32,44,71)]">Esercitazione</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">Scegli argomenti e domande. Risposta corretta visibile subito.</p>
              </div>
            </div>
          </Link>

          <Link href={`/exam/${courseId}`} className="card-hover group">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(32,44,71)]">Simulazione Esame</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">
                  {course.exam_rules.total_questions} domande · {course.exam_rules.time_limit_seconds / 60} min · +{course.exam_rules.correct_score}/−{course.exam_rules.wrong_penalty}
                </p>
              </div>
            </div>
          </Link>

          <Link href={`/profile/${courseId}`} className="card-hover group sm:col-span-2">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center flex-shrink-0 transition-colors">
                <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
              <div>
                <h3 className="font-semibold text-[rgb(32,44,71)]">Il mio profilo</h3>
                <p className="text-gray-400 text-xs mt-1 leading-relaxed">Statistiche per argomento, punti di forza e aree deboli. Ripasso mirato.</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Quick macro stats */}
        {macroMap.size > 0 && (
          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-4 text-sm uppercase tracking-wide">Progressi per materia</h3>
            <div className="space-y-3">
              {Array.from(macroMap.values()).map(m => {
                const pct = m.total > 0 ? Math.round((m.correct / m.total) * 100) : 0;
                return (
                  <div key={m.name}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{m.name}</span>
                      <span className="text-gray-400 tabular-nums">{m.correct}/{m.total} · {pct}%</span>
                    </div>
                    <ProgressBar pct={pct} />
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* Recent exams */}
        {exams.length > 0 && (
          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm uppercase tracking-wide">Ultimi esami</h3>
            <div className="space-y-2">
              {exams.slice(0, 5).map(e => (
                <div key={e.id} className="flex items-center justify-between p-3 bg-[rgb(240,242,247)] rounded-xl text-sm">
                  <div>
                    <div className="font-semibold text-[rgb(32,44,71)]">{new Date(e.created_at).toLocaleDateString('it-IT')}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2.5">
                      <span className="inline-flex items-center gap-1 text-emerald-600"><Icon name="check" className="w-3 h-3" />{e.correct}</span>
                      <span className="inline-flex items-center gap-1 text-red-500"><Icon name="x" className="w-3 h-3" />{e.wrong}</span>
                      <span className="inline-flex items-center gap-1"><Icon name="square" className="w-3 h-3" />{e.omitted}</span>
                      <span className="inline-flex items-center gap-1"><Icon name="clock" className="w-3 h-3" />{fmt(e.duration_seconds)}</span>
                    </div>
                  </div>
                  <div className={`text-2xl font-black tabular-nums ${e.score_in_30 >= 27 ? 'text-emerald-500' : e.score_in_30 >= 24 ? 'text-blue-500' : e.score_in_30 >= 18 ? 'text-amber-500' : 'text-red-500'}`}>
                    {e.score_in_30}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
