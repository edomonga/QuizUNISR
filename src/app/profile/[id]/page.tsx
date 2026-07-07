'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getUserStats, getExamResults, getQuestions } from '@/lib/db';
import { PageShell, Card, Spinner, ProgressBar } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Course, UserStats, ExamResult, Question } from '@/types';

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [stats, setStats] = useState<UserStats[]>([]);
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [allQs, setAllQs] = useState<Question[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!user || !courseId) return;
    Promise.all([getCourse(courseId), getUserStats(user.id, courseId), getExamResults(user.id), getQuestions(courseId, { activeOnly: true })])
      .then(([c, s, e, q]) => {
        setCourse(c);
        setStats(s);
        setExams(e.filter(r => r.course_id === courseId));
        setAllQs(q);
        setFetching(false);
      });
  }, [user?.id, courseId]);

  if (loading || fetching) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!course) return <PageShell><p className="text-center mt-20 text-gray-400">Materia non trovata.</p></PageShell>;

  const totalQ = stats.reduce((s, x) => s + x.total, 0);
  const totalC = stats.reduce((s, x) => s + x.correct, 0);
  const acc = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;

  const topicStats = stats.map(s => ({ ...s, pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);

  const weak = topicStats.filter(t => t.pct < 60 && t.total >= 3);
  const strong = topicStats.filter(t => t.pct >= 70 && t.total >= 3);

  const practiceWeak = (topicId: string) => {
    const qs = allQs.filter(q => q.topic_id === topicId);
    if (qs.length === 0) return;
    router.push(`/quiz/${courseId}?topicId=${topicId}`);
  };

  return (
    <PageShell courseName={course.name}>
      <div className="max-w-2xl mx-auto px-4 space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push(`/course/${courseId}`)} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Il mio profilo — {course.name}</h2>
        </div>

        {/* Overview */}
        <Card className="bg-[rgb(32,44,71)] text-white">
          <p className="text-blue-200 text-xs uppercase tracking-wide font-medium mb-3">Riepilogo</p>
          <div className="grid grid-cols-3 gap-3">
            {[[totalQ, 'Domande'], [`${acc}%`, 'Accuratezza'], [exams.length, 'Esami']].map(([v, l]) => (
              <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center">
                <div className="text-xl font-bold">{v}</div>
                <div className="text-xs text-blue-200 mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Weak */}
        {weak.length > 0 && (
          <Card className="border-2 border-red-100">
            <h3 className="font-semibold text-red-600 mb-3 text-sm flex items-center gap-2"><Icon name="trend-down" className="w-4 h-4" />Da migliorare</h3>
            <div className="space-y-3">
              {weak.map(t => (
                <div key={t.topic_id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate pr-2">{t.topic_name}</span>
                      <span className="text-red-500 font-semibold flex-shrink-0">{t.pct}%</span>
                    </div>
                    <ProgressBar pct={t.pct} color="#f87171" />
                  </div>
                  <button onClick={() => practiceWeak(t.topic_id)}
                    className="flex-shrink-0 text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-200 transition-colors">
                    Ripassa
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Strong */}
        {strong.length > 0 && (
          <Card className="border-2 border-emerald-100">
            <h3 className="font-semibold text-emerald-600 mb-3 text-sm flex items-center gap-2"><Icon name="zap" className="w-4 h-4" />Punti di forza</h3>
            <div className="space-y-2">
              {strong.map(t => (
                <div key={t.topic_id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{t.topic_name}</span>
                    <span className="text-emerald-600 font-semibold">{t.pct}%</span>
                  </div>
                  <ProgressBar pct={t.pct} color="#34d399" />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* All topics */}
        {topicStats.length > 0 && (
          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">Tutti gli argomenti</h3>
            <div className="space-y-2.5">
              {topicStats.map(t => (
                <div key={t.topic_id}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{t.topic_name}</span>
                    <span className="text-gray-400 tabular-nums">{t.correct}/{t.total} · {t.pct}%</span>
                  </div>
                  <ProgressBar pct={t.pct} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Exam history */}
        {exams.length > 0 && (
          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">Storico esami simulati</h3>
            <div className="space-y-2">
              {exams.map(e => (
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

        {topicStats.length === 0 && exams.length === 0 && (
          <Card className="text-center py-10 text-gray-400">
            <Icon name="chart" className="w-9 h-9 mx-auto mb-3 text-gray-300" />
            <p>Nessuna statistica ancora.<br />Inizia un'esercitazione o un esame!</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
