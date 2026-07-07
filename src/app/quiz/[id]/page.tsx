'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCourse, getMacroAreas, getTopics, getQuestions,
  recordQuizAnswers, submitReport,
  getUnseenQuestions, countUnseenQuestions, markQuestionsSeen,
  getWrongQuestions, countWrongQuestions, markQuestionMastered,
} from '@/lib/db';
import type { WrongQuestionEntry } from '@/lib/db';
import { PageShell, Card, Spinner, Checkbox, ProgressBar, Modal } from '@/components/ui';
import { Icon } from '@/components/Icon';
import type { Course, MacroArea, Topic, Question } from '@/types';

type Phase = 'setup' | 'quiz' | 'results';
type QuizMode = 'all' | 'unseen' | 'wrong';

const MASTERY_THRESHOLD = 5;

function prepareQuestion(q: Question): Question & { _sopts: string[]; _scorrect: number[]; _shuffled: boolean } {
  const raw = q as any;
  if (raw._shuffled) return raw;
  if (q.shuffle_options === false) {
    raw._sopts = [...q.options];
    raw._scorrect = [...q.correct_answers];
  } else {
    const idxs = q.options.map((_: unknown, i: number) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    raw._sopts = idxs.map((i: number) => q.options[i]);
    raw._scorrect = q.correct_answers.map((o: number) => idxs.indexOf(o));
  }
  raw._shuffled = true;
  return raw;
}

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

  const [unseenCount, setUnseenCount] = useState<{ unseen: number; total: number } | null>(null);
  const [wrongCount, setWrongCount] = useState<number>(0);
  const [wrongDataMap, setWrongDataMap] = useState<Record<string, WrongQuestionEntry>>({});

  const [selAreas, setSelAreas] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [count, setCount] = useState(10);
  const [mode, setMode] = useState<QuizMode>('all');

  const [phase, setPhase] = useState<Phase>('setup');
  const [quizQs, setQuizQs] = useState<Question[]>([]);
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [log, setLog] = useState<{ question: Question; correct: boolean }[]>([]);

  // Tiene traccia dello stato "la so" cliccato durante la sessione (per aggiornare UI subito)
  const [masteredThisSession, setMasteredThisSession] = useState<Set<string>>(new Set());

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  const loadData = useCallback(async () => {
    if (!courseId || !user) return;
    const [c, a, t, q] = await Promise.all([
      getCourse(courseId), getMacroAreas(courseId),
      getTopics(courseId), getQuestions(courseId, { activeOnly: true }),
    ]);
    setCourse(c); setAreas(a); setTopics(t); setAllQs(q);
    const uc = await countUnseenQuestions(user.id, courseId);
    setUnseenCount(uc);
    const wc = await countWrongQuestions(user.id, courseId);
    setWrongCount(wc);
    setFetching(false);
  }, [courseId, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

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
  const pool = allQs.filter(q =>
    selAreas.includes(q.macro_area_id) && (selTopics.length === 0 || selTopics.includes(q.topic_id))
  );
 const maxQ = mode === 'wrong' ? Math.min(wrongCount, 50) : Math.min(pool.length, 50);

  const startQuiz = async () => {
    if (!user) return;
    let picked: Question[];

    if (mode === 'wrong') {
      const { questions, wrongDataMap: wdm } = await getWrongQuestions(user.id, courseId, count);
      setWrongDataMap(wdm);
      picked = questions.slice(0, maxQ);
    } else if (mode === 'unseen') {
      if (!selAreas.length || !pool.length) return;
      const unseen = await getUnseenQuestions(user.id, courseId, {
        macroAreaIds: selAreas,
        topicIds: selTopics.length > 0 ? selTopics : undefined,
      });
      picked = [...unseen].sort(() => Math.random() - 0.5).slice(0, count);
    } else {
      if (!selAreas.length || !pool.length) return;
      picked = [...pool].sort(() => Math.random() - 0.5).slice(0, count);
    }

    if (!picked.length) return;
    setMasteredThisSession(new Set());
    setQuizQs(picked); setCur(0); setSel([]); setAnswered(false); setLog([]); setPhase('quiz');
  };

  // ── SETUP PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'setup') {
    const isWrongMode = mode === 'wrong';
    const canStart = isWrongMode
      ? wrongCount > 0
      : selAreas.length > 0 && pool.length > 0 && !(mode === 'unseen' && unseenCount?.unseen === 0);

    return (
      <PageShell courseName={course.name}>
        <div className="max-w-xl mx-auto px-4 space-y-4">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={() => router.push(`/course/${courseId}`)} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Configura esercitazione</h2>
          </div>

          <Card>
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">1 · Modalità</h3>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => setMode('all')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'all' ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-[rgb(32,44,71)] flex items-center gap-2"><Icon name="book" className="w-4 h-4 text-[color:var(--sig)]" />Tutte le domande</div>
                <div className="text-xs text-gray-400 mt-0.5 ml-6">Pescate casualmente dal pool</div>
              </button>
              <button onClick={() => setMode('unseen')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'unseen' ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="font-semibold text-sm text-[rgb(32,44,71)] flex items-center gap-2"><Icon name="sparkles" className="w-4 h-4 text-[color:var(--sig)]" />Solo non viste</div>
                <div className="text-xs text-gray-400 mt-0.5 ml-6">
                  {unseenCount ? `${unseenCount.unseen} domande disponibili` : 'Solo domande nuove'}
                </div>
              </button>
              <button onClick={() => setMode('wrong')}
                className={`p-3 rounded-xl border-2 text-left transition-all ${mode === 'wrong' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}>
                <div className="font-semibold text-sm text-red-700 flex items-center gap-2"><Icon name="refresh" className="w-4 h-4" />Ripassa gli errori</div>
                <div className="text-xs text-gray-400 mt-0.5 ml-6">
                  {wrongCount > 0 ? `${wrongCount} domande da ripassare` : 'Nessun errore registrato ancora'}
                </div>
              </button>
            </div>

            {mode === 'unseen' && unseenCount && unseenCount.total > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>Progresso domande</span>
                  <span className="font-semibold text-[rgb(32,44,71)]">
                    {unseenCount.total - unseenCount.unseen}/{unseenCount.total} viste
                  </span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[rgb(32,44,71)] to-[rgb(99,130,201)]"
                    style={{ width: `${Math.round(((unseenCount.total - unseenCount.unseen) / unseenCount.total) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-400">{unseenCount.unseen} da vedere</span>
                  <span className="text-emerald-600 font-medium">
                    {Math.round(((unseenCount.total - unseenCount.unseen) / unseenCount.total) * 100)}% completato
                  </span>
                </div>
              </div>
            )}

            {mode === 'unseen' && unseenCount?.unseen === 0 && (
              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center justify-center gap-2">
                <Icon name="check" className="w-4 h-4 flex-shrink-0" />Hai visto tutte le domande! Passa alla modalità "Tutte" per ripassare.
              </div>
            )}

            {mode === 'wrong' && wrongCount === 0 && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700 text-center">
                Non hai ancora errori registrati. Fai prima una sessione di esercitazione!
              </div>
            )}
            {mode === 'wrong' && wrongCount > 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700 space-y-1">
                <p>Le domande più sbagliate vengono prima.</p>
                <p>Puoi cliccare <strong>"La so!"</strong> per rimuoverle subito, oppure spariscono da sole dopo <strong>5 risposte corrette di fila</strong>.</p>
              </div>
            )}
          </Card>

          {!isWrongMode && (
            <>
              <Card>
                <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">2 · Scegli le macro-aree</h3>
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
                  <h3 className="font-semibold text-[rgb(32,44,71)] mb-1 text-sm">3 · Filtra per argomento <span className="font-normal text-gray-400">(opzionale)</span></h3>
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
            </>
          )}

          {(!isWrongMode ? selAreas.length > 0 : wrongCount > 0) && (
  <Card>
    <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">
      {isWrongMode ? '2' : availTopics.length > 0 ? '4' : '3'} · Numero di domande:
      <span className={`ml-1 ${isWrongMode ? 'text-red-500' : 'text-[rgb(99,130,201)]'}`}>{Math.min(count, maxQ || 5)}</span>
    </h3>
    <input type="range" min={5} max={maxQ || 5} value={Math.min(count, maxQ || 5)}
      onChange={e => setCount(+e.target.value)}
      className={`w-full ${isWrongMode ? 'accent-red-500' : 'accent-[rgb(32,44,71)]'}`} />
    <div className="flex justify-between text-xs text-gray-400 mt-1">
      <span>5</span>
      <span>Disponibili: {isWrongMode ? wrongCount : mode === 'unseen' ? (unseenCount?.unseen ?? pool.length) : pool.length}</span>
      <span>{maxQ || 5}</span>
    </div>
  </Card>
)}

          <button onClick={startQuiz} disabled={!canStart}
            className={`w-full py-3 text-base rounded-xl font-semibold transition-all disabled:opacity-40 flex items-center justify-center gap-2 ${isWrongMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'btn-primary'}`}>
            {isWrongMode && <Icon name="refresh" className="w-4 h-4" />}
            {isWrongMode ? 'Inizia ripasso errori' : 'Inizia esercitazione'}
            <Icon name="arrow-right" className="w-4 h-4" />
          </button>
        </div>
      </PageShell>
    );
  }

  // ── QUIZ PHASE ───────────────────────────────────────────────────────────────
  if (phase === 'quiz') {
    const rawQ = prepareQuestion(quizQs[cur]);
    const displayOpts: string[] = (rawQ as any)._sopts;
    const shuffledCorrect: number[] = (rawQ as any)._scorrect;
    const allowMultiple = course.exam_rules.allow_multiple_correct;

    const wrongEntry = mode === 'wrong' ? wrongDataMap[rawQ.id] : null;
    const timesWrong = wrongEntry?.wrong_count ?? 0;
    const consecutiveCorrect = wrongEntry?.consecutive_correct ?? 0;
    const alreadyMasteredThisSession = masteredThisSession.has(rawQ.id);

    const pick = (idx: number) => {
      if (answered) return;
      if (allowMultiple) {
        setSel(s => s.includes(idx) ? s.filter(i => i !== idx) : [...s, idx]);
      } else {
        setSel([idx]);
        setTimeout(() => setAnswered(true), 150);
      }
    };

    const isCorrect = () =>
      sel.length === shuffledCorrect.length && sel.every(i => shuffledCorrect.includes(i));

    const handleMastered = async () => {
      if (!user) return;
      await markQuestionMastered(user.id, rawQ.id);
      setMasteredThisSession(prev => new Set(Array.from(prev).concat(rawQ.id)));
      setWrongCount(c => Math.max(0, c - 1));
    };

    const next = async () => {
      const c = isCorrect();
      const entry = { question: rawQ, correct: c };
      const newLog = [...log, entry];
      setLog(newLog);

      if (cur === quizQs.length - 1) {
        if (user) {
          await recordQuizAnswers(user.id, courseId, newLog);
          await markQuestionsSeen(user.id, courseId, quizQs.map(q => q.id));
          const uc = await countUnseenQuestions(user.id, courseId);
          setUnseenCount(uc);
          const wc = await countWrongQuestions(user.id, courseId);
          setWrongCount(wc);
        }
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
            {mode === 'wrong' && timesWrong > 0 && (
              <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                <Icon name="x" className="w-3 h-3" />Sbagliata {timesWrong} {timesWrong === 1 ? 'volta' : 'volte'}
              </span>
            )}
            {mode === 'wrong' && consecutiveCorrect > 0 && !alreadyMasteredThisSession && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                <Icon name="check" className="w-3 h-3" />{consecutiveCorrect}/{MASTERY_THRESHOLD} corrette di fila
              </span>
            )}
            {alreadyMasteredThisSession && (
              <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-medium">
                <Icon name="trophy" className="w-3 h-3" />Rimossa dall'archivio errori
              </span>
            )}
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2.5 py-1 rounded-full font-medium">{rawQ.macro_area_name}</span>
            <span className="text-xs text-gray-400">{rawQ.topic_name}</span>
          </div>

          <Card><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{rawQ.question_text}</p></Card>
          {allowMultiple && !answered && <p className="text-xs text-amber-600 font-medium flex items-center gap-1.5"><Icon name="alert" className="w-3.5 h-3.5" />Possono esserci più risposte corrette</p>}

          <div className="space-y-2">
            {displayOpts.map((opt: string, idx: number) => {
              const isCorr = shuffledCorrect.includes(idx);
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
            <button onClick={() => setAnswered(true)} className="btn-primary w-full">Conferma risposta</button>
          )}

          {answered && (
            <>
              <div className={`p-3.5 rounded-xl text-sm font-medium border ${isCorrect() ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'}`}>
                <div className="flex items-start gap-2">
                  <Icon name={isCorrect() ? 'check' : 'x'} className="w-4 h-4 mt-0.5 flex-shrink-0" strokeWidth={2.4} />
                  <span>{isCorrect() ? 'Risposta corretta!' : <>Risposta errata. <span className="font-semibold">Corretta/e: {shuffledCorrect.map(i => displayOpts[i]).join(', ')}</span></>}</span>
                </div>
                {rawQ.explanation && <p className="mt-1 text-xs opacity-80 ml-6">{rawQ.explanation}</p>}
              </div>

              {/* Pulsante "La so!" — visibile solo in modalità errori, solo se corretta, solo se non già rimossa */}
              {mode === 'wrong' && isCorrect() && !alreadyMasteredThisSession && (
                <button onClick={handleMastered}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-emerald-400 bg-emerald-50 text-emerald-700 font-semibold text-sm hover:bg-emerald-100 transition-all">
                  <Icon name="check" className="w-4 h-4" />La so! Rimuovi dall'archivio errori
                </button>
              )}

              <div className="flex gap-2">
                <button onClick={next} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {cur === quizQs.length - 1 ? 'Vedi risultati' : <>Prossima <Icon name="arrow-right" className="w-4 h-4" /></>}
                </button>
                <button onClick={() => setShowReport(true)} className="btn-secondary px-3 flex items-center justify-center" title="Segnala un problema"><Icon name="flag" className="w-4 h-4" /></button>
              </div>
            </>
          )}

          {showReport && (
            <Modal title="Segnala un problema" onClose={() => { setShowReport(false); setReportNote(''); setReportSent(false); }}>
              {reportSent ? (
                <div className="text-center py-4">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" className="h-6 w-6" strokeWidth={2.4} /></div>
                  <p className="font-medium text-emerald-700">Segnalazione inviata!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">Descrivi il problema con questa domanda (opzionale):</p>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl p-3 text-base resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                    rows={3} value={reportNote} onChange={e => setReportNote(e.target.value)}
                    placeholder="Es: la risposta corretta mi sembra sbagliata…"
                  />
                  <button onClick={async () => {
                    if (!user) return;
                    const correct = shuffledCorrect.map(i => displayOpts[i]).join(', ');
                    const selected = sel.map(i => displayOpts[i]).join(', ');
                    await submitReport({
                      question_id: rawQ.id, user_id: user.id,
                      question_text: rawQ.question_text,
                      selected_answer: selected, correct_answer: correct,
                      note: reportNote,
                    });
                    setReportSent(true);
                  }} className="btn-primary w-full">Invia segnalazione</button>
                </div>
              )}
            </Modal>
          )}
        </div>
      </PageShell>
    );
  }

  // ── RESULTS PHASE ─────────────────────────────────────────────────────────────
  const correct = log.filter(e => e.correct).length;
  const pct = Math.round((correct / quizQs.length) * 100);
  const masteredCount = masteredThisSession.size;

  return (
    <PageShell courseName={course.name}>
      <div className="max-w-xl mx-auto px-4">
        <Card className="text-center space-y-2">
          <div className={`mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl ${pct >= 70 ? 'bg-emerald-50 text-emerald-600' : pct >= 50 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
            <Icon name={pct >= 70 ? 'trophy' : pct >= 50 ? 'zap' : 'refresh'} className="h-8 w-8" strokeWidth={2} />
          </div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">
            {mode === 'wrong' ? 'Ripasso completato!' : 'Esercitazione completata!'}
          </h2>
          <div className="mt-4 p-5 bg-[rgb(240,242,247)] rounded-2xl">
            <div className="text-5xl font-bold text-[rgb(32,44,71)]">{correct}<span className="text-2xl text-gray-400">/{quizQs.length}</span></div>
            <div className="text-gray-500 text-sm mt-1">{pct}% di risposte corrette</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-xl"><div className="text-2xl font-bold text-emerald-600">{correct}</div><div className="text-xs text-emerald-600 mt-0.5">Corrette</div></div>
            <div className="p-3 bg-red-50 rounded-xl"><div className="text-2xl font-bold text-red-500">{quizQs.length - correct}</div><div className="text-xs text-red-500 mt-0.5">Errate</div></div>
          </div>

          {/* Riepilogo ripasso errori */}
          {mode === 'wrong' && masteredCount > 0 && (
            <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center justify-center gap-2">
              <Icon name="trophy" className="w-4 h-4 flex-shrink-0" />Hai rimosso <span className="font-semibold">{masteredCount}</span> {masteredCount === 1 ? 'domanda' : 'domande'} dall'archivio errori!
            </div>
          )}
          {mode === 'wrong' && wrongCount > 0 && (
            <div className="mt-2 p-3 bg-red-50 rounded-xl text-sm text-red-700">
              Hai ancora <span className="font-semibold">{wrongCount}</span> {wrongCount === 1 ? 'domanda' : 'domande'} da ripassare.
            </div>
          )}
          {mode === 'wrong' && wrongCount === 0 && (
            <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium flex items-center justify-center gap-2">
              <Icon name="check" className="w-4 h-4 flex-shrink-0" />Archivio errori vuoto! Ottimo lavoro!
            </div>
          )}

          {unseenCount && mode !== 'wrong' && (
            <div className="mt-4 p-3 bg-blue-50 rounded-xl text-sm text-blue-700">
              <span className="font-semibold">{unseenCount.unseen}</span> domande ancora da vedere su {unseenCount.total} totali
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <button onClick={() => setPhase('setup')} className="btn-secondary flex-1 text-sm">
              {mode === 'wrong' ? 'Altro ripasso' : 'Altra sessione'}
            </button>
            <button onClick={() => router.push(`/course/${courseId}`)} className="btn-primary flex-1 text-sm">Dashboard</button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
