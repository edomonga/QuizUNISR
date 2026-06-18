'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, pickExamQuestions, recordQuizAnswers, saveExamResult } from '@/lib/db';
import { PageShell, Card, Spinner } from '@/components/ui';
import type { Course, Question, ExamAnswer } from '@/types';

const fmt = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

// ── Shuffled question: options are reordered, correct_answers remapped ──────
interface ShuffledQuestion extends Question {
  shuffled_options: string[];       // options in new display order
  shuffled_correct: number[];       // correct answer indices in new order
  original_indices: number[];       // originalIndex[newPosition] = oldIndex
}

function shuffleQuestion(q: Question): ShuffledQuestion {
  const indices = q.options.map((_, i) => i);
  // Fisher-Yates shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const shuffled_options = indices.map(i => q.options[i]);
  const shuffled_correct = q.correct_answers.map(orig =>
    indices.indexOf(orig)
  );
  return { ...q, shuffled_options, shuffled_correct, original_indices: indices };
}

type Phase = 'setup' | 'exam' | 'results';

export default function ExamPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [fetching, setFetching] = useState(true);
  const [phase, setPhase] = useState<Phase>('setup');

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);
  useEffect(() => {
    getCourse(courseId).then(c => { setCourse(c); setFetching(false); });
  }, [courseId]);

  if (loading || fetching) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!course) return <PageShell><p className="text-center mt-20 text-gray-400">Materia non trovata.</p></PageShell>;

  if (phase === 'setup') return (
    <PageShell courseName={course.name}>
      <div className="max-w-xl mx-auto px-4 space-y-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push(`/course/${courseId}`)} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Simulazione Esame</h2>
        </div>
        <Card className="space-y-4">
          <h3 className="font-semibold text-[rgb(32,44,71)]">Regole — {course.name}</h3>
          <div className="space-y-2.5 text-sm text-gray-700">
            {[
              ['📝', `${course.exam_rules.total_questions} domande (${course.exam_rules.options_per_question} opzioni ciascuna)`],
              ['⏱️', `${course.exam_rules.time_limit_seconds / 60} minuti`],
              ['✅', `+${course.exam_rules.correct_score} risposta corretta`],
              ['❌', `−${course.exam_rules.wrong_penalty} risposta errata`],
              ['⬜', `0 risposta omessa`],
              ['🔀', 'Navigazione libera avanti e indietro'],
              ['🎲', 'Le opzioni vengono mescolate ad ogni esame'],
              ...(course.exam_rules.allow_multiple_correct ? [['⚠️', 'Alcune domande potrebbero avere più risposte corrette']] : []),
            ].map(([icon, text]) => (
              <div key={text as string} className="flex items-start gap-2.5">
                <span className="flex-shrink-0">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ Il timer parte subito. L'esame si chiude automaticamente allo scadere del tempo.
          </div>
        </Card>
        <button onClick={() => setPhase('exam')} className="btn-primary w-full py-3 text-base">
          Inizia simulazione →
        </button>
      </div>
    </PageShell>
  );

  return <ExamRunner course={course} userId={user!.id} onEnd={() => router.push(`/course/${courseId}`)} />;
}

function ExamRunner({ course, userId, onEnd }: { course: Course; userId: string; onEnd: () => void }) {
  const rule = course.exam_rules;
  const [qs, setQs] = useState<ShuffledQuestion[]>([]);
  // answers[i] = array of selected indices in SHUFFLED order
  const [answers, setAnswers] = useState<number[][]>([]);
  const [cur, setCur] = useState(0);
  const [timeLeft, setTimeLeft] = useState(rule.time_limit_seconds);
  const [submitted, setSubmitted] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{
    correct: number; wrong: number; omitted: number; raw: number; scoreIn30: number;
  } | null>(null);
  const startRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    pickExamQuestions(course).then(rawQs => {
      const shuffled = rawQs.map(shuffleQuestion);
      setQs(shuffled);
      setAnswers(shuffled.map(() => []));
      setLoading(false);
    });
  }, [course]);

  const submit = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSubmitted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => setTimeLeft(t => {
      if (t <= 1) { submit(); return 0; }
      return t - 1;
    }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading, submit]);

  const isQuestionCorrect = (q: ShuffledQuestion, sel: number[]) => {
    if (sel.length === 0) return false;
    return sel.length === q.shuffled_correct.length &&
      sel.every(i => q.shuffled_correct.includes(i));
  };

  useEffect(() => {
    if (!submitted || !qs.length) return;
    let correct = 0, wrong = 0, omitted = 0;
    answers.forEach((a, i) => {
      if (a.length === 0) { omitted++; return; }
      if (isQuestionCorrect(qs[i], a)) correct++; else wrong++;
    });
    const raw = correct * rule.correct_score - wrong * rule.wrong_penalty;
    const scoreIn30 = Math.max(0, Math.round((raw / rule.total_questions) * 30 * 10) / 10);
    setResults({ correct, wrong, omitted, raw, scoreIn30 });
    const dur = Math.round((Date.now() - startRef.current) / 1000);

    // Map back to original indices for storage
    const examAnswers: ExamAnswer[] = qs.map((q, i) => {
      const selShuffled = answers[i];
      const selOriginal = selShuffled.map(si => q.original_indices[si]);
      const corr = isQuestionCorrect(q, selShuffled);
      return { question_id: q.id, selected: selOriginal, correct: corr };
    });

    recordQuizAnswers(userId, course.id,
      qs.map((q, i) => ({ question: q, correct: examAnswers[i].correct }))
    );
    saveExamResult({
      user_id: userId, course_id: course.id, course_name: course.name,
      score_in_30: scoreIn30, raw_score: raw, correct, wrong, omitted,
      duration_seconds: dur, answers: examAnswers,
    });
  }, [submitted]); // eslint-disable-line

  if (loading) return <PageShell><Spinner className="mt-20" /></PageShell>;

  // ── Results screen ──────────────────────────────────────────────────────────
  if (submitted && results) {
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    return (
      <PageShell courseName={course.name}>
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <Card className="text-center">
            <div className="text-4xl mb-2">
              {results.scoreIn30 >= 27 ? '🏆' : results.scoreIn30 >= 24 ? '🎓' : results.scoreIn30 >= 18 ? '👍' : '📚'}
            </div>
            <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Esame completato</h2>
            <div className="mt-4 inline-block bg-[rgb(32,44,71)] rounded-2xl px-10 py-5 text-white">
              <div className="text-5xl font-black">{results.scoreIn30}</div>
              <div className="text-blue-200 text-sm">su 30</div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="p-3 bg-emerald-50 rounded-xl">
                <div className="text-xl font-bold text-emerald-600">{results.correct}</div>
                <div className="text-xs text-emerald-600 mt-0.5">Corrette<br /><span className="text-gray-400">(+{results.correct * rule.correct_score})</span></div>
              </div>
              <div className="p-3 bg-red-50 rounded-xl">
                <div className="text-xl font-bold text-red-500">{results.wrong}</div>
                <div className="text-xs text-red-500 mt-0.5">Errate<br /><span className="text-gray-400">(−{(results.wrong * rule.wrong_penalty).toFixed(1)})</span></div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="text-xl font-bold text-gray-500">{results.omitted}</div>
                <div className="text-xs text-gray-400 mt-0.5">Omesse<br />(0)</div>
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Punteggio grezzo: {results.raw.toFixed(2)} · Durata: {fmt(dur)}
            </p>
          </Card>

          <button onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:border-[rgb(32,44,71)] transition-colors font-semibold text-[rgb(32,44,71)] text-sm">
            <span>📋 Revisione completa ({qs.length} domande)</span>
            <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${showReview ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showReview && (
            <div className="space-y-3">
              {qs.map((q, i) => {
                const a = answers[i];
                const isOmitted = a.length === 0;
                const isCorrect = !isOmitted && isQuestionCorrect(q, a);
                return (
                  <div key={q.id} className={`rounded-2xl border-2 overflow-hidden ${isCorrect ? 'border-emerald-300' : isOmitted ? 'border-gray-200' : 'border-red-300'}`}>
                    <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium ${isCorrect ? 'bg-emerald-50 text-emerald-700' : isOmitted ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700'}`}>
                      <span className="font-semibold">
                        {isCorrect ? '✅ Corretta' : isOmitted ? '⬜ Omessa' : '❌ Errata'} — D{i + 1}
                      </span>
                      <span className="text-xs opacity-70">{q.macro_area_name}</span>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-[rgb(32,44,71)] leading-relaxed mb-3">{q.question_text}</p>
                      <div className="space-y-1.5">
                        {q.shuffled_options.map((opt, idx) => {
                          const isCorr = q.shuffled_correct.includes(idx);
                          const isSel = a.includes(idx);
                          let rowCls = 'flex items-start gap-2 text-sm px-3 py-2 rounded-lg ';
                          if (isCorr) rowCls += 'bg-emerald-50 text-emerald-800 font-medium';
                          else if (isSel && !isCorr) rowCls += 'bg-red-50 text-red-800';
                          else rowCls += 'text-gray-500';
                          return (
                            <div key={idx} className={rowCls}>
                              <span className="flex-shrink-0 w-5 h-5 rounded border bg-white text-xs font-bold flex items-center justify-center">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="leading-snug flex-1">{opt}</span>
                              {isCorr && <span className="flex-shrink-0 text-emerald-600 font-bold">✓</span>}
                              {isSel && !isCorr && <span className="flex-shrink-0 text-red-500 font-bold">✗</span>}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="mt-2 text-xs text-gray-500 italic">{q.explanation}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <button onClick={onEnd} className="btn-primary w-full">Torna alla dashboard</button>
        </div>
      </PageShell>
    );
  }

  // ── Exam in progress ────────────────────────────────────────────────────────
  const q = qs[cur];
  const warn = timeLeft < 300;
  const answeredCount = answers.filter(a => a.length > 0).length;

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-base">🩺 UniQuiz · {course.name}</span>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-black tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{fmt(timeLeft)}</span>
          <button onClick={submit} className="bg-white text-[rgb(32,44,71)] rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-blue-50">
            Consegna
          </button>
        </div>
      </nav>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-[rgb(32,44,71)]">
          <div className="flex-1 overflow-y-auto p-3 pt-4">
            <p className="text-xs text-blue-300 uppercase tracking-wide font-medium mb-2">Domande</p>
            <div className="grid grid-cols-4 gap-1.5">
              {qs.map((_, i) => {
                const cls = i === cur ? 'q-dot q-current'
                  : answers[i]?.length > 0 ? 'q-dot q-answered'
                  : 'q-dot q-unanswered';
                return (
                  <button key={i} className={cls} onClick={() => setCur(i)}>{i + 1}</button>
                );
              })}
            </div>
          </div>
          <div className="p-3 border-t border-white/10 space-y-2">
            <div className="text-xs text-blue-200">
              Risposte: <span className="font-bold text-white">{answeredCount}</span>/{qs.length}
            </div>
            <button onClick={submit}
              className="w-full py-2 bg-white text-[rgb(32,44,71)] rounded-xl text-sm font-bold hover:bg-blue-50">
              Consegna esame
            </button>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-gray-400 tabular-nums">Domanda {cur + 1} di {qs.length}</span>
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                {q.macro_area_name}
              </span>
            </div>

            {rule.allow_multiple_correct && (
              <p className="text-xs text-amber-600 font-medium">
                ⚠️ Possono esserci più risposte corrette — seleziona tutte quelle che ritieni corrette
              </p>
            )}

            <Card>
              <p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question_text}</p>
            </Card>

            <div className="space-y-2">
              {q.shuffled_options.map((opt, idx) => {
                const isSel = (answers[cur] ?? []).includes(idx);
                return (
                  <button key={idx}
                    className={`opt-btn ${isSel ? 'opt-selected' : ''}`}
                    onClick={() => {
                      const cur_a = [...(answers[cur] ?? [])];
                      let next_a: number[];
                      if (rule.allow_multiple_correct) {
                        next_a = cur_a.includes(idx)
                          ? cur_a.filter(i => i !== idx)
                          : [...cur_a, idx];
                      } else {
                        next_a = [idx];
                      }
                      const na2 = [...answers];
                      na2[cur] = next_a;
                      setAnswers(na2);
                    }}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0}
                className="btn-secondary flex-1 disabled:opacity-30">
                ← Precedente
              </button>
              <button onClick={() => setCur(c => Math.min(qs.length - 1, c + 1))} disabled={cur === qs.length - 1}
                className="btn-primary flex-1 disabled:opacity-30">
                Successiva →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
