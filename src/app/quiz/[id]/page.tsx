'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getMacroAreas, getTopics, getQuestions, recordQuizAnswers } from '@/lib/db';
import { PageShell, Card, Spinner, Checkbox, ProgressBar } from '@/components/ui';
import type { Course, MacroArea, Topic, Question } from '@/types';

type Phase = 'setup' | 'quiz' | 'results';

export default function QuizPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [areas, setAreas] = useState<MacroArea[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [allQs, setAllQs] = useState<Question[]>([]);
  const [fetching, setFetching] = useState(true);

  // Setup state
  const [selAreas, setSelAreas] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [count, setCount] = useState(10);

  // Quiz state
  const [phase, setPhase] = useState<Phase>('setup');
  const [quizQs, setQuizQs] = useState<Question[]>([]);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [log, setLog] = useState<{ question: Question; correct: boolean }[]>([]);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!courseId) return;
    Promise.all([getCourse(courseId), getMacroAreas(courseId), getTopics(courseId), getQuestions(courseId, { activeOnly: true })])
      .then(([c, a, t, q]) => { setCourse(c); setAreas(a); setTopics(t); setAllQs(q); setFetching(false); });
  }, [courseId]);

  if (loading || fetching) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!course) return <PageShell><p className="text-center mt-20 text-gray-400">Materia non trovata.</p></PageShell>;

  const toggleArea = (id: string) => {
    if (selAreas.includes(id)) {
      setSelAreas(selAreas.filter(x => x !== id));
      const rm = topics.filter(t => t.macro_area_id === id).map(t => t.id);
      setSelTopics(selTopics.filter(t => !rm.includes(t)));
    } else setSelAreas([...selAreas, id]);
  };
  const toggleTopic = (id: string) => setSelTopics(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const availTopics = topics.filter(t => selAreas.includes(t.macro_area_id));
  const pool = allQs.filter(q => selAreas.includes(q.macro_area_id) && (selTopics.length === 0 || selTopics.includes(q.topic_id)));
  const maxQ = Math.min(pool.length, 50);

  const startQuiz = () => {
    if (!selAreas.length || !pool.length) return;
    const picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    setQuizQs(picked); setCur(0); setSel([]); setAnswered(false); setLog([]); setPhase('quiz');
  };

  // ── Setup phase ──
  if (phase === 'setup') return (
    <PageShell courseName={course.name}>
      <div className="max-w-xl mx-auto px-4 space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push(`/course/${courseId}`)} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Configura esercitazione</h2>
        </div>

        <Card>
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">1 · Scegli le macro-aree</h3>
          <div className="space-y-2">
            {areas.map(a => {
              const n = allQs.filter(q => q.macro_area_id === a.id).length;
              const on = selAreas.includes(a.id);
              return (
                <button key={a.id} onClick={() => toggleArea(a.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${on ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                  <span className={`font-medium text-sm ${on ? 'text-[rgb(32,44,71)]' : 'text-gray-700'}`}>{a.name}</span>
                  <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{n} domande</span><Checkbox checked={on} /></div>
                </button>
              );
            })}
          </div>
        </Card>

        {availTopics.length > 0 && (
          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-1 text-sm">2 · Filtra per argomento <span className="font-normal text-gray-400">(opzionale)</span></h3>
            <p className="text-xs text-gray-400 mb-3">Se non selezioni nulla vengono inclusi tutti.</p>
            <div className="space-y-1.5">
              {availTopics.map(t => {
                const n = allQs.filter(q => q.topic_id === t.id).length;
                const on = selTopics.includes(t.id);
                return (
                  <button key={t.id} onClick={() => toggleTopic(t.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left ${on ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}>
                    <span className={`text-sm ${on ? 'font-medium text-[rgb(32,44,71)]' : 'text-gray-600'}`}>{t.name}</span>
                    <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{n}</span><Checkbox checked={on} small /></div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        <Card>
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">{availTopics.length > 0 ? '3' : '2'} · Numero di domande: <span className="text-[rgb(99,130,201)]">{Math.min(count, maxQ || 5)}</span></h3>
          <input type="range" min={5} max={maxQ || 5} value={Math.min(count, maxQ || 5)} onChange={e => setCount(+e.target.value)} className="w-full accent-[rgb(32,44,71)]" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>Disponibili: {pool.length}</span><span>{maxQ || 5}</span></div>
        </Card>

        <button onClick={startQuiz} disabled={!selAreas.length || !pool.length} className="btn-primary w-full py-3 text-base disabled:opacity-40">
          Inizia esercitazione →
        </button>
      </div>
    </PageShell>
  );

  // ── Quiz phase ──
  if (phase === 'quiz') {
    const q = quizQs[cur];
    const allowMultiple = course.exam_rules.allow_multiple_correct;

    const pick = (idx: number) => {
      if (answered) return;
      if (allowMultiple) {
        setSel(s => s.includes(idx) ? s.filter(i => i !== idx) : [...s, idx]);
      } else {
        setSel([idx]);
        setTimeout(() => setAnswered(true), 150);
      }
    };

    const confirmMultiple = () => { if (sel.length > 0) setAnswered(true); };

    const isCorrect = () => {
      const correct = q.correct_answers;
      return sel.length === correct.length && sel.every(i => correct.includes(i));
    };

    const next = () => {
      const c = isCorrect();
      const entry = { question: q, correct: c };
      const newLog = [...log, entry];
      setLog(newLog);
      if (cur === quizQs.length - 1) {
        if (user) recordQuizAnswers(user.id, courseId, newLog);
        setPhase('results');
      } else {
        setCur(x => x + 1); setSel([]); setAnswered(false);
      }
    };

    return (
      <PageShell courseName={course.name}>
        <div className="max-w-2xl mx-auto px-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[rgb(32,44,71)] rounded-full transition-all" style={{ width: `${(cur / quizQs.length) * 100}%` }} />
            </div>
            <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">{cur + 1}/{quizQs.length}</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{q.macro_area_name}</span>
            <span className="text-xs text-gray-400">{q.topic_name}</span>
          </div>
          <Card><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question_text}</p></Card>
          {allowMultiple && !answered && <p className="text-xs text-amber-600 font-medium">⚠️ Possono esserci più risposte corrette</p>}
          <div className="space-y-2">
            {q.options.map((opt, idx) => {
              const isCorr = q.correct_answers.includes(idx);
              const isSel = sel.includes(idx);
              let cls = 'opt-btn';
              if (answered) {
                cls += ' opt-disabled';
                if (isCorr) cls += ' opt-correct';
                else if (isSel) cls += ' opt-wrong';
                else cls += ' opt-reveal-neutral';
              } else if (isSel) cls += ' opt-selected';
              return (
                <button key={idx} className={cls} onClick={() => pick(idx)} disabled={answered}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </button>
              );
            })}
          </div>
          {allowMultiple && !answered && sel.length > 0 && (
            <button onClick={confirmMultiple} className="btn-primary w-full">Conferma risposta</button>
          )}
          {answered && (
            <>
              <div className={`p-3.5 rounded-xl text-sm font-medium border ${isCorrect() ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                {isCorrect() ? '✅ Risposta corretta!' : <>❌ Risposta errata. <span className="font-semibold">Corretta/e: {q.correct_answers.map(i => q.options[i]).join(', ')}</span></>}
                {q.explanation && <p className="mt-1 text-xs opacity-80">{q.explanation}</p>}
              </div>
              <button onClick={next} className="btn-primary w-full">{cur === quizQs.length - 1 ? 'Vedi risultati' : 'Prossima →'}</button>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  // ── Results phase ──
  const correct = log.filter(l => l.correct).length;
  const pct = Math.round((correct / quizQs.length) * 100);
  return (
    <PageShell courseName={course.name}>
      <div className="max-w-lg mx-auto px-4">
        <Card className="text-center">
          <div className="text-5xl mb-3">{pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Esercitazione completata!</h2>
          <div className="mt-4 p-5 bg-[rgb(240,242,247)] rounded-2xl">
            <div className="text-5xl font-bold text-[rgb(32,44,71)]">{correct}<span className="text-2xl text-gray-400">/{quizQs.length}</span></div>
            <div className="text-gray-500 text-sm mt-1">{pct}% di risposte corrette</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-xl"><div className="text-2xl font-bold text-emerald-600">{correct}</div><div className="text-xs text-emerald-600 mt-0.5">Corrette</div></div>
            <div className="p-3 bg-red-50 rounded-xl"><div className="text-2xl font-bold text-red-500">{quizQs.length - correct}</div><div className="text-xs text-red-500 mt-0.5">Errate</div></div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => setPhase('setup')} className="btn-secondary flex-1 text-sm">Altra sessione</button>
            <button onClick={() => router.push(`/course/${courseId}`)} className="btn-primary flex-1 text-sm">Dashboard</button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
