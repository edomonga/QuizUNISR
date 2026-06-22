'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell, Card, Alert, Modal, Input, Select, Textarea, Spinner, PageHeader } from '@/components/ui';
import {
  getAllProfiles, updateProfile, deleteProfile,
  getCourses, upsertCourse, deleteCourse,
  getMacroAreas, upsertMacroArea, deleteMacroArea,
  getTopics, upsertTopic, deleteTopic,
  getQuestions, upsertQuestion, deleteQuestion, bulkInsertQuestions,
  getReports, updateReportStatus, QuestionReport,
} from '@/lib/db';
import type { Profile, Course, MacroArea, Topic, Question, ExamRules } from '@/types';

type Tab = 'users' | 'courses' | 'questions' | 'reports';

const DEFAULT_RULES: ExamRules = {
  total_questions: 30,
  time_limit_seconds: 2700,
  correct_score: 1,
  wrong_penalty: 0.2,
  omitted_score: 0,
  options_per_question: 5,
  allow_multiple_correct: false,
  distribution: {},
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('users');
  const [jumpText, setJumpText] = useState('');

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return <PageShell><Spinner className="mt-20" /></PageShell>;
  if (!user?.is_admin) return null;

  return (
    <PageShell>
      <div className="max-w-4xl mx-auto px-4">
        <PageHeader title="Pannello Admin" back="/dashboard" />

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-gray-100 mb-6 shadow-sm overflow-x-auto">
          {([['users', '👥 Utenti'], ['courses', '📚 Materie'], ['questions', '❓ Domande'], ['reports', '🚩 Segnalazioni']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-[rgb(32,44,71)] text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'courses' && <CoursesTab />}
        {tab === 'questions' && <QuestionsTab jumpToText={jumpText} onJumpHandled={() => setJumpText('')} />}
        {tab === 'reports' && <ReportsTab onGotoQuestion={(text) => { setJumpText(text); setTab('questions'); }} />}
      </div>
    </PageShell>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setProfiles(await getAllProfiles());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const toggle = async (id: string, field: 'is_active' | 'is_admin', val: boolean) => {
    const { error } = await updateProfile(id, { [field]: val });
    if (error) flash('err', error);
    else { flash('ok', 'Aggiornato.'); load(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteProfile(id);
    if (error) flash('err', error);
    else { flash('ok', 'Utente disattivato.'); setConfirmDel(null); load(); }
  };

  if (loading) return <Spinner className="mt-10" />;

  const pending = profiles.filter(p => !p.is_active);
  const active = profiles.filter(p => p.is_active);

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      {pending.length > 0 && (
        <Card className="border-2 border-amber-200">
          <h3 className="font-semibold text-amber-700 mb-3 text-sm">⏳ In attesa di attivazione ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-amber-50 rounded-xl">
                <div>
                  <div className="font-medium text-gray-800 text-sm">{p.display_name}</div>
                  <div className="text-xs text-gray-500">{p.email}</div>
                </div>
                <button onClick={() => toggle(p.id, 'is_active', true)}
                  className="text-xs bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
                  Attiva
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm uppercase tracking-wide">Utenti attivi ({active.length})</h3>
        <div className="space-y-2">
          {active.map(p => (
            <div key={p.id} className="p-3 bg-[rgb(240,242,247)] rounded-xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[rgb(32,44,71)] text-sm">{p.display_name}</span>
                    {p.is_admin && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">Admin</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => toggle(p.id, 'is_admin', !p.is_admin)}
                    className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">
                    {p.is_admin ? 'Rimuovi admin' : 'Rendi admin'}
                  </button>
                  <button
                    onClick={() => toggle(p.id, 'is_active', false)}
                    className="text-xs bg-white border border-amber-200 text-amber-600 font-medium px-2.5 py-1 rounded-lg hover:bg-amber-50 transition-colors">
                    Disattiva
                  </button>
                  {confirmDel === p.id ? (
                    <div className="flex gap-1">
                      <button onClick={() => handleDelete(p.id)} className="text-xs bg-red-500 text-white font-medium px-2.5 py-1 rounded-lg">Conferma</button>
                      <button onClick={() => setConfirmDel(null)} className="text-xs bg-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg">Annulla</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmDel(p.id)}
                      className="text-xs bg-white border border-red-200 text-red-500 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                      Elimina
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── COURSES TAB ──────────────────────────────────────────────────────────────
function CoursesTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [areas, setAreas] = useState<Record<string, MacroArea[]>>({});
  const [topics, setTopics] = useState<Record<string, Topic[]>>({});
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Partial<Course> | null>(null);
  const [showAreaModal, setShowAreaModal] = useState<{ courseId: string } | null>(null);
  const [showTopicModal, setShowTopicModal] = useState<{ courseId: string; areaId: string } | null>(null);
  const [confirmDelCourse, setConfirmDelCourse] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cs = await getCourses();
    setCourses(cs);
    const aMap: Record<string, MacroArea[]> = {};
    const tMap: Record<string, Topic[]> = {};
    for (const c of cs) {
      aMap[c.id] = await getMacroAreas(c.id);
      tMap[c.id] = await getTopics(c.id);
    }
    setAreas(aMap); setTopics(tMap);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  if (loading) return <Spinner className="mt-10" />;

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      <div className="flex justify-end">
        <button onClick={() => { setEditingCourse({}); setShowCourseModal(true); }}
          className="btn-primary text-sm py-2 px-4">+ Nuova materia</button>
      </div>

      {courses.map(course => (
        <Card key={course.id}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{course.icon}</span>
              <div>
                <h3 className="font-bold text-[rgb(32,44,71)]">{course.name}</h3>
                <p className="text-xs text-gray-400">{course.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {course.is_available ? 'Attiva' : 'Disattiva'}
              </span>
              <button onClick={() => { setEditingCourse(course); setShowCourseModal(true); }}
                className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50">Modifica</button>
              {confirmDelCourse === course.id ? (
                <div className="flex items-center gap-1">
                  <span className="text-xs text-red-600 font-medium">Sicuro? Elimina anche tutte le domande!</span>
                  <button onClick={async () => {
                    const { error } = await deleteCourse(course.id);
                    if (error) flash('err', error);
                    else { flash('ok', `Materia "${course.name}" eliminata.`); setConfirmDelCourse(null); load(); }
                  }} className="text-xs bg-red-500 text-white font-semibold px-2.5 py-1 rounded-lg hover:bg-red-600">Sì, elimina</button>
                  <button onClick={() => setConfirmDelCourse(null)}
                    className="text-xs bg-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-300">Annulla</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelCourse(course.id)}
                  className="text-xs bg-white border border-red-200 text-red-500 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">
                  Elimina materia
                </button>
              )}
            </div>
          </div>

          {/* Exam rules summary */}
          <div className="bg-[rgb(240,242,247)] rounded-xl p-3 mb-3 text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span className="font-medium">Domande:</span> {course.exam_rules.total_questions}</div>
            <div><span className="font-medium">Tempo:</span> {course.exam_rules.time_limit_seconds / 60} min</div>
            <div><span className="font-medium">Opzioni:</span> {course.exam_rules.options_per_question}</div>
            <div><span className="font-medium">Punteggio:</span> +{course.exam_rules.correct_score}/−{course.exam_rules.wrong_penalty}</div>
          </div>

          {/* Macro areas */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Macro-aree</p>
              <button onClick={() => setShowAreaModal({ courseId: course.id })}
                className="text-xs text-[rgb(32,44,71)] font-medium hover:underline">+ Aggiungi area</button>
            </div>
            {(areas[course.id] ?? []).map(area => (
              <div key={area.id} className="ml-2 border-l-2 border-gray-200 pl-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{area.name}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowTopicModal({ courseId: course.id, areaId: area.id })}
                      className="text-xs text-blue-600 font-medium hover:underline">+ Argomento</button>
                    <button onClick={async () => {
                      const { error } = await deleteMacroArea(area.id);
                      if (error) flash('err', error); else { flash('ok', 'Area eliminata.'); load(); }
                    }} className="text-xs text-red-400 hover:underline">×</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {(topics[course.id] ?? []).filter(t => t.macro_area_id === area.id).map(t => (
                    <span key={t.id} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {t.name}
                      <button onClick={async () => {
                        const { error } = await deleteTopic(t.id);
                        if (error) flash('err', error); else { flash('ok', 'Argomento eliminato.'); load(); }
                      }} className="text-gray-400 hover:text-red-500 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Modals */}
      {showCourseModal && (
        <CourseModal
          initial={editingCourse ?? {}}
          onClose={() => setShowCourseModal(false)}
          onSave={async data => {
            const { error } = await upsertCourse(data as any);
            if (error) flash('err', error);
            else { flash('ok', 'Materia salvata.'); setShowCourseModal(false); load(); }
          }}
        />
      )}
      {showAreaModal && (
        <SimpleNameModal
          title="Aggiungi macro-area"
          onClose={() => setShowAreaModal(null)}
          onSave={async name => {
            const { error } = await upsertMacroArea({
              course_id: showAreaModal.courseId,
              name,
              display_order: (areas[showAreaModal.courseId]?.length ?? 0) + 1,
            });
            if (error) flash('err', error);
            else { flash('ok', 'Area aggiunta.'); setShowAreaModal(null); load(); }
          }}
        />
      )}
      {showTopicModal && (
        <SimpleNameModal
          title="Aggiungi argomento"
          onClose={() => setShowTopicModal(null)}
          onSave={async name => {
            const { error } = await upsertTopic({
              macro_area_id: showTopicModal.areaId,
              course_id: showTopicModal.courseId,
              name,
            });
            if (error) flash('err', error);
            else { flash('ok', 'Argomento aggiunto.'); setShowTopicModal(null); load(); }
          }}
        />
      )}
    </div>
  );
}

function SimpleNameModal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Nome" value={name} onChange={e => setName(e.target.value)} placeholder="Inserisci nome…" autoFocus />
        <button onClick={() => name && onSave(name)} className="btn-primary w-full">Salva</button>
      </div>
    </Modal>
  );
}

function CourseModal({ initial, onClose, onSave }: {
  initial: Partial<Course>;
  onClose: () => void;
  onSave: (data: Partial<Course>) => void;
}) {
  const [form, setForm] = useState({
    name: initial.name ?? '',
    subtitle: initial.subtitle ?? '',
    icon: initial.icon ?? '📖',
    accent_color: initial.accent_color ?? 'bg-blue-600',
    text_color: initial.text_color ?? 'text-blue-700',
    border_color: initial.border_color ?? 'border-blue-200',
    is_available: initial.is_available ?? true,
    exam_rules: initial.exam_rules ?? DEFAULT_RULES,
    ...(initial.id ? { id: initial.id } : {}),
  });
  const [courseAreas, setCourseAreas] = useState<MacroArea[]>([]);
  // distribution: areaId -> count (local state for the form)
  const [distribution, setDistribution] = useState<Record<string, number>>(initial.exam_rules?.distribution ?? {});
  const [preDistribution, setPreDistribution] = useState<Record<string, number>>(initial.exam_rules?.preselection?.distribution ?? {});

  // Load existing macro areas if editing
  useEffect(() => {
    if (initial.id) {
      getMacroAreas(initial.id).then(areas => {
        setCourseAreas(areas);
        const dist = initial.exam_rules?.distribution ?? {};
        const preDist = initial.exam_rules?.preselection?.distribution ?? {};
        const initMain: Record<string, number> = {};
        const initPre: Record<string, number> = {};
        areas.forEach(a => {
          initMain[a.id] = dist[a.id] ?? 0;
          initPre[a.id] = preDist[a.id] ?? 0;
        });
        setDistribution(initMain);
        setPreDistribution(initPre);
      });
    }
  }, [initial.id]);

  const rule = form.exam_rules;
  const setRule = (patch: Partial<ExamRules>) => setForm(f => ({ ...f, exam_rules: { ...f.exam_rules, ...patch } }));

  // Auto-calculate total from distribution
  const distTotal = Object.values(distribution).reduce((s, n) => s + n, 0);

  const handleSave = () => {
    if (!form.name) return;
    const preTotal = Object.values(preDistribution).reduce((s,n) => s+n, 0);
    const finalRules = {
      ...form.exam_rules,
      distribution,
      total_questions: distTotal > 0 ? distTotal : form.exam_rules.total_questions,
      ...(form.exam_rules.exam_type === 'two_phase' ? {
        preselection: {
          ...form.exam_rules.preselection!,
          distribution: preDistribution,
          questions: preTotal > 0 ? preTotal : (form.exam_rules.preselection?.questions ?? 15),
        }
      } : {}),
    };
    onSave({ ...form, exam_rules: finalRules });
  };

  const ACCENT_OPTIONS = [
    { label: '🔵 Blu', accent: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', preview: 'bg-blue-600' },
    { label: '🟢 Verde', accent: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200', preview: 'bg-emerald-600' },
    { label: '🟣 Viola', accent: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-200', preview: 'bg-purple-600' },
    { label: '🔴 Rosso', accent: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-200', preview: 'bg-rose-600' },
    { label: '🟠 Arancio', accent: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', preview: 'bg-orange-500' },
    { label: '🩵 Azzurro', accent: 'bg-cyan-600', text: 'text-cyan-700', border: 'border-cyan-200', preview: 'bg-cyan-600' },
  ];

  return (
    <Modal title={initial.id ? 'Modifica materia' : 'Nuova materia'} onClose={onClose}>
      <div className="space-y-5">

        {/* Basic info */}
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome materia *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Farmacologia" />
          <Input label="Icona (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="💊" />
        </div>
        <Input label="Sottotitolo" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="es. Aree principali del corso" />

        {/* Color picker */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Colore tema</p>
          <div className="flex flex-wrap gap-2">
            {ACCENT_OPTIONS.map(opt => (
              <button key={opt.accent} type="button"
                onClick={() => setForm(f => ({ ...f, accent_color: opt.accent, text_color: opt.text, border_color: opt.border }))}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${form.accent_color === opt.accent ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]' : 'border-gray-200 hover:border-gray-300'}`}>
                <span className={`w-3 h-3 rounded-full ${opt.preview}`} />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Exam rules */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-[rgb(32,44,71)] mb-3">⏱️ Regole esame</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Tempo (minuti)" type="number" value={rule.time_limit_seconds / 60} onChange={e => setRule({ time_limit_seconds: +e.target.value * 60 })} min={1} />
            <Select label="Opzioni per domanda" value={rule.options_per_question} onChange={e => setRule({ options_per_question: +e.target.value })}>
              <option value={3}>3 opzioni</option>
              <option value={4}>4 opzioni</option>
              <option value={5}>5 opzioni</option>
            </Select>
            <Input label="Punti risposta corretta" type="number" step="0.1" value={rule.correct_score} onChange={e => setRule({ correct_score: +e.target.value })} />
            <Input label="Penalità risposta errata" type="number" step="0.25" value={rule.wrong_penalty} onChange={e => setRule({ wrong_penalty: +e.target.value })} />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <input type="checkbox" id="multi" checked={rule.allow_multiple_correct} onChange={e => setRule({ allow_multiple_correct: e.target.checked })} className="accent-[rgb(32,44,71)]" />
            <label htmlFor="multi" className="text-sm text-gray-600 cursor-pointer">Ammetti risposte multiple corrette</label>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="twophase" checked={rule.exam_type === 'two_phase'} onChange={e => setRule({ exam_type: e.target.checked ? 'two_phase' : 'standard' })} className="accent-[rgb(32,44,71)]" />
            <label htmlFor="twophase" className="text-sm text-gray-600 cursor-pointer">Esame bifasico (preselezione + esame)</label>
          </div>

          {rule.exam_type === 'two_phase' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-800">⚙️ Configura la fase di preselezione</p>
              <div className="grid grid-cols-2 gap-2">
                <Input label="Domande preselezione" type="number" min={1}
                  value={rule.preselection?.questions ?? 15}
                  onChange={e => setRule({ preselection: { ...rule.preselection!, questions: +e.target.value, max_errors: rule.preselection?.max_errors ?? 1, time_limit_seconds: rule.preselection?.time_limit_seconds ?? 1200, distribution: rule.preselection?.distribution ?? {} } })} />
                <Input label="Errori massimi ammessi" type="number" min={0}
                  value={rule.preselection?.max_errors ?? 1}
                  onChange={e => setRule({ preselection: { ...rule.preselection!, max_errors: +e.target.value, questions: rule.preselection?.questions ?? 15, time_limit_seconds: rule.preselection?.time_limit_seconds ?? 1200, distribution: rule.preselection?.distribution ?? {} } })} />
                <Input label="Tempo preselezione (min)" type="number" min={1}
                  value={(rule.preselection?.time_limit_seconds ?? 1200) / 60}
                  onChange={e => setRule({ preselection: { ...rule.preselection!, time_limit_seconds: +e.target.value * 60, questions: rule.preselection?.questions ?? 15, max_errors: rule.preselection?.max_errors ?? 1, distribution: rule.preselection?.distribution ?? {} } })} />
              </div>
              <p className="text-xs text-amber-700">
                La distribuzione delle domande di preselezione si configura come per l'esame principale qui sopra, nella sezione "Domande per area".
              </p>
            </div>
          )}
        </div>

        {/* Distribution per macro area */}
        {courseAreas.length > 0 && (
          <div className="border-t border-gray-100 pt-4 space-y-4">

            {/* Main exam distribution */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-[rgb(32,44,71)]">
                  {rule.exam_type === 'two_phase' ? '📊 Domande per area — Esame vero' : "📊 Domande per area nell'esame"}
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${distTotal > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                  Totale: {distTotal}
                </span>
              </div>
              <div className="space-y-2">
                {courseAreas.map(area => (
                  <div key={area.id} className="flex items-center gap-3 p-3 bg-[rgb(240,242,247)] rounded-xl">
                    <span className="flex-1 text-sm font-medium text-gray-700 truncate">{area.name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button type="button"
                        onClick={() => setDistribution(d => ({ ...d, [area.id]: Math.max(0, (d[area.id] ?? 0) - 1) }))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-base leading-none">−</button>
                      <input type="number" min={0} value={distribution[area.id] ?? 0}
                        onChange={e => setDistribution(d => ({ ...d, [area.id]: Math.max(0, +e.target.value) }))}
                        className="w-14 text-center border border-gray-300 rounded-lg px-1 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"/>
                      <button type="button"
                        onClick={() => setDistribution(d => ({ ...d, [area.id]: (d[area.id] ?? 0) + 1 }))}
                        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 font-bold text-base leading-none">+</button>
                    </div>
                  </div>
                ))}
              </div>
              {distTotal > 0 && (
                <p className="text-xs text-gray-400 mt-2">
                  💡 Il totale domande dell'esame verrà impostato automaticamente a <strong>{distTotal}</strong>.
                </p>
              )}
            </div>

            {/* Preselection distribution — only for two-phase */}
            {rule.exam_type === 'two_phase' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-amber-800">⚡ Domande per area — Preselezione</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${Object.values(preDistribution).reduce((s,n)=>s+n,0) > 0 ? 'bg-amber-200 text-amber-800' : 'bg-gray-100 text-gray-500'}`}>
                    Totale: {Object.values(preDistribution).reduce((s,n)=>s+n,0)}
                  </span>
                </div>
                <div className="space-y-2">
                  {courseAreas.map(area => (
                    <div key={area.id} className="flex items-center gap-3 p-2.5 bg-white rounded-xl">
                      <span className="flex-1 text-sm font-medium text-gray-700 truncate">{area.name}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button type="button"
                          onClick={() => setPreDistribution(d => ({ ...d, [area.id]: Math.max(0, (d[area.id] ?? 0) - 1) }))}
                          className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 hover:bg-amber-200 font-bold text-base leading-none">−</button>
                        <input type="number" min={0} value={preDistribution[area.id] ?? 0}
                          onChange={e => setPreDistribution(d => ({ ...d, [area.id]: Math.max(0, +e.target.value) }))}
                          className="w-14 text-center border border-amber-300 rounded-lg px-1 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"/>
                        <button type="button"
                          onClick={() => setPreDistribution(d => ({ ...d, [area.id]: (d[area.id] ?? 0) + 1 }))}
                          className="w-7 h-7 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700 hover:bg-amber-200 font-bold text-base leading-none">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  Queste aree vengono usate per pescare le {rule.preselection?.questions ?? 15} domande della preselezione.
                </p>
              </div>
            )}

          </div>
        )}

        {!initial.id && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700">
            💡 La distribuzione delle domande per area sarà disponibile dopo aver creato la materia e aggiunto le macro-aree.
          </div>
        )}

        {/* Visibility */}
        <div className="flex items-center gap-2 pt-1">
          <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="accent-[rgb(32,44,71)]" />
          <label htmlFor="avail" className="text-sm text-gray-600 cursor-pointer">Materia visibile agli studenti</label>
        </div>

        <button onClick={handleSave} className="btn-primary w-full">Salva materia</button>
      </div>
    </Modal>
  );
}

// ─── QUESTIONS TAB ────────────────────────────────────────────────────────────

// Parses a "correct" cell like "A", "B,D", "1", "2,4" → 0-based indices
function parseCorrect(val: unknown, optCount: number): number[] {
  if (val === null || val === undefined || String(val).trim() === '') return [];
  const str = String(val).trim().toUpperCase();
  return str.split(/[,;]/).map(s => s.trim()).reduce<number[]>((acc, token) => {
    // Letter: A→0, B→1 …
    if (/^[A-Z]$/.test(token)) { const idx = token.charCodeAt(0) - 65; if (idx < optCount) acc.push(idx); }
    // Number: 1→0, 2→1 …
    else if (/^\d+$/.test(token)) { const idx = parseInt(token, 10) - 1; if (idx >= 0 && idx < optCount) acc.push(idx); }
    return acc;
  }, []);
}

function QuestionsTab({ jumpToText = '', onJumpHandled }: { jumpToText?: string; onJumpHandled?: () => void }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [areas, setAreas] = useState<MacroArea[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err' | 'warn'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editing, setEditing] = useState<Partial<Question> | null>(null);
  const [filterArea, setFilterArea] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [searchText, setSearchText] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useEffect(() => { getCourses().then(setCourses); }, []);

  // Jump to a specific question from Reports tab
  useEffect(() => {
    if (jumpToText) {
      setSearchText(jumpToText);
      if (onJumpHandled) onJumpHandled();
    }
  }, [jumpToText]);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    Promise.all([getMacroAreas(selectedCourse), getTopics(selectedCourse), getQuestions(selectedCourse)])
      .then(([a, t, q]) => { setAreas(a); setAllTopics(t); setQuestions(q); setFilterArea(''); setFilterTopic(''); setSearchText(''); setLoading(false); });
  }, [selectedCourse]);

  const flash = (type: 'ok' | 'err' | 'warn', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 5000); };
  const reload = async () => { if (selectedCourse) setQuestions(await getQuestions(selectedCourse)); };

  const filteredQs = questions.filter(q =>
    (!filterArea || q.macro_area_id === filterArea) &&
    (!filterTopic || q.topic_id === filterTopic) &&
    (!searchText || q.question_text.toLowerCase().includes(searchText.toLowerCase()))
  );
  const visibleTopics = allTopics.filter(t => !filterArea || t.macro_area_id === filterArea);

  // ── Download template ──
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    // Build example rows based on current areas/topics
    const rows = [
      ['macro_area', 'topic', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct', 'explanation'],
      [
        areas[0]?.name ?? 'Igiene e Sanità Pubblica',
        allTopics[0]?.name ?? 'Epidemiologia',
        'Esempio: quale studio è adatto per malattie rare?',
        'Studio di coorte',
        'Studio caso-controllo',
        'Studio sperimentale',
        'Studio ecologico',
        'Studio trasversale',
        'B',
        'Lo studio caso-controllo è ideale per malattie rare perché parte dai casi già esistenti',
        'true',
      ],
      [
        areas[0]?.name ?? 'Igiene e Sanità Pubblica',
        allTopics[0]?.name ?? 'Epidemiologia',
        'Esempio con 4 opzioni e opzioni NON mescolate',
        'Opzione A',
        'Opzione B',
        'Opzione C',
        'Opzione D',
        '',
        'A',
        '',
        'false',
      ],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    // Column widths
    ws['!cols'] = [20, 25, 50, 20, 20, 20, 20, 20, 10, 40].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domande');

    // Second sheet: reference list of valid areas and topics
    if (areas.length > 0) {
      const ref: string[][] = [['macro_area (valori esatti)', 'topic (valori esatti)']];
      areas.forEach(a => {
        const ts = allTopics.filter(t => t.macro_area_id === a.id);
        if (ts.length === 0) ref.push([a.name, '']);
        else ts.forEach(t => ref.push([a.name, t.name]));
      });
      const ws2 = XLSX.utils.aoa_to_sheet(ref);
      ws2['!cols'] = [{ wch: 35 }, { wch: 40 }];
      XLSX.utils.book_append_sheet(wb, ws2, 'Aree e Argomenti');
    }

    XLSX.writeFile(wb, 'template_domande.xlsx');
  };

  // ── Parse & import Excel ──
  const handleImport = async (file: File) => {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });

    if (rows.length === 0) { flash('err', 'Il file è vuoto o non ha righe dati.'); return; }

    // Build lookup maps (case-insensitive)
    const areaMap = new Map(areas.map(a => [a.name.trim().toLowerCase(), a]));
    const topicMap = new Map(allTopics.map(t => [t.name.trim().toLowerCase(), t]));

    const toInsert: Array<Omit<Question, 'id' | 'created_at' | 'updated_at'>> = [];
    const errors: string[] = [];

    rows.forEach((row, i) => {
      const rowN = i + 2; // row number in Excel (1-based + header)
      const areaName = String(row['macro_area'] ?? '').trim();
      const topicName = String(row['topic'] ?? '').trim();
      const questionText = String(row['question_text'] ?? '').trim();

      if (!areaName || !topicName || !questionText) {
        errors.push(`Riga ${rowN}: macro_area, topic o question_text mancante.`);
        return;
      }

      const area = areaMap.get(areaName.toLowerCase());
      if (!area) { errors.push(`Riga ${rowN}: macro_area "${areaName}" non trovata. Controlla la grafia.`); return; }

      const topic = topicMap.get(topicName.toLowerCase());
      if (!topic) { errors.push(`Riga ${rowN}: topic "${topicName}" non trovato. Controlla la grafia.`); return; }

      // Collect options (option_a … option_e, skip empty)
      const optKeys = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
      const opts = optKeys.map(k => String(row[k] ?? '').trim()).filter(o => o !== '');
      if (opts.length < 2) { errors.push(`Riga ${rowN}: almeno 2 opzioni richieste.`); return; }

      const correctRaw = row['correct'];
      const correctIdxs = parseCorrect(correctRaw, opts.length);
      if (correctIdxs.length === 0) {
        errors.push(`Riga ${rowN}: colonna "correct" non valida ("${correctRaw}"). Usa A, B, C… oppure 1, 2, 3… anche separati da virgola.`);
        return;
      }

      const shuffleVal = String(row['shuffle_options'] ?? '').trim().toLowerCase();
      const shouldShuffle = shuffleVal === '' || shuffleVal === 'true' || shuffleVal === 'si' || shuffleVal === 'sì' || shuffleVal === '1' || shuffleVal === 'yes';
      toInsert.push({
        course_id: selectedCourse,
        macro_area_id: area.id,
        topic_id: topic.id,
        question_text: questionText,
        options: opts,
        correct_answers: correctIdxs,
        explanation: String(row['explanation'] ?? '').trim() || undefined,
        is_active: true,
        shuffle_options: shouldShuffle,
      });
    });

    if (errors.length > 0 && toInsert.length === 0) {
      flash('err', `Nessuna domanda importata. Errori:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n…e altri ${errors.length - 5} errori` : ''}`);
      return;
    }

    const { count, error } = await bulkInsertQuestions(toInsert as any);
    if (error) { flash('err', `Errore durante l'importazione: ${error}`); return; }

    let msg = `✅ ${count} domande importate con successo!`;
    if (errors.length > 0) msg += ` ⚠️ ${errors.length} righe saltate per errori.`;
    flash(errors.length > 0 ? 'warn' : 'ok', msg);
    setShowImport(false);
    reload();
  };

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      {/* Course picker */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seleziona materia</p>
        <div className="flex flex-wrap gap-2">
          {courses.map(c => (
            <button key={c.id} onClick={() => setSelectedCourse(c.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${selectedCourse === c.id ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-[rgb(32,44,71)] hover:text-[rgb(32,44,71)]'}`}>
              <span>{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Area + topic filters */}
      {selectedCourse && (
        <Card className="py-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select label="Filtra per area" value={filterArea} onChange={e => { setFilterArea(e.target.value); setFilterTopic(''); }}>
              <option value="">Tutte le aree</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Select>
            <Select label="Filtra per argomento" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
              <option value="">Tutti gli argomenti</option>
              {visibleTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
          </div>
        </Card>
      )}

      {/* Search bar */}
      {selectedCourse && (
        <div className="relative">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="Cerca nel testo delle domande…"
            className="w-full border border-gray-300 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] bg-white"
          />
          {searchText && (
            <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          )}
        </div>
      )}

      {/* Action bar */}
      {selectedCourse && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">{filteredQs.length} domande</p>
          <div className="flex gap-2 flex-wrap">
            {/* Download template */}
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-600 font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Scarica template
            </button>
            {/* Import Excel */}
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importa Excel
            </button>
            {/* New question */}
            <button onClick={() => { setEditing({}); setShowModal(true); }} className="btn-primary text-sm py-2 px-4">
              + Nuova domanda
            </button>
          </div>
        </div>
      )}

      {loading && <Spinner className="mt-10" />}

      {/* Question list */}
      {!loading && selectedCourse && filteredQs.map(q => (
        <Card key={q.id} className="border border-gray-100">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.macro_area_name}</span>
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{q.topic_name}</span>
                {!q.is_active && <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded-full">Disattiva</span>}
              </div>
              <p className="text-sm font-medium text-[rgb(32,44,71)] leading-snug">{q.question_text}</p>
              <div className="mt-2 space-y-0.5">
                {q.options.map((opt, i) => (
                  <div key={i} className={`text-xs px-2 py-1 rounded-lg ${q.correct_answers.includes(i) ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-400'}`}>
                    {String.fromCharCode(65 + i)}. {opt}{q.correct_answers.includes(i) && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => { setEditing(q); setShowModal(true); }}
                className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50">Modifica</button>
              {confirmDel === q.id ? (
                <div className="flex gap-1">
                  <button onClick={async () => { const { error } = await deleteQuestion(q.id); if (error) flash('err', error); else { flash('ok', 'Eliminata.'); setConfirmDel(null); reload(); } }}
                    className="text-xs bg-red-500 text-white font-medium px-2 py-1 rounded-lg">Sì</button>
                  <button onClick={() => setConfirmDel(null)} className="text-xs bg-gray-200 text-gray-600 font-medium px-2 py-1 rounded-lg">No</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDel(q.id)}
                  className="text-xs bg-white border border-red-200 text-red-500 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50">Elimina</button>
              )}
            </div>
          </div>
        </Card>
      ))}

      {!loading && selectedCourse && filteredQs.length === 0 && (
        <Card className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">📭</div>
          <p className="font-medium">Nessuna domanda trovata.</p>
          <p className="text-sm mt-1">Importa un file Excel o aggiungi domande manualmente.</p>
        </Card>
      )}

      {/* Import modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDownloadTemplate={downloadTemplate}
          onImport={handleImport}
        />
      )}

      {/* Edit/new modal */}
      {showModal && selectedCourse && (
        <QuestionModal
          initial={editing ?? {}}
          courseId={selectedCourse}
          areas={areas}
          topics={allTopics}
          onClose={() => setShowModal(false)}
          onSave={async data => {
            const { error } = await upsertQuestion(data as any);
            if (error) flash('err', error);
            else { flash('ok', 'Domanda salvata.'); setShowModal(false); reload(); }
          }}
        />
      )}
    </div>
  );
}

// ─── IMPORT MODAL ─────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDownloadTemplate, onImport }: {
  onClose: () => void;
  onDownloadTemplate: () => void;
  onImport: (file: File) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (f: File) => {
    if (!f.name.match(/\.(xlsx|xls)$/i)) { alert('Carica un file .xlsx o .xls'); return; }
    setFile(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    await onImport(file);
    setImporting(false);
  };

  return (
    <Modal title="Importa domande da Excel" onClose={onClose}>
      <div className="space-y-4">

        {/* Step 1 */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm font-semibold text-blue-800 mb-2">Passo 1 — Scarica il template</p>
          <p className="text-xs text-blue-700 leading-relaxed mb-3">
            Il template contiene le colonne giuste e un foglio con tutti i nomi esatti delle aree e degli argomenti da usare.
          </p>
          <button onClick={onDownloadTemplate}
            className="flex items-center gap-2 text-sm bg-white border border-blue-300 text-blue-700 font-semibold px-4 py-2 rounded-xl hover:bg-blue-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Scarica template_domande.xlsx
          </button>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-sm font-semibold text-gray-700 mb-2">Passo 2 — Compila il file</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• <strong>macro_area</strong> e <strong>topic</strong>: copia i nomi esatti dal secondo foglio del template</p>
            <p>• <strong>option_a … option_e</strong>: le opzioni di risposta (option_e può essere vuota per 4 opzioni)</p>
            <p>• <strong>correct</strong>: la lettera della risposta corretta: <code className="bg-gray-100 px-1 rounded">A</code>, <code className="bg-gray-100 px-1 rounded">B</code>, ecc. Per risposte multiple: <code className="bg-gray-100 px-1 rounded">A,C</code></p>
            <p>• <strong>explanation</strong>: facoltativa, viene mostrata dopo la risposta nell'esercitazione</p>
          </div>
        </div>

        {/* Step 3 — file drop */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Passo 3 — Carica il file compilato</p>
          <label
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${dragOver ? 'border-[rgb(32,44,71)] bg-blue-50' : file ? 'border-emerald-400 bg-emerald-50' : 'border-gray-300 hover:border-gray-400 bg-white'}`}>
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {file ? (
              <>
                <div className="text-2xl mb-1">✅</div>
                <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{(file.size / 1024).toFixed(1)} KB — clicca per cambiare</p>
              </>
            ) : (
              <>
                <div className="text-2xl mb-1">📂</div>
                <p className="text-sm font-medium text-gray-600">Trascina qui il file oppure clicca per selezionarlo</p>
                <p className="text-xs text-gray-400 mt-0.5">.xlsx o .xls</p>
              </>
            )}
          </label>
        </div>

        <button onClick={handleImport} disabled={!file || importing}
          className="btn-primary w-full disabled:opacity-40">
          {importing ? 'Importazione in corso…' : 'Importa domande →'}
        </button>
      </div>
    </Modal>
  );
}

function QuestionModal({ initial, courseId, areas, topics, onClose, onSave }: {
  initial: Partial<Question>;
  courseId: string;
  areas: MacroArea[];
  topics: Topic[];
  onClose: () => void;
  onSave: (data: Partial<Question>) => void;
}) {
  const [areaId, setAreaId] = useState(initial.macro_area_id ?? '');
  const [topicId, setTopicId] = useState(initial.topic_id ?? '');
  const [text, setText] = useState(initial.question_text ?? '');
  const [options, setOptions] = useState<string[]>(initial.options ?? ['', '', '', '', '']);
  const [corrects, setCorrects] = useState<number[]>(initial.correct_answers ?? []);
  const [explanation, setExplanation] = useState(initial.explanation ?? '');
  const [active, setActive] = useState(initial.is_active !== false);
  const [shuffleOpts, setShuffleOpts] = useState(initial.shuffle_options !== false);

  const filteredTopics = topics.filter(t => t.macro_area_id === areaId);

  const toggleCorrect = (idx: number) => {
    setCorrects(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const handleSave = () => {
    if (!areaId || !topicId || !text || corrects.length === 0 || options.some(o => !o.trim())) return;
    onSave({
      ...(initial.id ? { id: initial.id } : {}),
      course_id: courseId,
      macro_area_id: areaId,
      topic_id: topicId,
      question_text: text,
      options: options.map(o => o.trim()),
      correct_answers: corrects,
      explanation: explanation || undefined,
      is_active: active,
      shuffle_options: shuffleOpts,
    });
  };

  return (
    <Modal title={initial.id ? 'Modifica domanda' : 'Nuova domanda'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Macro-area *" value={areaId} onChange={e => { setAreaId(e.target.value); setTopicId(''); }}>
            <option value="">— Seleziona —</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Select label="Argomento *" value={topicId} onChange={e => setTopicId(e.target.value)}>
            <option value="">— Seleziona —</option>
            {filteredTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>

        <Textarea label="Testo domanda *" value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Inserisci il testo della domanda…" />

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Opzioni di risposta * <span className="text-xs text-gray-400">(segna le corrette con la casella)</span></p>
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className={`flex items-center gap-2 p-2 rounded-xl border-2 transition-colors ${corrects.includes(i) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200'}`}>
                <button type="button" onClick={() => toggleCorrect(i)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${corrects.includes(i) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
                  {corrects.includes(i) && <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>}
                </button>
                <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + i)}.</span>
                <input value={opt} onChange={e => { const o = [...options]; o[i] = e.target.value; setOptions(o); }}
                  className="flex-1 border-0 bg-transparent text-sm focus:outline-none" placeholder={`Opzione ${String.fromCharCode(65 + i)}`} />
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button onClick={() => setOptions([...options, ''])} className="text-xs text-blue-600 font-medium mt-2 hover:underline">+ Aggiungi opzione</button>
          )}
        </div>

        <Textarea label="Spiegazione (opzionale)" value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} placeholder="Inserisci una spiegazione per la risposta corretta…" />

        <div className="flex items-center gap-2">
          <input type="checkbox" id="qactive" checked={active} onChange={e => setActive(e.target.checked)} className="accent-[rgb(32,44,71)]" />
          <label htmlFor="qactive" className="text-sm text-gray-600 cursor-pointer">Domanda attiva (visibile negli esercizi)</label>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="qshuffle" checked={shuffleOpts} onChange={e => setShuffleOpts(e.target.checked)} className="accent-[rgb(32,44,71)]" />
          <label htmlFor="qshuffle" className="text-sm text-gray-600 cursor-pointer">Mescola le opzioni di risposta</label>
        </div>

        <button onClick={handleSave} className="btn-primary w-full">Salva domanda</button>
      </div>
    </Modal>
  );
}

// ─── REPORTS TAB ──────────────────────────────────────────────────────────────
function ReportsTab({ onGotoQuestion }: { onGotoQuestion?: (text: string) => void }) {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('pending');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  // Inline edit state
  const [editingReport, setEditingReport] = useState<QuestionReport | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  // Edit form state
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrects, setEditCorrects] = useState<number[]>([]);
  const [editExplanation, setEditExplanation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getReports(filter === 'all' ? undefined : filter);
    setReports(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const setStatus = async (id: string, status: 'pending' | 'reviewed' | 'resolved') => {
    const { error } = await updateReportStatus(id, status);
    if (error) flash('err', error);
    else { flash('ok', 'Stato aggiornato.'); load(); }
  };

  // Open edit modal — fetch full question from DB
  const openEdit = async (r: QuestionReport) => {
    setEditingReport(r);
    setEditLoading(true);
    // fetch question directly
    const { data } = await (await import('@/lib/supabase')).supabase
      .from('questions')
      .select('*')
      .eq('id', r.question_id)
      .single();
    if (data) {
      setEditQuestion(data as Question);
      setEditText(data.question_text);
      setEditOptions(data.options);
      setEditCorrects(data.correct_answers);
      setEditExplanation(data.explanation || '');
    }
    setEditLoading(false);
  };

  const handleSaveEdit = async () => {
    if (!editQuestion) return;
    const { error } = await upsertQuestion({
      id: editQuestion.id,
      course_id: editQuestion.course_id,
      macro_area_id: editQuestion.macro_area_id,
      topic_id: editQuestion.topic_id,
      question_text: editText,
      options: editOptions,
      correct_answers: editCorrects,
      explanation: editExplanation || undefined,
      is_active: editQuestion.is_active,
    });
    if (error) { flash('err', error); return; }
    flash('ok', 'Domanda aggiornata con successo!');
    // Also mark report as resolved
    if (editingReport) await updateReportStatus(editingReport.id, 'resolved');
    setEditingReport(null);
    setEditQuestion(null);
    load();
  };

  const toggleEditCorrect = (idx: number) => {
    setEditCorrects(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const statusStyle: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700',
    reviewed: 'bg-blue-100 text-blue-700',
    resolved: 'bg-emerald-100 text-emerald-700',
  };
  const statusLabel: Record<string, string> = {
    pending: '⏳ In attesa',
    reviewed: '🔍 In revisione',
    resolved: '✅ Risolta',
  };

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      {/* Filter bar */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'reviewed', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm font-medium px-4 py-2 rounded-xl border-2 transition-all ${filter === f ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {f === 'all' ? 'Tutte' : statusLabel[f]}
          </button>
        ))}
      </div>

      {loading && <Spinner className="mt-10" />}

      {!loading && reports.length === 0 && (
        <Card className="text-center py-10 text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-medium">Nessuna segnalazione {filter !== 'all' ? 'in questa categoria' : ''}.</p>
        </Card>
      )}

      {!loading && reports.map(r => (
        <Card key={r.id} className="border border-gray-100">
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle[r.status]}`}>
                  {statusLabel[r.status]}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm font-semibold text-[rgb(32,44,71)] leading-snug mb-3">{r.question_text}</p>
              <div className="bg-[rgb(240,242,247)] rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0 font-medium">Risposta selezionata:</span>
                  <span className="text-red-600 font-medium">{r.selected_answer || '—'}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-gray-500 flex-shrink-0 font-medium">Indicata come corretta:</span>
                  <span className="text-emerald-700 font-medium">{r.correct_answer}</span>
                </div>
                {r.note && (
                  <div className="flex items-start gap-2 pt-1 border-t border-gray-200">
                    <span className="text-gray-500 flex-shrink-0 font-medium">Note:</span>
                    <span className="text-gray-700 italic">{r.note}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap mt-2">
            {/* Main CTA: edit question directly */}
            <button onClick={() => openEdit(r)}
              className="flex items-center gap-1.5 text-xs bg-[rgb(32,44,71)] text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-[rgb(52,69,110)] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifica domanda
            </button>
            {r.status !== 'reviewed' && (
              <button onClick={() => setStatus(r.id, 'reviewed')}
                className="text-xs bg-blue-50 border border-blue-200 text-blue-700 font-medium px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                🔍 In revisione
              </button>
            )}
            {r.status !== 'resolved' && (
              <button onClick={() => setStatus(r.id, 'resolved')}
                className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                ✅ Risolta
              </button>
            )}
            {r.status !== 'pending' && (
              <button onClick={() => setStatus(r.id, 'pending')}
                className="text-xs bg-white border border-gray-200 text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                ↩ Riapri
              </button>
            )}
          </div>
        </Card>
      ))}

      {/* Inline edit modal */}
      {editingReport && (
        <Modal title="Modifica domanda segnalata" onClose={() => { setEditingReport(null); setEditQuestion(null); }}>
          {editLoading ? (
            <div className="text-center py-8"><Spinner /></div>
          ) : !editQuestion ? (
            <div className="text-center py-8 text-gray-400">
              <p>Domanda non trovata — potrebbe essere stata eliminata.</p>
              <button onClick={() => setEditingReport(null)} className="btn-primary mt-4 px-6">Chiudi</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Context from report */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-semibold">⚠️ Segnalazione studente:</p>
                <p>Risposta selezionata: <span className="font-medium text-red-700">{editingReport.selected_answer}</span></p>
                <p>Risposta indicata corretta: <span className="font-medium text-emerald-700">{editingReport.correct_answer}</span></p>
                {editingReport.note && <p>Note: <span className="italic">{editingReport.note}</span></p>}
              </div>

              <Textarea label="Testo domanda" value={editText} onChange={e => setEditText(e.target.value)} rows={3} />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Opzioni <span className="text-xs text-gray-400 font-normal">(clicca la casella per marcare come corretta)</span>
                </p>
                <div className="space-y-2">
                  {editOptions.map((opt, i) => (
                    <div key={i} className={`flex items-center gap-2 p-2.5 rounded-xl border-2 transition-colors ${editCorrects.includes(i) ? 'border-emerald-400 bg-emerald-50' : 'border-gray-200 bg-white'}`}>
                      <button type="button" onClick={() => toggleEditCorrect(i)}
                        className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${editCorrects.includes(i) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300 bg-white'}`}>
                        {editCorrects.includes(i) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                      <span className="text-xs font-bold text-gray-400 w-4">{String.fromCharCode(65 + i)}.</span>
                      <input
                        value={opt}
                        onChange={e => { const o = [...editOptions]; o[i] = e.target.value; setEditOptions(o); }}
                        className="flex-1 border-0 bg-transparent text-sm focus:outline-none"
                        placeholder={`Opzione ${String.fromCharCode(65 + i)}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Textarea label="Spiegazione (opzionale)" value={editExplanation} onChange={e => setEditExplanation(e.target.value)} rows={2} placeholder="Aggiungi una spiegazione per la risposta corretta…" />

              <div className="flex gap-3">
                <button onClick={() => { setEditingReport(null); setEditQuestion(null); }} className="btn-secondary flex-1">
                  Annulla
                </button>
                <button onClick={handleSaveEdit} className="btn-primary flex-1">
                  Salva e segna come risolta
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
