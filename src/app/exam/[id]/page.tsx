'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, pickExamQuestions, recordQuizAnswers, saveExamResult } from '@/lib/db';
import { PageShell, Card, Spinner, Modal } from '@/components/ui';
import { Icon } from '@/components/Icon';
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
  // Only shuffle if shuffle_options is not explicitly false
  if (q.shuffle_options !== false) {
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
  }
  const shuffled_options = indices.map(i => q.options[i]);
  const shuffled_correct = q.correct_answers.map(orig => indices.indexOf(orig));
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
            {([
              ['file', `${course.exam_rules.total_questions} domande (${course.exam_rules.options_per_question} opzioni ciascuna)`],
              ['clock', `${course.exam_rules.time_limit_seconds / 60} minuti`],
              ['check', `+${course.exam_rules.correct_score} risposta corretta`],
              ['x', `−${course.exam_rules.wrong_penalty} risposta errata`],
              ['square', `0 risposta omessa`],
              (course.exam_rules.no_navigation
                ? ['lock', 'Navigazione bloccata: non si può tornare indietro, conferma richiesta per ogni domanda']
                : ['shuffle', 'Navigazione libera avanti e indietro']),
              ['dice', 'Le opzioni vengono mescolate ad ogni esame'],
              ...(course.exam_rules.allow_multiple_correct ? [['alert', 'Alcune domande potrebbero avere più risposte corrette']] : []),
            ] as [import('@/components/Icon').IconName, string][]).map(([icon, text]) => (
              <div key={text} className="flex items-start gap-2.5">
                <Icon name={icon} className="w-4 h-4 mt-0.5 flex-shrink-0 text-[color:var(--sig)]" />
                <span>{text}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
            <Icon name="alert" className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>Il timer parte subito. L'esame si chiude automaticamente allo scadere del tempo.</span>
          </div>
        </Card>
        {course.exam_rules.exam_type === 'two_phase' && course.exam_rules.preselection && (
          <Card className="border-2 border-amber-200">
            <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2"><Icon name="zap" className="w-4 h-4" />Struttura bifasica</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">1</span>
                <span><strong>Preselezione:</strong> {course.exam_rules.preselection.questions} domande in {course.exam_rules.preselection.time_limit_seconds / 60} minuti. Puoi sbagliare al massimo {course.exam_rules.preselection.max_errors} domanda/e per accedere all'esame.</span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-amber-100 text-amber-700 text-xs font-bold flex items-center justify-center">2</span>
                <span><strong>Esame:</strong> {course.exam_rules.total_questions} domande in {course.exam_rules.time_limit_seconds / 60} minuti, con le regole di punteggio indicate sopra.</span>
              </div>
            </div>
          </Card>
        )}
        <button onClick={() => setPhase('exam')} className="btn-primary w-full py-3 text-base">
          Inizia simulazione →
        </button>
      </div>
    </PageShell>
  );

  if (course.exam_rules.exam_type === 'two_phase') {
    return <TwoPhaseExamRunner course={course} userId={user!.id} onEnd={() => router.push(`/course/${courseId}`)} />;
  }
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
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
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
            {(() => {
              const s = results.scoreIn30;
              const passed = s >= 18;
              const color = s >= 27 ? '#0F9D63' : s >= 24 ? '#2F6FD8' : s >= 18 ? '#C97E1B' : '#E5484D';
              const C = 2 * Math.PI * 54;
              const off = C * (1 - Math.max(0, Math.min(30, s)) / 30);
              return (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-[color:var(--sig)] mb-1">Esame · {course.name}</p>
                  <div className="relative w-[150px] h-[150px] mx-auto my-2">
                    <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90">
                      <circle cx="65" cy="65" r="54" fill="none" stroke="rgb(226,231,240)" strokeWidth="12" />
                      <circle cx="65" cy="65" r="54" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[34px] font-extrabold text-[rgb(32,44,71)] leading-none tabular-nums">{s}</span>
                      <span className="text-xs text-gray-400 font-semibold">/ 30</span>
                    </div>
                  </div>
                  <p className="text-lg font-extrabold flex items-center justify-center gap-2" style={{ color }}>
                    <Icon name={passed ? 'award' : 'refresh'} className="w-5 h-5" strokeWidth={2} />
                    {passed ? 'Esame superato' : 'Non superato'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{passed ? 'Sei sopra la soglia di 18/30.' : 'Serve almeno 18/30 — riprova!'}</p>
                </>
              );
            })()}
            <div className="grid grid-cols-3 gap-3 mt-5">
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
            <span className="flex items-center gap-2"><Icon name="book" className="w-4 h-4 text-[color:var(--sig)]" />Revisione completa ({qs.length} domande)</span>
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
                      <span className="font-semibold inline-flex items-center gap-1.5">
                        <Icon name={isCorrect ? 'check' : isOmitted ? 'square' : 'x'} className="w-3.5 h-3.5" />
                        {isCorrect ? 'Corretta' : isOmitted ? 'Omessa' : 'Errata'} — D{i + 1}
                      </span>
                      <span className="text-xs opacity-70">{q.macro_area_name}</span>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-[rgb(32,44,71)] leading-relaxed mb-3">{q.question_text}</p>
                      <div className="space-y-1.5">
                        {q.shuffled_options.map((opt, idx) => {
                          const isCorr = q.shuffled_correct.includes(idx);
                          const isSel = a.includes(idx);
                          let rowCls = 'flex items-start gap-2.5 text-sm px-3 py-2.5 rounded-lg border-2 transition-colors ';
                          if (isCorr && isSel) rowCls += 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                          else if (isCorr && !isSel) rowCls += 'bg-emerald-50 border-emerald-200 text-emerald-700';
                          else if (!isCorr && isSel) rowCls += 'bg-red-100 border-red-500 text-red-900 font-semibold';
                          else rowCls += 'bg-white border-gray-200 text-gray-400';
                          return (
                            <div key={idx} className={rowCls}>
                              <span className={`flex-shrink-0 w-5 h-5 rounded border-2 text-xs font-bold flex items-center justify-center ${isSel ? 'bg-[rgb(32,44,71)] border-[rgb(32,44,71)] text-white' : 'bg-white border-gray-300 text-gray-500'}`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="leading-snug flex-1">{opt}</span>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                {isSel && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[rgb(32,44,71)] text-white whitespace-nowrap">Tua risposta</span>}
                                {isCorr && <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">✓ Corretta</span>}
                              </div>
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
  const goNext = () => { if (cur === qs.length - 1) submit(); else setCur(c => c + 1); };

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-base truncate min-w-0 flex-1 flex items-center gap-2"><Icon name="pulse" className="w-4 h-4 flex-shrink-0 text-[#8FE3DE]" strokeWidth={2} />UniQuiz · {course.name}</span>
        <div className="flex items-center gap-3 flex-shrink-0">
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
                  <button key={i} className={`${cls} ${rule.no_navigation ? 'cursor-default pointer-events-none' : ''}`}
                    onClick={() => { if (!rule.no_navigation) setCur(i); }}>{i + 1}</button>
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
              <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5">
                <Icon name="alert" className="w-3.5 h-3.5 flex-shrink-0" />Possono esserci più risposte corrette — seleziona tutte quelle che ritieni corrette
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
              {!rule.no_navigation && (
                <button onClick={() => setCur(c => Math.max(0, c - 1))} disabled={cur === 0}
                  className="btn-secondary flex-1 disabled:opacity-30">
                  ← Precedente
                </button>
              )}
              <button onClick={() => rule.no_navigation ? setConfirmAction(() => goNext) : goNext()}
                className="btn-primary flex-1">
                {cur === qs.length - 1 ? "Termina l'esame" : 'Successiva →'}
              </button>
            </div>

            {confirmAction && (
              <Modal title="Conferma" onClose={() => setConfirmAction(null)}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {cur === qs.length - 1
                      ? "Stai per consegnare l'esame. Una volta confermato non potrai più modificare le risposte. Procedere?"
                      : 'Questo esame non permette di tornare indietro: una volta confermato non potrai più modificare questa risposta. Procedere?'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Annulla</button>
                    <button onClick={() => { const fn = confirmAction; setConfirmAction(null); fn?.(); }} className="btn-primary flex-1">Conferma</button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TWO-PHASE EXAM RUNNER ───────────────────────────────────────────────────
// Phase 1: Preselezione — if pass → Phase 2: Esame vero
function TwoPhaseExamRunner({ course, userId, onEnd }: { course: Course; userId: string; onEnd: () => void }) {
  const rule = course.exam_rules;
  const pre = rule.preselection!;

  type InternalPhase = 'preselection' | 'preselection_failed' | 'preselection_passed' | 'main_exam';
  const [internalPhase, setInternalPhase] = useState<InternalPhase>('preselection');

  // ── Preselection state ──
  const [preQs, setPreQs] = useState<ShuffledQuestion[]>([]);
  const [preAnswers, setPreAnswers] = useState<number[][]>([]);
  const [preCur, setPreCur] = useState(0);
  const [preTimeLeft, setPreTimeLeft] = useState(pre.time_limit_seconds);
  const [preSubmitted, setPreSubmitted] = useState(false);
  const preTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [preLoading, setPreLoading] = useState(true);

  // ── Main exam state ──
  const [mainQs, setMainQs] = useState<ShuffledQuestion[]>([]);
  const [mainAnswers, setMainAnswers] = useState<number[][]>([]);
  const [mainCur, setMainCur] = useState(0);
  const [mainTimeLeft, setMainTimeLeft] = useState(rule.time_limit_seconds);
  const [mainSubmitted, setMainSubmitted] = useState(false);
  const mainTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [mainLoading, setMainLoading] = useState(false);
  const [mainResults, setMainResults] = useState<{ correct: number; wrong: number; omitted: number; raw: number; scoreIn30: number } | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const startRef = useRef(Date.now());

  // Load preselezione questions using preselection.distribution if set
  useEffect(() => {
    // Use preselection-specific distribution if configured, else fall back to main
    const preDistribution = (pre.distribution && Object.keys(pre.distribution).length > 0 && Object.values(pre.distribution).some(v => v > 0))
      ? pre.distribution
      : rule.distribution;
    const fakeCourse = {
      ...course,
      exam_rules: { ...rule, total_questions: pre.questions, distribution: preDistribution }
    };
    pickExamQuestions(fakeCourse).then(rawQs => {
      const shuffled = rawQs.map(shuffleQuestion);
      setPreQs(shuffled);
      setPreAnswers(shuffled.map(() => []));
      setPreLoading(false);
    });
  }, []); // eslint-disable-line

  // Preselezione timer
  const submitPre = useCallback(() => {
    if (preTimerRef.current) clearInterval(preTimerRef.current);
    setPreSubmitted(true);
  }, []);

  useEffect(() => {
    if (preLoading || preSubmitted) return;
    preTimerRef.current = setInterval(() => setPreTimeLeft(t => { if (t <= 1) { submitPre(); return 0; } return t - 1; }), 1000);
    return () => { if (preTimerRef.current) clearInterval(preTimerRef.current); };
  }, [preLoading, preSubmitted, submitPre]);

  // Evaluate preselezione result
  useEffect(() => {
    if (!preSubmitted) return;
    let wrong = 0;
    preAnswers.forEach((a, i) => {
      if (a.length === 0) return; // omitted doesn't count as wrong for preselezione
      const correct = preQs[i]?.shuffled_correct ?? [];
      const isCorrect = a.length === correct.length && a.every(x => correct.includes(x));
      if (!isCorrect) wrong++;
    });
    if (wrong <= pre.max_errors) {
      setInternalPhase('preselection_passed');
    } else {
      setInternalPhase('preselection_failed');
    }
  }, [preSubmitted]); // eslint-disable-line

  // Start main exam
  const startMainExam = useCallback(async () => {
    setMainLoading(true);
    setInternalPhase('main_exam');
    startRef.current = Date.now();
    const rawQs = await pickExamQuestions(course);
    const shuffled = rawQs.map(shuffleQuestion);
    setMainQs(shuffled);
    setMainAnswers(shuffled.map(() => []));
    setMainLoading(false);
  }, [course]);

  // Main exam timer
  const submitMain = useCallback(() => {
    if (mainTimerRef.current) clearInterval(mainTimerRef.current);
    setMainSubmitted(true);
  }, []);

  useEffect(() => {
    if (mainLoading || mainSubmitted || internalPhase !== 'main_exam') return;
    mainTimerRef.current = setInterval(() => setMainTimeLeft(t => { if (t <= 1) { submitMain(); return 0; } return t - 1; }), 1000);
    return () => { if (mainTimerRef.current) clearInterval(mainTimerRef.current); };
  }, [mainLoading, mainSubmitted, internalPhase, submitMain]);

  // Evaluate main exam
  useEffect(() => {
    if (!mainSubmitted || !mainQs.length) return;
    let correct = 0, wrong = 0, omitted = 0;
    mainAnswers.forEach((a, i) => {
      if (a.length === 0) { omitted++; return; }
      const exp = mainQs[i]?.shuffled_correct ?? [];
      const isCorrect = a.length === exp.length && a.every(x => exp.includes(x));
      if (isCorrect) correct++; else wrong++;
    });
    const raw = correct * rule.correct_score - wrong * rule.wrong_penalty;
    const scoreIn30 = Math.max(0, Math.round((raw / rule.total_questions) * 30 * 10) / 10);
    setMainResults({ correct, wrong, omitted, raw, scoreIn30 });
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    recordQuizAnswers(userId, course.id, mainQs.map((q, i) => ({
      question: q,
      correct: mainAnswers[i].length === q.shuffled_correct.length && mainAnswers[i].every(x => q.shuffled_correct.includes(x)),
    })));
    saveExamResult({ user_id: userId, course_id: course.id, course_name: course.name, score_in_30: scoreIn30, raw_score: raw, correct, wrong, omitted, duration_seconds: dur, answers: [] });
  }, [mainSubmitted]); // eslint-disable-line

  // ── PRESELECTION FAILED ──
  if (internalPhase === 'preselection_failed') {
    const wrong = preAnswers.filter((a, i) => {
      if (a.length === 0) return false;
      const c = preQs[i]?.shuffled_correct ?? [];
      return !(a.length === c.length && a.every(x => c.includes(x)));
    }).length;
    return (
      <PageShell courseName={course.name}>
        <div className="max-w-lg mx-auto px-4">
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500"><Icon name="x" className="h-8 w-8" strokeWidth={2.2} /></div>
            <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Preselezione non superata</h2>
            <div className="mt-4 p-5 bg-red-50 border border-red-200 rounded-2xl">
              <p className="text-red-700 font-medium">Hai commesso <strong>{wrong}</strong> errori.</p>
              <p className="text-red-600 text-sm mt-1">Limite massimo: {pre.max_errors} errore/i</p>
            </div>
            <p className="text-gray-500 text-sm mt-4">Non sei stato ammesso all'esame. Ripassa e riprova!</p>
            <div className="flex gap-3 mt-5">
              <button onClick={onEnd} className="btn-secondary flex-1">Dashboard</button>
              <button onClick={() => window.location.reload()} className="btn-primary flex-1">Riprova</button>
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── PRESELECTION PASSED ──
  if (internalPhase === 'preselection_passed') {
    const wrong = preAnswers.filter((a, i) => {
      if (a.length === 0) return false;
      const c = preQs[i]?.shuffled_correct ?? [];
      return !(a.length === c.length && a.every(x => c.includes(x)));
    }).length;
    return (
      <PageShell courseName={course.name}>
        <div className="max-w-lg mx-auto px-4">
          <div className="card text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><Icon name="check" className="h-8 w-8" strokeWidth={2.4} /></div>
            <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Preselezione superata!</h2>
            <div className="mt-4 p-5 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <p className="text-emerald-700 font-medium">Errori commessi: <strong>{wrong}</strong> su {pre.questions} domande</p>
              <p className="text-emerald-600 text-sm mt-1">Sei ammesso all'esame ✓</p>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-2">
              <Icon name="alert" className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>L'esame ha {rule.total_questions} domande e {rule.time_limit_seconds / 60} minuti. Il timer parte subito.</span>
            </div>
            <button onClick={startMainExam} className="btn-primary w-full mt-5 py-3 text-base flex items-center justify-center gap-2">
              Inizia l'esame <Icon name="arrow-right" className="w-4 h-4" />
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // ── MAIN EXAM RESULTS ──
  if (mainSubmitted && mainResults) {
    const dur = Math.round((Date.now() - startRef.current) / 1000);
    return (
      <PageShell courseName={course.name}>
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <Card className="text-center">
            {(() => {
              const s = mainResults.scoreIn30;
              const passed = s >= 18;
              const color = s >= 27 ? '#0F9D63' : s >= 24 ? '#2F6FD8' : s >= 18 ? '#C97E1B' : '#E5484D';
              const C = 2 * Math.PI * 54;
              const off = C * (1 - Math.max(0, Math.min(30, s)) / 30);
              return (
                <>
                  <p className="text-[10.5px] font-bold uppercase tracking-widest text-[color:var(--sig)] mb-1">Esame · {course.name}</p>
                  <div className="relative w-[150px] h-[150px] mx-auto my-2">
                    <svg width="150" height="150" viewBox="0 0 130 130" className="-rotate-90">
                      <circle cx="65" cy="65" r="54" fill="none" stroke="rgb(226,231,240)" strokeWidth="12" />
                      <circle cx="65" cy="65" r="54" fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[34px] font-extrabold text-[rgb(32,44,71)] leading-none tabular-nums">{s}</span>
                      <span className="text-xs text-gray-400 font-semibold">/ 30</span>
                    </div>
                  </div>
                  <p className="text-lg font-extrabold flex items-center justify-center gap-2" style={{ color }}>
                    <Icon name={passed ? 'award' : 'refresh'} className="w-5 h-5" strokeWidth={2} />
                    {passed ? 'Esame superato' : 'Non superato'}
                  </p>
                </>
              );
            })()}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <div className="p-3 bg-emerald-50 rounded-xl"><div className="text-xl font-bold text-emerald-600">{mainResults.correct}</div><div className="text-xs text-emerald-600 mt-0.5">Corrette<br/><span className="text-gray-400">(+{mainResults.correct})</span></div></div>
              <div className="p-3 bg-red-50 rounded-xl"><div className="text-xl font-bold text-red-500">{mainResults.wrong}</div><div className="text-xs text-red-500 mt-0.5">Errate<br/><span className="text-gray-400">(−{(mainResults.wrong * rule.wrong_penalty).toFixed(1)})</span></div></div>
              <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xl font-bold text-gray-500">{mainResults.omitted}</div><div className="text-xs text-gray-400 mt-0.5">Omesse<br/>(0)</div></div>
            </div>
            <p className="text-xs text-gray-400 mt-3">Punteggio grezzo: {mainResults.raw.toFixed(2)} · Durata: {fmt(dur)}</p>
          </Card>

          <button onClick={() => setShowReview(v => !v)}
            className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:border-[rgb(32,44,71)] transition-colors font-semibold text-[rgb(32,44,71)] text-sm">
            <span className="flex items-center gap-2"><Icon name="book" className="w-4 h-4 text-[color:var(--sig)]" />Revisione completa ({mainQs.length} domande)</span>
            <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${showReview ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
          </button>

          {showReview && (
            <div className="space-y-3">
              {mainQs.map((q, i) => {
                const a = mainAnswers[i];
                const isOmitted = a.length === 0;
                const isCorrect = !isOmitted && a.length === q.shuffled_correct.length && a.every(x => q.shuffled_correct.includes(x));
                return (
                  <div key={q.id} className={`rounded-2xl border-2 overflow-hidden ${isCorrect ? 'border-emerald-300' : isOmitted ? 'border-gray-200' : 'border-red-300'}`}>
                    <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium ${isCorrect ? 'bg-emerald-50 text-emerald-700' : isOmitted ? 'bg-gray-50 text-gray-500' : 'bg-red-50 text-red-700'}`}>
                      <span className="font-semibold inline-flex items-center gap-1.5"><Icon name={isCorrect ? 'check' : isOmitted ? 'square' : 'x'} className="w-3.5 h-3.5" />{isCorrect ? 'Corretta' : isOmitted ? 'Omessa' : 'Errata'} — D{i + 1}</span>
                    </div>
                    <div className="bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-[rgb(32,44,71)] leading-relaxed mb-3">{q.question_text}</p>
                      <div className="space-y-1.5">
                        {q.shuffled_options.map((opt, idx) => {
                          const isCorr = q.shuffled_correct.includes(idx);
                          const isSel = a.includes(idx);
                          let rowCls = 'flex items-start gap-2.5 text-sm px-3 py-2.5 rounded-lg border-2 transition-colors ';
                          if (isCorr && isSel) rowCls += 'bg-emerald-100 border-emerald-500 text-emerald-900 font-semibold';
                          else if (isCorr && !isSel) rowCls += 'bg-emerald-50 border-emerald-200 text-emerald-700';
                          else if (!isCorr && isSel) rowCls += 'bg-red-100 border-red-500 text-red-900 font-semibold';
                          else rowCls += 'bg-white border-gray-200 text-gray-400';
                          return (
                            <div key={idx} className={rowCls}>
                              <span className={`flex-shrink-0 w-5 h-5 rounded border-2 text-xs font-bold flex items-center justify-center ${isSel ? 'bg-[rgb(32,44,71)] border-[rgb(32,44,71)] text-white' : 'bg-white border-gray-300 text-gray-500'}`}>
                                {String.fromCharCode(65 + idx)}
                              </span>
                              <span className="leading-snug flex-1">{opt}</span>
                              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                {isSel && <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[rgb(32,44,71)] text-white whitespace-nowrap">Tua risposta</span>}
                                {isCorr && <span className="text-emerald-600 font-bold text-xs whitespace-nowrap">✓ Corretta</span>}
                              </div>
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

  // ── PRESELECTION IN PROGRESS ──
  if (internalPhase === 'preselection' || (!mainLoading && mainQs.length === 0)) {
    if (preLoading) return <PageShell><Spinner className="mt-20" /></PageShell>;
    const q = preQs[preCur];
    if (!q) return <PageShell><Spinner className="mt-20" /></PageShell>;
    const warn = preTimeLeft < 120;
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0 flex-1 flex items-center gap-2">
            <span className="font-bold text-base truncate flex items-center gap-2"><Icon name="pulse" className="w-4 h-4 flex-shrink-0 text-[#8FE3DE]" strokeWidth={2} />{course.name}</span>
            <span className="text-xs bg-amber-400 text-amber-900 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">PRESELEZIONE</span>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`text-lg font-black tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{fmt(preTimeLeft)}</span>
            <button onClick={submitPre} className="bg-white text-[rgb(32,44,71)] rounded-xl px-3 py-1.5 text-xs font-bold">Consegna</button>
          </div>
        </nav>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 font-medium">
              <span className="inline-flex items-center gap-1.5"><Icon name="zap" className="w-3.5 h-3.5 flex-shrink-0" />Fase di preselezione: puoi sbagliare al massimo {pre.max_errors} domanda/e per accedere all'esame</span>.
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 tabular-nums">Domanda {preCur + 1} di {preQs.length}</span>
            </div>
            <Card><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question_text}</p></Card>
            <div className="space-y-2">
              {q.shuffled_options.map((opt, idx) => (
                <button key={idx}
                  className={`opt-btn ${preAnswers[preCur]?.includes(idx) ? 'opt-selected' : ''}`}
                  onClick={() => {
                    const a = [...preAnswers];
                    if (rule.allow_multiple_correct) {
                      a[preCur] = a[preCur].includes(idx) ? a[preCur].filter(i => i !== idx) : [...a[preCur], idx];
                    } else {
                      a[preCur] = [idx];
                    }
                    setPreAnswers(a);
                  }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              {!rule.no_navigation && (
                <button onClick={() => setPreCur(c => Math.max(0, c - 1))} disabled={preCur === 0} className="btn-secondary flex-1 disabled:opacity-30">← Precedente</button>
              )}
              {preCur < preQs.length - 1
                ? <button onClick={() => rule.no_navigation ? setConfirmAction(() => () => setPreCur(c => c + 1)) : setPreCur(c => c + 1)} className="btn-primary flex-1">Successiva →</button>
                : <button onClick={() => rule.no_navigation ? setConfirmAction(() => submitPre) : submitPre()} className="btn-primary flex-1 bg-amber-500 hover:bg-amber-600">Consegna preselezione →</button>
              }
            </div>

            {confirmAction && (
              <Modal title="Conferma" onClose={() => setConfirmAction(null)}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {preCur < preQs.length - 1
                      ? 'Questo esame non permette di tornare indietro: una volta confermato non potrai più modificare questa risposta. Procedere?'
                      : 'Stai per consegnare la preselezione. Procedere?'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Annulla</button>
                    <button onClick={() => { const fn = confirmAction; setConfirmAction(null); fn?.(); }} className="btn-primary flex-1">Conferma</button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN EXAM IN PROGRESS ──
  if (mainLoading) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!mainQs.length) return <PageShell><Spinner className="mt-20" /></PageShell>;

  const q = mainQs[mainCur];
  const warn = mainTimeLeft < 300;
  const answered = mainAnswers[mainCur]?.length ?? 0;
  const goNextMain = () => { if (mainCur === mainQs.length - 1) submitMain(); else setMainCur(c => c + 1); };

  return (
    <div className="flex h-screen overflow-hidden flex-col">
      <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between flex-shrink-0">
        <span className="font-bold text-base truncate min-w-0 flex-1 flex items-center gap-2"><Icon name="pulse" className="w-4 h-4 flex-shrink-0 text-[#8FE3DE]" strokeWidth={2} />{course.name} — Esame</span>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className={`text-lg font-black tabular-nums ${warn ? 'text-red-400' : 'text-white'}`}>{fmt(mainTimeLeft)}</span>
          <button onClick={submitMain} className="bg-white text-[rgb(32,44,71)] rounded-xl px-3 py-1.5 text-xs font-bold hover:bg-blue-50">Consegna</button>
        </div>
      </nav>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-[rgb(32,44,71)]">
          <div className="flex-1 overflow-y-auto p-3 pt-4">
            <p className="text-xs text-blue-300 uppercase tracking-wide font-medium mb-2">Domande</p>
            <div className="grid grid-cols-4 gap-1.5">
              {mainQs.map((_, i) => {
                const cls = i === mainCur ? 'q-dot q-current' : (mainAnswers[i]?.length ?? 0) > 0 ? 'q-dot q-answered' : 'q-dot q-unanswered';
                return (
                  <button key={i} className={`${cls} ${rule.no_navigation ? 'cursor-default pointer-events-none' : ''}`}
                    onClick={() => { if (!rule.no_navigation) setMainCur(i); }}>{i + 1}</button>
                );
              })}
            </div>
          </div>
          <div className="p-3 border-t border-white/10 space-y-2">
            <div className="text-xs text-blue-200">Risposte: <span className="font-bold text-white">{mainAnswers.filter(a => (a?.length ?? 0) > 0).length}</span>/{mainQs.length}</div>
            <button onClick={submitMain} className="w-full py-2 bg-white text-[rgb(32,44,71)] rounded-xl text-sm font-bold hover:bg-blue-50">Consegna esame</button>
          </div>
        </aside>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400 tabular-nums">Domanda {mainCur + 1} di {mainQs.length}</span>
            </div>
            <Card><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question_text}</p></Card>
            <div className="space-y-2">
              {q.shuffled_options.map((opt, idx) => (
                <button key={idx}
                  className={`opt-btn ${(mainAnswers[mainCur] ?? []).includes(idx) ? 'opt-selected' : ''}`}
                  onClick={() => {
                    const a = [...mainAnswers];
                    if (!a[mainCur]) a[mainCur] = [];
                    if (rule.allow_multiple_correct) {
                      a[mainCur] = a[mainCur].includes(idx) ? a[mainCur].filter(i => i !== idx) : [...a[mainCur], idx];
                    } else {
                      a[mainCur] = [idx];
                    }
                    setMainAnswers(a);
                  }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">{String.fromCharCode(65 + idx)}</span>
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              {!rule.no_navigation && (
                <button onClick={() => setMainCur(c => Math.max(0, c - 1))} disabled={mainCur === 0} className="btn-secondary flex-1 disabled:opacity-30">← Precedente</button>
              )}
              <button onClick={() => rule.no_navigation ? setConfirmAction(() => goNextMain) : goNextMain()} className="btn-primary flex-1">
                {mainCur === mainQs.length - 1 ? "Termina l'esame" : 'Successiva →'}
              </button>
            </div>

            {confirmAction && (
              <Modal title="Conferma" onClose={() => setConfirmAction(null)}>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    {mainCur === mainQs.length - 1
                      ? "Stai per consegnare l'esame. Una volta confermato non potrai più modificare le risposte. Procedere?"
                      : 'Questo esame non permette di tornare indietro: una volta confermato non potrai più modificare questa risposta. Procedere?'}
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmAction(null)} className="btn-secondary flex-1">Annulla</button>
                    <button onClick={() => { const fn = confirmAction; setConfirmAction(null); fn?.(); }} className="btn-primary flex-1">Conferma</button>
                  </div>
                </div>
              </Modal>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
