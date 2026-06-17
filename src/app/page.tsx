'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { questions, MACRO_AREAS, TOPICS_BY_MACRO, getRandomQuestions, getExamQuestions, MacroArea, Question } from '@/data/questions';

// ─── Types ───────────────────────────────────────────────────────────────────

type View = 'login' | 'dashboard' | 'quiz_setup' | 'quiz' | 'exam_setup' | 'exam' | 'profile';

interface UserData {
  username: string;
  displayName: string;
}

interface TopicStat {
  correct: number;
  total: number;
}

interface ExamRecord {
  date: string;
  scoreIn30: number;
  correct: number;
  wrong: number;
  omitted: number;
  duration: number;
}

interface Stats {
  topicStats: Record<string, TopicStat>;
  macroStats: Record<string, TopicStat>;
  examHistory: ExamRecord[];
  totalQuestions: number;
  totalCorrect: number;
}

const DEMO_CREDENTIALS = [
  { user: 'studente', pass: 'medicina2024' },
  { user: 'admin', pass: 'admin123' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function getStatsKey(username: string) { return `medquiz_stats_${username}`; }
function loadStats(username: string): Stats {
  if (typeof window === 'undefined') return { topicStats: {}, macroStats: {}, examHistory: [], totalQuestions: 0, totalCorrect: 0 };
  const raw = localStorage.getItem(getStatsKey(username));
  if (!raw) return { topicStats: {}, macroStats: {}, examHistory: [], totalQuestions: 0, totalCorrect: 0 };
  return JSON.parse(raw);
}
function saveStats(username: string, stats: Stats) {
  localStorage.setItem(getStatsKey(username), JSON.stringify(stats));
}

function recordAnswers(username: string, answers: { question: Question; correct: boolean }[]) {
  const stats = loadStats(username);
  answers.forEach(({ question, correct }) => {
    // topic
    if (!stats.topicStats[question.topic]) stats.topicStats[question.topic] = { correct: 0, total: 0 };
    stats.topicStats[question.topic].total++;
    if (correct) stats.topicStats[question.topic].correct++;
    // macro
    const macro = question.macroArea;
    if (!stats.macroStats[macro]) stats.macroStats[macro] = { correct: 0, total: 0 };
    stats.macroStats[macro].total++;
    if (correct) stats.macroStats[macro].correct++;
    // totals
    stats.totalQuestions++;
    if (correct) stats.totalCorrect++;
  });
  saveStats(username, stats);
}

function recordExam(username: string, record: ExamRecord) {
  const stats = loadStats(username);
  stats.examHistory.unshift(record);
  saveStats(username, stats);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoginView({ onLogin }: { onLogin: (user: UserData) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTimeout(() => {
      const match = DEMO_CREDENTIALS.find(c => c.user === username.toLowerCase() && c.pass === password);
      if (match) {
        onLogin({ username: match.user, displayName: username.charAt(0).toUpperCase() + username.slice(1) });
      } else {
        setError('Credenziali errate. Prova: studente / medicina2024');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        {/* Logo area */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">MedQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Preparazione Esame Universitario</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-6">Accedi al tuo account</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] focus:border-transparent"
                placeholder="es. studente"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] focus:border-transparent"
                placeholder="••••••••"
                required
              />
            </div>
            <button type="submit" disabled={loading} className="btn-navy w-full mt-2">
              {loading ? 'Accesso in corso...' : 'Accedi'}
            </button>
          </form>

          <div className="mt-4 p-3 bg-[rgb(240,242,247)] rounded-lg text-xs text-gray-600">
            <p className="font-medium mb-1">Credenziali demo:</p>
            <p>👤 studente / medicina2024</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────────────

function DashboardView({ user, stats, onNavigate }: { user: UserData; stats: Stats; onNavigate: (v: View) => void }) {
  const accuracy = stats.totalQuestions > 0 ? Math.round((stats.totalCorrect / stats.totalQuestions) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Welcome */}
      <div className="bg-[rgb(32,44,71)] rounded-2xl p-6 text-white">
        <h2 className="text-2xl font-bold">Ciao, {user.displayName}! 👋</h2>
        <p className="text-blue-200 mt-1 text-sm">Pronto per esercitarti?</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            <div className="text-xs text-blue-200 mt-1">Domande svolte</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs text-blue-200 mt-1">Accuratezza</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{stats.examHistory.length}</div>
            <div className="text-xs text-blue-200 mt-1">Esami simulati</div>
          </div>
        </div>
      </div>

      {/* Main actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button onClick={() => onNavigate('quiz_setup')} className="card text-left hover:shadow-md hover:border-[rgb(32,44,71)] border transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-200 transition-colors">
              <svg className="w-6 h-6 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(32,44,71)] text-lg">Esercitazione</h3>
              <p className="text-gray-500 text-sm mt-1">Scegli argomenti e numero di domande. La risposta corretta viene mostrata subito.</p>
            </div>
          </div>
        </button>

        <button onClick={() => onNavigate('exam_setup')} className="card text-left hover:shadow-md hover:border-[rgb(32,44,71)] border transition-all group cursor-pointer">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
              <svg className="w-6 h-6 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(32,44,71)] text-lg">Simulazione Esame</h3>
              <p className="text-gray-500 text-sm mt-1">30 domande, 45 minuti. Punteggio: +1 corretta, -0.2 errata, 0 omessa.</p>
            </div>
          </div>
        </button>

        <button onClick={() => onNavigate('profile')} className="card text-left hover:shadow-md hover:border-[rgb(32,44,71)] border transition-all group cursor-pointer md:col-span-2">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
              <svg className="w-6 h-6 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[rgb(32,44,71)] text-lg">Il mio profilo</h3>
              <p className="text-gray-500 text-sm mt-1">Visualizza le tue statistiche, i punti di forza e le aree da migliorare. Ripassa in modo mirato.</p>
            </div>
          </div>
        </button>
      </div>

      {/* Quick stats by macro area */}
      {stats.totalQuestions > 0 && (
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-4">Progressi per materia</h3>
          <div className="space-y-3">
            {Object.entries(MACRO_AREAS).map(([key, val]) => {
              const s = stats.macroStats[key] || { correct: 0, total: 0 };
              const pct = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
              return (
                <div key={key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{val.label}</span>
                    <span className="text-gray-500">{s.correct}/{s.total} ({pct}%)</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444'
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Setup ───────────────────────────────────────────────────────────────

function QuizSetupView({ onStart, onBack }: { onStart: (qs: Question[]) => void; onBack: () => void }) {
  const [selectedMacros, setSelectedMacros] = useState<MacroArea[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(10);
  const [error, setError] = useState('');

  const toggleMacro = (m: MacroArea) => {
    if (selectedMacros.includes(m)) {
      setSelectedMacros(selectedMacros.filter(x => x !== m));
      const topicsToRemove = TOPICS_BY_MACRO[m];
      setSelectedTopics(selectedTopics.filter(t => !topicsToRemove.includes(t)));
    } else {
      setSelectedMacros([...selectedMacros, m]);
    }
  };

  const toggleTopic = (t: string) => {
    setSelectedTopics(selectedTopics.includes(t) ? selectedTopics.filter(x => x !== t) : [...selectedTopics, t]);
  };

  const availableTopics = selectedMacros.flatMap(m => TOPICS_BY_MACRO[m]);
  const maxQ = questions.filter(q =>
    selectedMacros.includes(q.macroArea) &&
    (selectedTopics.length === 0 || selectedTopics.includes(q.topic))
  ).length;

  const handleStart = () => {
    if (selectedMacros.length === 0) { setError('Seleziona almeno una macro-area.'); return; }
    const pool = selectedTopics.length > 0
      ? questions.filter(q => selectedMacros.includes(q.macroArea) && selectedTopics.includes(q.topic))
      : questions.filter(q => selectedMacros.includes(q.macroArea));
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, questionCount);
    if (shuffled.length === 0) { setError('Nessuna domanda disponibile per la selezione corrente.'); return; }
    onStart(shuffled);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Configura Esercitazione</h2>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      {/* Macro areas */}
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3">1. Scegli le macro-aree</h3>
        <div className="grid grid-cols-1 gap-2">
          {(Object.entries(MACRO_AREAS) as [MacroArea, typeof MACRO_AREAS[MacroArea]][]).map(([key, val]) => {
            const count = questions.filter(q => q.macroArea === key).length;
            const active = selectedMacros.includes(key);
            return (
              <button
                key={key}
                onClick={() => toggleMacro(key)}
                className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all text-left ${active ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300'}`}
              >
                <span className={`font-medium text-sm ${active ? 'text-[rgb(32,44,71)]' : 'text-gray-700'}`}>{val.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">{count} domande</span>
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-[rgb(32,44,71)] border-[rgb(32,44,71)]' : 'border-gray-300'}`}>
                    {active && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Topics */}
      {availableTopics.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-1">2. Filtra per argomento <span className="font-normal text-gray-500 text-sm">(opzionale)</span></h3>
          <p className="text-xs text-gray-500 mb-3">Se non selezioni nulla, verranno inclusi tutti gli argomenti.</p>
          <div className="grid grid-cols-1 gap-1.5">
            {availableTopics.map(topic => {
              const active = selectedTopics.includes(topic);
              const count = questions.filter(q => q.topic === topic).length;
              return (
                <button
                  key={topic}
                  onClick={() => toggleTopic(topic)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${active ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <span className={`text-sm ${active ? 'font-medium text-[rgb(32,44,71)]' : 'text-gray-600'}`}>{topic}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{count}</span>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${active ? 'bg-[rgb(32,44,71)] border-[rgb(32,44,71)]' : 'border-gray-300'}`}>
                      {active && <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Count */}
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3">3. Numero di domande: <span className="text-[rgb(52,69,110)]">{questionCount}</span></h3>
        <input
          type="range"
          min={5}
          max={Math.min(maxQ || 5, 50)}
          value={Math.min(questionCount, maxQ || 5)}
          onChange={e => setQuestionCount(Number(e.target.value))}
          className="w-full accent-[rgb(32,44,71)]"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>5</span>
          <span className="text-gray-400">Disponibili: {maxQ}</span>
          <span>{Math.min(maxQ || 5, 50)}</span>
        </div>
      </div>

      <button onClick={handleStart} className="btn-navy w-full text-base py-3">
        Inizia esercitazione →
      </button>
    </div>
  );
}

// ─── Quiz View (practice mode) ────────────────────────────────────────────────

function QuizView({ questions: qs, user, onEnd }: { questions: Question[]; user: UserData; onEnd: () => void }) {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<{ question: Question; selected: number | null; correct: boolean }[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const q = qs[current];
  const isLast = current === qs.length - 1;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
  };

  const handleNext = () => {
    const result = { question: q, selected, correct: selected === q.correctAnswer };
    const newResults = [...results, result];
    setResults(newResults);
    if (isLast) {
      recordAnswers(user.username, newResults.map(r => ({ question: r.question, correct: r.correct })));
      setShowSummary(true);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
    }
  };

  if (showSummary) {
    const correct = results.filter(r => r.correct).length;
    const pct = Math.round((correct / qs.length) * 100);
    return (
      <div className="max-w-xl mx-auto p-4 md:p-6">
        <div className="card text-center">
          <div className="text-5xl mb-3">{pct >= 70 ? '🎉' : pct >= 50 ? '👍' : '📚'}</div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Esercitazione completata!</h2>
          <div className="mt-4 p-4 bg-[rgb(240,242,247)] rounded-xl">
            <div className="text-4xl font-bold text-[rgb(32,44,71)]">{correct}/{qs.length}</div>
            <div className="text-gray-500 text-sm mt-1">{pct}% di risposte corrette</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-xl font-bold text-emerald-700">{correct}</div>
              <div className="text-xs text-emerald-600">Corrette</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-700">{qs.length - correct}</div>
              <div className="text-xs text-red-600">Errate</div>
            </div>
          </div>
          <button onClick={onEnd} className="btn-navy w-full mt-5">Torna alla dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-[rgb(32,44,71)]">Domanda {current + 1} di {qs.length}</span>
        <span className={`text-xs px-2 py-1 rounded-full font-medium ${MACRO_AREAS[q.macroArea].bgColor} ${MACRO_AREAS[q.macroArea].color}`}>
          {MACRO_AREAS[q.macroArea].label}
        </span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full bg-[rgb(32,44,71)] rounded-full transition-all duration-300" style={{ width: `${((current) / qs.length) * 100}%` }} />
      </div>

      {/* Topic badge */}
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{q.topic}</div>

      {/* Question */}
      <div className="card">
        <p className="text-[rgb(32,44,71)] font-medium leading-relaxed text-base">{q.question}</p>
      </div>

      {/* Options */}
      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let cls = 'option-btn';
          if (answered) {
            cls += ' disabled';
            if (idx === q.correctAnswer) cls += ' correct-reveal';
            else if (idx === selected && selected !== q.correctAnswer) cls += ' wrong';
          } else if (selected === idx) {
            cls += ' selected';
          }
          return (
            <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={answered}>
              <span className="font-semibold mr-2 text-gray-400">{String.fromCharCode(65 + idx)}.</span>
              {opt}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className={`p-3 rounded-lg text-sm font-medium ${selected === q.correctAnswer ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {selected === q.correctAnswer ? '✅ Risposta corretta!' : `❌ Risposta errata. La risposta corretta è: ${q.options[q.correctAnswer]}`}
        </div>
      )}

      {answered && (
        <button onClick={handleNext} className="btn-navy w-full">
          {isLast ? 'Vedi risultati' : 'Prossima domanda →'}
        </button>
      )}
    </div>
  );
}

// ─── Exam View ────────────────────────────────────────────────────────────────

const EXAM_TIME = 45 * 60; // 45 minutes in seconds

function ExamView({ user, onEnd }: { user: UserData; onEnd: () => void }) {
  const examQs = useRef<Question[]>(getExamQuestions());
  const qs = examQs.current;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(qs.length).fill(null));
  const [timeLeft, setTimeLeft] = useState(EXAM_TIME);
  const [showResults, setShowResults] = useState(false);
  const [startTime] = useState(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          submitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const submitExam = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setShowResults(true);
  }, []);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers];
    newAnswers[current] = idx;
    setAnswers(newAnswers);
  };

  const calcResults = () => {
    let correct = 0, wrong = 0, omitted = 0;
    answers.forEach((a, i) => {
      if (a === null) omitted++;
      else if (a === qs[i].correctAnswer) correct++;
      else wrong++;
    });
    const score = correct * 1 + wrong * (-0.2);
    const maxScore = qs.length;
    const scoreIn30 = Math.max(0, Math.round((score / maxScore) * 30 * 10) / 10);
    return { correct, wrong, omitted, score, maxScore, scoreIn30 };
  };

  useEffect(() => {
    if (showResults) {
      const r = calcResults();
      const duration = Math.round((Date.now() - startTime) / 1000);
      recordAnswers(user.username, answers.map((a, i) => ({
        question: qs[i],
        correct: a === qs[i].correctAnswer,
      })));
      recordExam(user.username, {
        date: new Date().toLocaleDateString('it-IT'),
        scoreIn30: r.scoreIn30,
        correct: r.correct,
        wrong: r.wrong,
        omitted: r.omitted,
        duration,
      });
    }
  }, [showResults]);

  if (showResults) {
    const r = calcResults();
    const duration = Math.round((Date.now() - startTime) / 1000);
    return (
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
        <div className="card text-center">
          <div className="text-5xl mb-3">{r.scoreIn30 >= 24 ? '🏆' : r.scoreIn30 >= 18 ? '🎓' : '📚'}</div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Esame completato!</h2>

          <div className="mt-4 p-6 bg-[rgb(32,44,71)] rounded-xl text-white">
            <div className="text-5xl font-bold">{r.scoreIn30}</div>
            <div className="text-blue-200 text-sm mt-1">su 30</div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <div className="text-xl font-bold text-emerald-700">{r.correct}</div>
              <div className="text-xs text-emerald-600">Corrette (+{r.correct})</div>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-700">{r.wrong}</div>
              <div className="text-xs text-red-600">Errate ({(r.wrong * -0.2).toFixed(1)})</div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-700">{r.omitted}</div>
              <div className="text-xs text-gray-500">Omesse (0)</div>
            </div>
          </div>

          <div className="mt-3 text-sm text-gray-500">
            Punteggio grezzo: {r.score.toFixed(1)} / {r.maxScore} &nbsp;·&nbsp; Durata: {formatTime(duration)}
          </div>

          {/* Per-question review */}
          <div className="mt-5 text-left">
            <h3 className="font-semibold text-[rgb(32,44,71)] mb-3">Revisione risposte</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {qs.map((q, i) => {
                const a = answers[i];
                const isCorrect = a === q.correctAnswer;
                const isOmitted = a === null;
                return (
                  <div key={q.id} className={`p-3 rounded-lg border text-sm ${isCorrect ? 'bg-emerald-50 border-emerald-200' : isOmitted ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="font-medium text-gray-800 mb-1">D{i + 1}. {q.question.slice(0, 80)}…</div>
                    {!isCorrect && !isOmitted && (
                      <div className="text-xs text-red-700">Tua risposta: {q.options[a!]}</div>
                    )}
                    {!isCorrect && (
                      <div className="text-xs text-emerald-700 mt-0.5">✓ Corretta: {q.options[q.correctAnswer]}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={onEnd} className="btn-navy w-full mt-5">Torna alla dashboard</button>
        </div>
      </div>
    );
  }

  const q = qs[current];
  const timeWarning = timeLeft < 300;

  return (
    <div className="flex h-screen overflow-hidden bg-[rgb(240,242,247)]">
      {/* Sidebar */}
      <div className="w-56 flex-shrink-0 bg-[rgb(32,44,71)] flex flex-col hidden md:flex">
        <div className="p-4 border-b border-white/10">
          <div className={`text-2xl font-bold ${timeWarning ? 'text-red-400' : 'text-white'}`}>{formatTime(timeLeft)}</div>
          <div className="text-blue-200 text-xs mt-0.5">Tempo rimanente</div>
        </div>

        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-xs text-blue-200 uppercase tracking-wide mb-2 font-medium">Domande</div>
          <div className="grid grid-cols-4 gap-1.5">
            {qs.map((_, i) => {
              const a = answers[i];
              const isCurr = i === current;
              let cls = 'q-dot ';
              if (isCurr) cls += 'q-dot-current';
              else if (a !== null) cls += 'q-dot-answered';
              else cls += 'q-dot-unanswered';
              return (
                <button key={i} className={cls} onClick={() => setCurrent(i)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-3 border-t border-white/10">
          <div className="text-xs text-blue-200 mb-2">
            Risposte: {answers.filter(a => a !== null).length}/{qs.length}
          </div>
          <button onClick={submitExam} className="w-full py-2 bg-white text-[rgb(32,44,71)] rounded-lg font-semibold text-sm hover:bg-blue-50 transition-colors">
            Consegna esame
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden bg-[rgb(32,44,71)] px-4 py-3 flex items-center justify-between">
          <span className={`text-lg font-bold ${timeWarning ? 'text-red-400' : 'text-white'}`}>{formatTime(timeLeft)}</span>
          <span className="text-blue-200 text-sm">D{current + 1}/{qs.length}</span>
          <button onClick={submitExam} className="bg-white text-[rgb(32,44,71)] rounded-lg px-3 py-1.5 font-semibold text-xs">
            Consegna
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-500">Domanda {current + 1} di {qs.length}</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${MACRO_AREAS[q.macroArea].bgColor} ${MACRO_AREAS[q.macroArea].color}`}>
                {MACRO_AREAS[q.macroArea].label}
              </span>
            </div>

            <div className="card">
              <p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-2">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`option-btn ${answers[current] === idx ? 'selected' : ''}`}
                  onClick={() => handleAnswer(idx)}
                >
                  <span className="font-semibold mr-2 text-gray-400">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0} className="btn-outline flex-1 disabled:opacity-40">
                ← Precedente
              </button>
              <button onClick={() => setCurrent(c => Math.min(qs.length - 1, c + 1))} disabled={current === qs.length - 1} className="btn-navy flex-1 disabled:opacity-40">
                Successiva →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Exam Setup ───────────────────────────────────────────────────────────────

function ExamSetupView({ onStart, onBack }: { onStart: () => void; onBack: () => void }) {
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Simulazione Esame</h2>
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold text-[rgb(32,44,71)]">Regole dell'esame</h3>
        <div className="space-y-2 text-sm text-gray-700">
          {[
            ['📝', '30 domande totali a scelta multipla (5 opzioni)'],
            ['⏱️', '45 minuti di tempo massimo'],
            ['✅', '+1 punto per risposta corretta'],
            ['❌', '-0,2 punti per risposta errata'],
            ['⬜', '0 punti per risposta omessa'],
            ['🏛️', 'Distribuzione: 12 Igiene + 12 Med. Legale + 3 Med. Lavoro + 3 Econ. Sanitaria'],
            ['🔀', 'Possibilità di navigare avanti e indietro tra le domande'],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-start gap-2">
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
          ⚠️ Una volta avviata la simulazione, il timer partirà immediatamente. L'esame si concluderà automaticamente allo scadere del tempo.
        </div>
      </div>

      <button onClick={onStart} className="btn-navy w-full text-base py-3">
        Inizia simulazione →
      </button>
    </div>
  );
}

// ─── Profile View ─────────────────────────────────────────────────────────────

function ProfileView({ user, stats, onBack, onNavigate }: {
  user: UserData;
  stats: Stats;
  onBack: () => void;
  onNavigate: (v: View, data?: Question[]) => void;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const freshStats = loadStats(user.username);

  const topicEntries = Object.entries(freshStats.topicStats).map(([topic, s]) => ({
    topic,
    ...s,
    pct: s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
  })).sort((a, b) => a.pct - b.pct);

  const weak = topicEntries.filter(t => t.pct < 60 && t.total >= 2);
  const strong = topicEntries.filter(t => t.pct >= 70 && t.total >= 2);

  const handlePracticeWeak = (topic: string) => {
    const qs = questions.filter(q => q.topic === topic).sort(() => Math.random() - 0.5).slice(0, 15);
    onNavigate('quiz', qs);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Il mio profilo</h2>
      </div>

      {/* Overview */}
      <div className="card bg-[rgb(32,44,71)] text-white">
        <h3 className="font-semibold mb-3 text-blue-200">Riepilogo generale</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{freshStats.totalQuestions}</div>
            <div className="text-xs text-blue-200 mt-1">Tot. domande</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{freshStats.totalQuestions > 0 ? Math.round((freshStats.totalCorrect / freshStats.totalQuestions) * 100) : 0}%</div>
            <div className="text-xs text-blue-200 mt-1">Accuratezza</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{freshStats.examHistory.length}</div>
            <div className="text-xs text-blue-200 mt-1">Esami svolti</div>
          </div>
        </div>
      </div>

      {/* Weak areas */}
      {weak.length > 0 && (
        <div className="card border-red-200 border">
          <h3 className="font-semibold text-red-700 mb-3">📉 Argomenti da migliorare</h3>
          <div className="space-y-3">
            {weak.map(t => (
              <div key={t.topic} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700 truncate">{t.topic}</span>
                    <span className="text-red-600 font-medium ml-2 flex-shrink-0">{t.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
                <button
                  onClick={() => handlePracticeWeak(t.topic)}
                  className="flex-shrink-0 text-xs bg-red-100 text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-200 transition-colors"
                >
                  Ripassa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strong areas */}
      {strong.length > 0 && (
        <div className="card border-emerald-200 border">
          <h3 className="font-semibold text-emerald-700 mb-3">💪 Punti di forza</h3>
          <div className="space-y-2">
            {strong.map(t => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-gray-700">{t.topic}</span>
                  <span className="text-emerald-600 font-medium">{t.pct}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All topics */}
      {topicEntries.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3">Tutti gli argomenti</h3>
          <div className="space-y-2">
            {topicEntries.map(t => (
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{t.topic}</span>
                  <span className="text-gray-500">{t.correct}/{t.total} ({t.pct}%)</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${t.pct}%`,
                      backgroundColor: t.pct >= 70 ? '#10b981' : t.pct >= 50 ? '#f59e0b' : '#ef4444'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam history */}
      {freshStats.examHistory.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3">Storico esami simulati</h3>
          <div className="space-y-2">
            {freshStats.examHistory.slice(0, 10).map((e, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-[rgb(240,242,247)] rounded-lg text-sm">
                <div>
                  <div className="font-medium text-[rgb(32,44,71)]">{e.date}</div>
                  <div className="text-xs text-gray-500 mt-0.5">✅ {e.correct} &nbsp;❌ {e.wrong} &nbsp;⬜ {e.omitted} &nbsp;⏱️ {formatTime(e.duration)}</div>
                </div>
                <div className={`text-xl font-bold ${e.scoreIn30 >= 24 ? 'text-emerald-600' : e.scoreIn30 >= 18 ? 'text-amber-600' : 'text-red-600'}`}>
                  {e.scoreIn30}/30
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {topicEntries.length === 0 && freshStats.examHistory.length === 0 && (
        <div className="card text-center text-gray-500 py-8">
          <div className="text-4xl mb-3">📊</div>
          <p>Nessuna statistica ancora.<br />Inizia un'esercitazione o una simulazione!</p>
        </div>
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<View>('login');
  const [user, setUser] = useState<UserData | null>(null);
  const [stats, setStats] = useState<Stats>({ topicStats: {}, macroStats: {}, examHistory: [], totalQuestions: 0, totalCorrect: 0 });
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);

  const refreshStats = useCallback(() => {
    if (user) setStats(loadStats(user.username));
  }, [user]);

  const handleLogin = (u: UserData) => {
    setUser(u);
    setStats(loadStats(u.username));
    setView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
  };

  const navigate = (v: View, data?: Question[]) => {
    if (data) setQuizQuestions(data);
    if (v === 'dashboard') refreshStats();
    setView(v);
  };

  // Nav wrapper
  const withNav = (content: React.ReactNode) => (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <nav className="bg-[rgb(32,44,71)] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => navigate('dashboard')} className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          MedQuiz
        </button>
        <div className="flex items-center gap-3">
          <span className="text-blue-200 text-sm hidden sm:block">{user?.displayName}</span>
          <button onClick={handleLogout} className="text-blue-200 hover:text-white text-sm transition-colors">
            Esci
          </button>
        </div>
      </nav>
      <div className="flex-1 py-4">{content}</div>
    </div>
  );

  if (view === 'login') return <LoginView onLogin={handleLogin} />;
  if (!user) return <LoginView onLogin={handleLogin} />;

  if (view === 'exam') {
    return withNav(
      <ExamView user={user} onEnd={() => navigate('dashboard')} />
    );
  }

  if (view === 'quiz' && quizQuestions.length > 0) {
    return withNav(
      <QuizView questions={quizQuestions} user={user} onEnd={() => navigate('dashboard')} />
    );
  }

  if (view === 'quiz_setup') {
    return withNav(
      <QuizSetupView onStart={(qs) => { setQuizQuestions(qs); setView('quiz'); }} onBack={() => navigate('dashboard')} />
    );
  }

  if (view === 'exam_setup') {
    return withNav(
      <ExamSetupView onStart={() => setView('exam')} onBack={() => navigate('dashboard')} />
    );
  }

  if (view === 'profile') {
    return withNav(
      <ProfileView user={user} stats={stats} onBack={() => navigate('dashboard')} onNavigate={(v, data) => navigate(v, data)} />
    );
  }

  return withNav(
    <DashboardView user={user} stats={stats} onNavigate={(v) => navigate(v)} />
  );
}
