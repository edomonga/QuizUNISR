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
} from '@/lib/db';
import type { Profile, Course, MacroArea, Topic, Question, ExamRules } from '@/types';

type Tab = 'users' | 'courses' | 'questions';

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
        <div className="flex gap-1 bg-white rounded-2xl p-1 border border-gray-100 mb-6 shadow-sm">
          {([['users', '👥 Utenti'], ['courses', '📚 Materie'], ['questions', '❓ Domande']] as [Tab, string][]).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all ${tab === t ? 'bg-[rgb(32,44,71)] text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'users' && <UsersTab />}
        {tab === 'courses' && <CoursesTab />}
        {tab === 'questions' && <QuestionsTab />}
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
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${course.is_available ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {course.is_available ? 'Attiva' : 'Disattiva'}
              </span>
              <button onClick={() => { setEditingCourse(course); setShowCourseModal(true); }}
                className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50">Modifica</button>
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
  const rule = form.exam_rules;
  const setRule = (patch: Partial<ExamRules>) => setForm(f => ({ ...f, exam_rules: { ...f.exam_rules, ...patch } }));

  return (
    <Modal title={initial.id ? 'Modifica materia' : 'Nuova materia'} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Nome materia *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Farmacologia" />
          <Input label="Icona (emoji)" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="💊" />
        </div>
        <Input label="Sottotitolo" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="es. Aree principali del corso" />

        <div className="border-t border-gray-100 pt-4">
          <p className="text-sm font-semibold text-[rgb(32,44,71)] mb-3">Regole esame</p>
          <div className="grid grid-cols-2 gap-3">
            <Input label="N° domande totali" type="number" value={rule.total_questions} onChange={e => setRule({ total_questions: +e.target.value })} min={1} />
            <Input label="Tempo (minuti)" type="number" value={rule.time_limit_seconds / 60} onChange={e => setRule({ time_limit_seconds: +e.target.value * 60 })} min={1} />
            <Input label="Punti risposta corretta" type="number" step="0.1" value={rule.correct_score} onChange={e => setRule({ correct_score: +e.target.value })} />
            <Input label="Penalità risposta errata" type="number" step="0.1" value={rule.wrong_penalty} onChange={e => setRule({ wrong_penalty: +e.target.value })} />
            <Select label="Opzioni per domanda" value={rule.options_per_question} onChange={e => setRule({ options_per_question: +e.target.value })}>
              <option value={3}>3 opzioni</option>
              <option value={4}>4 opzioni</option>
              <option value={5}>5 opzioni</option>
            </Select>
            <div className="flex items-center gap-2 mt-6">
              <input type="checkbox" id="multi" checked={rule.allow_multiple_correct} onChange={e => setRule({ allow_multiple_correct: e.target.checked })} className="accent-[rgb(32,44,71)]" />
              <label htmlFor="multi" className="text-sm text-gray-600 cursor-pointer">Risposte multiple corrette</label>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="avail" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="accent-[rgb(32,44,71)]" />
          <label htmlFor="avail" className="text-sm text-gray-600 cursor-pointer">Materia visibile agli studenti</label>
        </div>

        <button onClick={() => form.name && onSave(form)} className="btn-primary w-full">Salva materia</button>
      </div>
    </Modal>
  );
}

// ─── QUESTIONS TAB ────────────────────────────────────────────────────────────
function QuestionsTab() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [areas, setAreas] = useState<MacroArea[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Partial<Question> | null>(null);
  const [filterArea, setFilterArea] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  useEffect(() => { getCourses().then(setCourses); }, []);

  useEffect(() => {
    if (!selectedCourse) return;
    setLoading(true);
    Promise.all([
      getMacroAreas(selectedCourse),
      getTopics(selectedCourse),
      getQuestions(selectedCourse),
    ]).then(([a, t, q]) => {
      setAreas(a); setAllTopics(t); setQuestions(q);
      setFilterArea(''); setFilterTopic('');
      setLoading(false);
    });
  }, [selectedCourse]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3500); };

  const reload = async () => {
    if (!selectedCourse) return;
    setQuestions(await getQuestions(selectedCourse));
  };

  const filteredQs = questions.filter(q =>
    (!filterArea || q.macro_area_id === filterArea) &&
    (!filterTopic || q.topic_id === filterTopic)
  );

  const visibleTopics = allTopics.filter(t => !filterArea || t.macro_area_id === filterArea);

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select label="Materia" value={selectedCourse} onChange={e => setSelectedCourse(e.target.value)}>
            <option value="">— Seleziona —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </Select>
          {selectedCourse && (
            <>
              <Select label="Filtra per area" value={filterArea} onChange={e => { setFilterArea(e.target.value); setFilterTopic(''); }}>
                <option value="">Tutte le aree</option>
                {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Select>
              <Select label="Filtra per argomento" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
                <option value="">Tutti gli argomenti</option>
                {visibleTopics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </>
          )}
        </div>
      </Card>

      {selectedCourse && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{filteredQs.length} domande</p>
          <button onClick={() => { setEditing({}); setShowModal(true); }}
            className="btn-primary text-sm py-2 px-4">+ Nuova domanda</button>
        </div>
      )}

      {loading && <Spinner className="mt-10" />}

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
                    {String.fromCharCode(65 + i)}. {opt}
                    {q.correct_answers.includes(i) && ' ✓'}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 flex-shrink-0">
              <button onClick={() => { setEditing(q); setShowModal(true); }}
                className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50">Modifica</button>
              {confirmDel === q.id ? (
                <div className="flex gap-1">
                  <button onClick={async () => { const { error } = await deleteQuestion(q.id); if (error) flash('err', error); else { flash('ok', 'Domanda eliminata.'); setConfirmDel(null); reload(); } }}
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

        <button onClick={handleSave} className="btn-primary w-full">Salva domanda</button>
      </div>
    </Modal>
  );
}
