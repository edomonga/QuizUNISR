'use client';
// Dipendenze: xlsx (già installato), jspdf (npm install jspdf)
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PageShell, Card, Alert, Modal, Input, Select, Textarea, Spinner, PageHeader } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { COURSE_ICONS, CourseIcon, isImageIcon } from '@/lib/courseIcons';
import {
  getAllProfiles, updateProfile, deleteProfile,
  getCourses, upsertCourse, deleteCourse,
  getMacroAreas, upsertMacroArea, deleteMacroArea,
  getTopics, upsertTopic, deleteTopic,
  getQuestions, upsertQuestion, deleteQuestion, bulkInsertQuestions,
  setQuestionsActive, deleteQuestions,
  getReports, updateReportStatus, QuestionReport,
  deleteReport, deleteResolvedReports, purgeOldResolvedReports,
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
          {([['users', 'Utenti', 'users'], ['courses', 'Materie', 'folder'], ['questions', 'Domande', 'list'], ['reports', 'Segnalazioni', 'inbox']] as [Tab, string, IconName][]).map(([t, label, icon]) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex items-center justify-center gap-1.5 flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${tab === t ? 'bg-[rgb(32,44,71)] text-white shadow' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <Icon name={icon} className="w-4 h-4" />
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

// ─── Helper: genera password temporanea ───────────────────────────────────────
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [resetModal, setResetModal] = useState<Profile | null>(null);
  const [tempPassword, setTempPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const load = useCallback(async () => {
    setProfiles(await getAllProfiles());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3500);
  };

  const toggle = async (id: string, field: 'is_active' | 'is_admin', val: boolean) => {
    const { error } = await updateProfile(id, { [field]: val });
    if (error) flash('err', error);
    else { flash('ok', 'Aggiornato.'); load(); }
  };

  const activateAll = async (ids: string[]) => {
    if (ids.length === 0) return;
    const results = await Promise.all(ids.map(id => updateProfile(id, { is_active: true })));
    const failed = results.filter(r => r.error).length;
    if (failed) flash('err', `${failed} attivazioni non riuscite.`);
    else flash('ok', `${ids.length} ${ids.length === 1 ? 'utente attivato' : 'utenti attivati'}.`);
    load();
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
      const token = session?.access_token ?? '';

      const res = await fetch('/api/admin/deleteuser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: id }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore eliminazione.');

      flash('ok', 'Utente eliminato definitivamente.');
      setConfirmDel(null);
      load();
    } catch (e: any) {
      flash('err', e.message);
      setConfirmDel(null);
    }
  };

  const openReset = (p: Profile) => {
    setTempPassword(generateTempPassword());
    setResetDone(false);
    setResetModal(p);
  };

  const handleResetPassword = async () => {
    if (!resetModal) return;
    setResetLoading(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: resetModal.id, newPassword: tempPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Errore sconosciuto');
      setResetDone(true);
    } catch (e: any) {
      flash('err', e.message);
      setResetModal(null);
    } finally {
      setResetLoading(false);
    }
  };

  if (loading) return <Spinner className="mt-10" />;

  const q = search.toLowerCase();
  const filterProfiles = (list: Profile[]) =>
    list.filter(p =>
      p.display_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q)
    );

  const pending = filterProfiles(profiles.filter(p => !p.is_active));
  const active = filterProfiles(profiles.filter(p => p.is_active));

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cerca per nome o email…"
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {pending.length > 0 && (
        <Card className="border-2 border-amber-200">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h3 className="font-semibold text-amber-700 text-sm flex items-center gap-1.5"><Icon name="clock" className="w-4 h-4" />In attesa di attivazione ({pending.length})</h3>
            <button onClick={() => activateAll(pending.map(p => p.id))}
              className="text-xs bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors inline-flex items-center gap-1.5">
              <Icon name="check" className="w-3.5 h-3.5" />Attiva tutti
            </button>
          </div>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-amber-50 rounded-xl">
                <div className="min-w-0">
                  <div className="font-medium text-gray-800 text-sm flex items-center gap-2">
                    {p.display_name}
                    {p.year != null && <span className="text-[10px] font-bold bg-white text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{p.year}º</span>}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{p.email}</div>
                </div>
                <button onClick={() => toggle(p.id, 'is_active', true)}
                  className="flex-shrink-0 text-xs bg-emerald-500 text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-emerald-600 transition-colors">
                  Attiva
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm uppercase tracking-wide">
          Utenti attivi ({active.length})
        </h3>
        <div className="space-y-2">
          {active.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">Nessun utente trovato.</p>
          )}
          {active.map(p => (
            <div key={p.id} className="p-3 bg-[rgb(240,242,247)] rounded-xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[rgb(32,44,71)] text-sm">{p.display_name}</span>
                    {p.year != null && <span className="text-[10px] font-bold bg-[color:var(--sig-soft)] text-[color:var(--sig)] px-1.5 py-0.5 rounded-full">{p.year}º Anno</span>}
                    {p.is_admin && <span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">Admin</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{p.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => openReset(p)}
                    className="inline-flex items-center gap-1.5 text-xs bg-white border border-blue-200 text-blue-600 font-medium px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors">
                    <Icon name="key" className="w-3.5 h-3.5" />Reset pwd
                  </button>
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

      {resetModal && (
        <Modal title="Reset password" onClose={() => { setResetModal(null); setResetDone(false); }}>
          {resetDone ? (
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" className="h-7 w-7" strokeWidth={2.4} /></div>
              <p className="font-semibold text-[rgb(32,44,71)] mb-2">Password impostata!</p>
              <p className="text-sm text-gray-500 mb-4">
                Comunica questa password temporanea a <strong>{resetModal.display_name}</strong>.<br />
                Al primo accesso dovrà cambiarla.
              </p>
              <div className="bg-gray-100 rounded-xl px-6 py-3 font-mono text-lg font-bold tracking-widest text-[rgb(32,44,71)] mb-6 select-all">
                {tempPassword}
              </div>
              <button onClick={() => { setResetModal(null); setResetDone(false); }}
                className="btn-primary px-8">
                Chiudi
              </button>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Stai per impostare una password temporanea per <strong>{resetModal.display_name}</strong> ({resetModal.email}).
              </p>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">Password temporanea generata</p>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-[rgb(32,44,71)] tracking-widest">{tempPassword}</span>
                  <button
                    onClick={() => setTempPassword(generateTempPassword())}
                    className="text-xs text-blue-500 hover:text-blue-700 underline">
                    Rigenera
                  </button>
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-1.5">
                <Icon name="alert" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>L&apos;utente dovrà cambiare questa password al primo accesso. Comunicagliela privatamente.</span>
              </p>
              <div className="flex gap-3">
                <button onClick={() => setResetModal(null)}
                  className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
                  Annulla
                </button>
                <button onClick={handleResetPassword} disabled={resetLoading}
                  className="flex-1 btn-primary py-2.5 text-sm">
                  {resetLoading ? 'Salvataggio…' : 'Imposta password'}
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
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
              <span className="w-9 h-9 rounded-lg bg-[color:var(--navy-pale)] flex items-center justify-center text-[rgb(32,44,71)] flex-shrink-0"><CourseIcon icon={course.icon} className="w-5 h-5" /></span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[rgb(32,44,71)]">{course.name}</h3>
                  {/* ── NUOVO: badge anno di corso ── */}
                  {course.year != null && (
                    <span className="text-xs font-semibold bg-[rgb(32,44,71)] text-white px-2 py-0.5 rounded-full">
                      {course.year}° Anno
                    </span>
                  )}
                </div>
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
    icon: initial.icon ?? 'pulse',
    accent_color: initial.accent_color ?? 'bg-blue-600',
    text_color: initial.text_color ?? 'text-blue-700',
    border_color: initial.border_color ?? 'border-blue-200',
    is_available: initial.is_available ?? true,
    exam_rules: initial.exam_rules ?? DEFAULT_RULES,
    year: initial.year ?? null,             // ← NUOVO: anno di corso
    ...(initial.id ? { id: initial.id } : {}),
  });
  const [courseAreas, setCourseAreas] = useState<MacroArea[]>([]);
  const [distribution, setDistribution] = useState<Record<string, number>>(initial.exam_rules?.distribution ?? {});
  const [preDistribution, setPreDistribution] = useState<Record<string, number>>(initial.exam_rules?.preselection?.distribution ?? {});
  const [iconError, setIconError] = useState('');

  const handleIconUpload = (file: File) => {
    setIconError('');
    if (!file.type.startsWith('image/')) { setIconError('Formato non valido: usa PNG, SVG, JPG o WebP.'); return; }
    if (file.size > 5 * 1024 * 1024) { setIconError('File troppo grande (max 5 MB).'); return; }

    const reader = new FileReader();
    reader.onerror = () => setIconError('Impossibile leggere il file. Riprova.');
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => setIconError('Immagine non valida. Riprova.');
      img.onload = () => {
        // 1. Disegna la sorgente su un canvas di lavoro (max 512px per limitare la scansione).
        const WORK = 512;
        const iw0 = img.naturalWidth || img.width || 256;
        const ih0 = img.naturalHeight || img.height || 256;
        const ws = Math.min(1, WORK / Math.max(iw0, ih0));
        const iw = Math.max(1, Math.round(iw0 * ws));
        const ih = Math.max(1, Math.round(ih0 * ws));
        const work = document.createElement('canvas');
        work.width = iw; work.height = ih;
        const wctx = work.getContext('2d');
        if (!wctx) { setIconError('Elaborazione non riuscita. Riprova.'); return; }
        wctx.drawImage(img, 0, 0, iw, ih);

        // 2. Ritaglia il bordo trasparente (bounding box dei pixel opachi).
        let minX = iw, minY = ih, maxX = 0, maxY = 0, found = false;
        try {
          const { data } = wctx.getImageData(0, 0, iw, ih);
          for (let y = 0; y < ih; y++) {
            for (let x = 0; x < iw; x++) {
              if (data[(y * iw + x) * 4 + 3] > 12) {
                found = true;
                if (x < minX) minX = x; if (x > maxX) maxX = x;
                if (y < minY) minY = y; if (y > maxY) maxY = y;
              }
            }
          }
        } catch { found = false; }
        if (!found) { minX = 0; minY = 0; maxX = iw - 1; maxY = ih - 1; } // es. JPG senza trasparenza
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;

        // 3. Scala il contenuto per riempire ~82% di un riquadro 128px (stesso "peso" delle icone).
        const BOX = 128, CONTENT = 106;
        const s = CONTENT / Math.max(cw, ch);
        const dw = Math.max(1, Math.round(cw * s));
        const dh = Math.max(1, Math.round(ch * s));
        const out = document.createElement('canvas');
        out.width = BOX; out.height = BOX;
        const octx = out.getContext('2d');
        if (!octx) { setIconError('Elaborazione non riuscita. Riprova.'); return; }
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(work, minX, minY, cw, ch, (BOX - dw) / 2, (BOX - dh) / 2, dw, dh);
        setForm(f => ({ ...f, icon: out.toDataURL('image/png') }));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

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
    { label: 'Blu', accent: 'bg-blue-600', text: 'text-blue-700', border: 'border-blue-200', preview: 'bg-blue-600' },
    { label: 'Verde', accent: 'bg-emerald-600', text: 'text-emerald-700', border: 'border-emerald-200', preview: 'bg-emerald-600' },
    { label: 'Viola', accent: 'bg-purple-600', text: 'text-purple-700', border: 'border-purple-200', preview: 'bg-purple-600' },
    { label: 'Rosso', accent: 'bg-rose-600', text: 'text-rose-700', border: 'border-rose-200', preview: 'bg-rose-600' },
    { label: 'Arancio', accent: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-200', preview: 'bg-orange-500' },
    { label: 'Azzurro', accent: 'bg-cyan-600', text: 'text-cyan-700', border: 'border-cyan-200', preview: 'bg-cyan-600' },
  ];

  return (
    <Modal title={initial.id ? 'Modifica materia' : 'Nuova materia'} onClose={onClose}>
      <div className="space-y-5">

        {/* Basic info */}
        <Input label="Nome materia *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="es. Farmacologia" />
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Icona</p>
          <div className="grid grid-cols-7 gap-2">
            {COURSE_ICONS.map(({ key, label }) => (
              <button key={key} type="button" title={label}
                onClick={() => setForm(f => ({ ...f, icon: key }))}
                className={`aspect-square flex items-center justify-center rounded-xl border-2 transition-all ${form.icon === key ? 'border-[rgb(32,44,71)] bg-[color:var(--sig-soft)] text-[color:var(--sig)]' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                <Icon name={key} className="w-5 h-5" />
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500">Attuale:</span>
            <span className="w-9 h-9 rounded-lg border border-gray-200 bg-[color:var(--navy-pale)] flex items-center justify-center text-[rgb(32,44,71)]"><CourseIcon icon={form.icon} className="w-5 h-5" /></span>
            <label className="text-xs font-semibold text-[rgb(32,44,71)] border border-gray-200 rounded-lg px-3 py-1.5 cursor-pointer hover:bg-gray-50 inline-flex items-center gap-1.5">
              <Icon name="upload" className="w-3.5 h-3.5" />Carica icona
              <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleIconUpload(f); e.target.value = ''; }} />
            </label>
            {isImageIcon(form.icon) && (
              <button type="button" onClick={() => setForm(f => ({ ...f, icon: 'pulse' }))} className="text-xs text-red-500 hover:underline">Rimuovi</button>
            )}
          </div>
          {iconError
            ? <p className="mt-1.5 text-[11px] text-red-500">{iconError}</p>
            : <p className="mt-1.5 text-[11px] text-gray-400">Scegli dal catalogo o carica la tua (PNG, SVG, JPG, WebP). Vengono ridimensionate e ritagliate automaticamente per riempire il riquadro.</p>}
        </div>
        <Input label="Sottotitolo" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} placeholder="es. Aree principali del corso" />

        {/* ── NUOVO: Anno di corso ── */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Anno di corso</p>
          <div className="flex flex-wrap gap-2">
            {([null, 1, 2, 3, 4, 5, 6] as (number | null)[]).map(y => (
              <button
                key={y ?? 'none'}
                type="button"
                onClick={() => setForm(f => ({ ...f, year: y }))}
                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-medium transition-all ${
                  form.year === y
                    ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {y == null ? 'Nessuno' : `${y}° Anno`}
              </button>
            ))}
          </div>
        </div>

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
          <p className="text-sm font-semibold text-[rgb(32,44,71)] mb-3 flex items-center gap-2"><Icon name="clock" className="w-4 h-4" />Regole esame</p>
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
            <input type="checkbox" id="nonav" checked={!!rule.no_navigation} onChange={e => setRule({ no_navigation: e.target.checked })} className="accent-[rgb(32,44,71)]" />
            <label htmlFor="nonav" className="text-sm text-gray-600 cursor-pointer">Blocca la navigazione (vietato tornare indietro, conferma per ogni domanda)</label>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input type="checkbox" id="twophase" checked={rule.exam_type === 'two_phase'} onChange={e => setRule({ exam_type: e.target.checked ? 'two_phase' : 'standard' })} className="accent-[rgb(32,44,71)]" />
            <label htmlFor="twophase" className="text-sm text-gray-600 cursor-pointer">Esame bifasico (preselezione + esame)</label>
          </div>

          {rule.exam_type === 'two_phase' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5"><Icon name="sliders" className="w-3.5 h-3.5" />Configura la fase di preselezione</p>
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
                La distribuzione delle domande di preselezione si configura come per l&apos;esame principale qui sopra, nella sezione &quot;Domande per area&quot;.
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
                <p className="text-sm font-semibold text-[rgb(32,44,71)] flex items-center gap-1.5">
                  <Icon name="chart" className="w-4 h-4" />{rule.exam_type === 'two_phase' ? 'Domande per area — Esame vero' : "Domande per area nell'esame"}
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
                <p className="text-xs text-gray-400 mt-2 flex items-start gap-1.5">
                  <Icon name="bulb" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>Il totale domande dell&apos;esame verrà impostato automaticamente a <strong>{distTotal}</strong>.</span>
                </p>
              )}
            </div>

            {/* Preselection distribution — only for two-phase */}
            {rule.exam_type === 'two_phase' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><Icon name="zap" className="w-3.5 h-3.5" />Domande per area — Preselezione</p>
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
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-start gap-1.5">
            <Icon name="bulb" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" /><span>La distribuzione delle domande per area sarà disponibile dopo aver creato la materia e aggiunto le macro-aree.</span>
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

function parseCorrect(val: unknown, optCount: number): number[] {
  if (val === null || val === undefined || String(val).trim() === '') return [];
  const str = String(val).trim().toUpperCase();
  return str.split(/[,;]/).map(s => s.trim()).reduce<number[]>((acc, token) => {
    if (/^[A-Z]$/.test(token)) { const idx = token.charCodeAt(0) - 65; if (idx < optCount) acc.push(idx); }
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
  const [showDownload, setShowDownload] = useState(false);
  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  useEffect(() => { getCourses().then(setCourses); }, []);

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
    (statusFilter === 'all' || (statusFilter === 'active' ? q.is_active : !q.is_active)) &&
    (!searchText || q.question_text.toLowerCase().includes(searchText.toLowerCase()))
  );
  const visibleTopics = allTopics.filter(t => !filterArea || t.macro_area_id === filterArea);

  // Paginazione + reset quando cambiano filtri/materia.
  const pageCount = Math.max(1, Math.ceil(filteredQs.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageQs = filteredQs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  useEffect(() => { setPage(1); setSelectedIds(new Set()); }, [filterArea, filterTopic, searchText, statusFilter, selectedCourse]);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allPageSelected = pageQs.length > 0 && pageQs.every(q => selectedIds.has(q.id));
  const toggleSelectPage = () =>
    setSelectedIds(prev => { const n = new Set(prev); allPageSelected ? pageQs.forEach(q => n.delete(q.id)) : pageQs.forEach(q => n.add(q.id)); return n; });

  const bulkSetActive = async (active: boolean) => {
    const ids = Array.from(selectedIds);
    const { error } = await setQuestionsActive(ids, active, selectedCourse);
    if (error) flash('err', error);
    else { flash('ok', `${ids.length} ${ids.length === 1 ? 'domanda' : 'domande'} ${active ? 'attivate' : 'disattivate'}.`); setSelectedIds(new Set()); reload(); }
  };
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (!confirm(`Eliminare definitivamente ${ids.length} domande selezionate?`)) return;
    const { error } = await deleteQuestions(ids, selectedCourse);
    if (error) flash('err', error);
    else { flash('ok', `${ids.length} domande eliminate.`); setSelectedIds(new Set()); reload(); }
  };

  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
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
    ws['!cols'] = [20, 25, 50, 20, 20, 20, 20, 20, 10, 40].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domande');
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

  // ── Scarica Excel con tutte le domande ──
  const downloadExcel = async () => {
    const XLSX = await import('xlsx');
    const courseName = courses.find(c => c.id === selectedCourse)?.name ?? 'domande';
    const areaMap = new Map(areas.map(a => [a.id, a.name]));
    const topicMap = new Map(allTopics.map(t => [t.id, t.name]));

    const rows: string[][] = [
      ['macro_area', 'topic', 'question_text', 'option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'correct', 'explanation'],
    ];
    questions.forEach(q => {
      const letters = q.correct_answers.map(i => String.fromCharCode(65 + i)).join(',');
      const opts = [...q.options, '', '', '', '', ''].slice(0, 5);
      rows.push([
        areaMap.get(q.macro_area_id) ?? '',
        topicMap.get(q.topic_id) ?? '',
        q.question_text,
        opts[0], opts[1], opts[2], opts[3], opts[4],
        letters,
        q.explanation ?? '',
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [25, 30, 60, 25, 25, 25, 25, 25, 10, 50].map(w => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Domande');
    XLSX.writeFile(wb, `${courseName}_domande.xlsx`);
  };

  // ── Scarica PDF con tutte le domande e risposte ──
  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const courseName = courses.find(c => c.id === selectedCourse)?.name ?? 'Domande';
    const areaMap = new Map(areas.map(a => [a.id, a.name]));
    const topicMap = new Map(allTopics.map(t => [t.id, t.name]));

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 15;
    const maxW = pageW - margin * 2;
    let y = margin;

    const checkPage = (needed: number) => {
      if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
    };

    const writeWrapped = (text: string, x: number, fontSize: number, color: [number,number,number] = [30,30,30], bold = false) => {
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, maxW - (x - margin));
      checkPage(lines.length * (fontSize * 0.4) + 2);
      doc.text(lines, x, y);
      y += lines.length * (fontSize * 0.4) + 2;
    };

    // Titolo
    doc.setFillColor(32, 44, 71);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text(courseName, margin, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`${questions.length} domande · Generato il ${new Date().toLocaleDateString('it-IT')}`, margin, 20);
    y = 30;

    let currentArea = '';
    questions.forEach((q, idx) => {
      const areaName = areaMap.get(q.macro_area_id) ?? '';
      const topicName = topicMap.get(q.topic_id) ?? '';

      // Intestazione area (se cambia)
      if (areaName !== currentArea) {
        currentArea = areaName;
        checkPage(12);
        y += 3;
        doc.setFillColor(240, 242, 247);
        doc.roundedRect(margin, y - 5, maxW, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(32, 44, 71);
        doc.text(areaName.toUpperCase(), margin + 3, y + 1);
        y += 8;
      }

      checkPage(20);
      // Numero domanda
      doc.setFillColor(32, 44, 71);
      doc.circle(margin + 3, y - 1, 3, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text(String(idx + 1), margin + 3, y, { align: 'center' });

      // Argomento
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(120, 120, 120);
      doc.text(topicName, margin + 8, y - 2);

      // Testo domanda
      y += 2;
      writeWrapped(q.question_text, margin + 8, 9.5, [30, 30, 30], true);

      // Opzioni
      q.options.forEach((opt, i) => {
        const isCorrect = q.correct_answers.includes(i);
        const letter = String.fromCharCode(65 + i);
        checkPage(6);
        if (isCorrect) {
          doc.setFillColor(220, 252, 231);
          doc.roundedRect(margin + 8, y - 4, maxW - 8, 5.5, 1, 1, 'F');
        }
        doc.setFont('helvetica', isCorrect ? 'bold' : 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(isCorrect ? 22 : 80, isCorrect ? 101 : 80, isCorrect ? 52 : 80);
        const lines = doc.splitTextToSize(`${letter}. ${opt}`, maxW - 12);
        doc.text(lines, margin + 10, y);
        y += lines.length * 3.8 + 1;
      });

      // Spiegazione
      if (q.explanation) {
        checkPage(8);
        y += 1;
        doc.setFillColor(255, 251, 235);
        const expLines = doc.splitTextToSize(`💡 ${q.explanation}`, maxW - 10);
        doc.roundedRect(margin + 8, y - 4, maxW - 8, expLines.length * 3.8 + 4, 1, 1, 'F');
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(120, 80, 20);
        doc.text(expLines, margin + 11, y);
        y += expLines.length * 3.8 + 3;
      }

      y += 4;

      // Numero pagina
      const pageCount = (doc.internal as any).getNumberOfPages();
      for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(`Pagina ${p} di ${pageCount}`, pageW - margin, pageH - 7, { align: 'right' });
        doc.text('UniQuiz', margin, pageH - 7);
      }
    });

    doc.save(`${courseName}_domande.pdf`);
  };

  const handleImport = async (file: File) => {
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (rows.length === 0) { flash('err', 'Il file è vuoto o non ha righe dati.'); return; }
    const areaMap = new Map(areas.map(a => [a.name.trim().toLowerCase(), a]));
    const topicMap = new Map(allTopics.map(t => [t.name.trim().toLowerCase(), t]));
    const toInsert: Array<Omit<Question, 'id' | 'created_at' | 'updated_at'>> = [];
    const errors: string[] = [];
    rows.forEach((row, i) => {
      const rowN = i + 2;
      const areaName = String(row['macro_area'] ?? '').trim();
      const topicName = String(row['topic'] ?? '').trim();
      const questionText = String(row['question_text'] ?? '').trim();
      if (!areaName || !topicName || !questionText) { errors.push(`Riga ${rowN}: macro_area, topic o question_text mancante.`); return; }
      const area = areaMap.get(areaName.toLowerCase());
      if (!area) { errors.push(`Riga ${rowN}: macro_area "${areaName}" non trovata. Controlla la grafia.`); return; }
      const topic = topicMap.get(topicName.toLowerCase());
      if (!topic) { errors.push(`Riga ${rowN}: topic "${topicName}" non trovato. Controlla la grafia.`); return; }
      const optKeys = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e'];
      const opts = optKeys.map(k => String(row[k] ?? '').trim()).filter(o => o !== '');
      if (opts.length < 2) { errors.push(`Riga ${rowN}: almeno 2 opzioni richieste.`); return; }
      const correctRaw = row['correct'];
      const correctIdxs = parseCorrect(correctRaw, opts.length);
      if (correctIdxs.length === 0) { errors.push(`Riga ${rowN}: colonna "correct" non valida ("${correctRaw}"). Usa A, B, C… oppure 1, 2, 3… anche separati da virgola.`); return; }
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

      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Seleziona materia</p>
        <div className="flex flex-wrap gap-2">
          {courses.map(c => (
            <button key={c.id} onClick={() => setSelectedCourse(c.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${selectedCourse === c.id ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white shadow-sm' : 'border-gray-200 bg-white text-gray-700 hover:border-[rgb(32,44,71)] hover:text-[rgb(32,44,71)]'}`}>
              <CourseIcon icon={c.icon} className="w-4 h-4" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

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

      {selectedCourse && (
        <div className="flex items-center gap-2 flex-wrap">
          {(['all', 'active', 'inactive'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${statusFilter === s ? 'bg-[rgb(32,44,71)] text-white border-[rgb(32,44,71)]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}>
              {s === 'all' ? 'Tutte' : s === 'active' ? 'Attive' : 'Disattivate'}
            </button>
          ))}
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
            <input type="checkbox" checked={allPageSelected} onChange={toggleSelectPage} className="w-4 h-4 accent-[rgb(32,44,71)]" />
            Seleziona pagina
          </label>
        </div>
      )}

      {selectedCourse && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap p-2.5 bg-[rgb(32,44,71)] rounded-xl text-white text-sm sticky top-2 z-10 shadow-md">
          <span className="font-semibold px-1">{selectedIds.size} selezionate</span>
          <button onClick={() => bulkSetActive(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 rounded-lg"><Icon name="check" className="w-3.5 h-3.5" />Attiva</button>
          <button onClick={() => bulkSetActive(false)} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg"><Icon name="eye" className="w-3.5 h-3.5" />Disattiva</button>
          <button onClick={bulkDelete} className="inline-flex items-center gap-1.5 text-xs font-semibold bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg"><Icon name="trash" className="w-3.5 h-3.5" />Elimina</button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs font-medium text-blue-200 hover:text-white px-2">Annulla</button>
        </div>
      )}

      {selectedCourse && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-500">{filteredQs.length} domande</p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={downloadTemplate}
              className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 text-gray-600 font-medium px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Scarica template
            </button>
            {/* ── NUOVO: Scarica domande ── */}
            {questions.length > 0 && (
              <button onClick={() => setShowDownload(true)}
                className="flex items-center gap-1.5 text-sm bg-blue-50 border border-blue-200 text-blue-700 font-medium px-3 py-2 rounded-xl hover:bg-blue-100 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Scarica domande
              </button>
            )}
            <button onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 text-sm bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-3 py-2 rounded-xl hover:bg-emerald-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importa Excel
            </button>
            <button onClick={() => { setEditing({}); setShowModal(true); }} className="btn-primary text-sm py-2 px-4">
              + Nuova domanda
            </button>
            {/* ── NUOVO: Elimina tutte ── */}
            {questions.length > 0 && (
              <button onClick={() => setShowBulkDelete(true)}
                className="flex items-center gap-1.5 text-sm bg-white border border-red-200 text-red-500 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Elimina tutte
              </button>
            )}
          </div>
        </div>
      )}

      {loading && <Spinner className="mt-10" />}

      {!loading && selectedCourse && pageQs.map(q => (
        <Card key={q.id} className={`border ${selectedIds.has(q.id) ? 'border-[rgb(32,44,71)] ring-1 ring-[rgb(32,44,71)]' : 'border-gray-100'}`}>
          <div className="flex items-start justify-between gap-3">
            <input type="checkbox" checked={selectedIds.has(q.id)} onChange={() => toggleSelect(q.id)}
              className="mt-1 w-4 h-4 flex-shrink-0 accent-[rgb(32,44,71)] cursor-pointer" />
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

      {!loading && selectedCourse && pageCount > 1 && (
        <div className="flex items-center justify-center gap-2 pt-1">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage <= 1}
            className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            <Icon name="chevron-left" className="w-4 h-4" />Prec.
          </button>
          <span className="text-sm text-gray-500 tabular-nums px-2">Pagina {safePage} di {pageCount}</span>
          <button onClick={() => setPage(p => Math.min(pageCount, p + 1))} disabled={safePage >= pageCount}
            className="inline-flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-40 hover:bg-gray-50">
            Succ.<Icon name="chevron-right" className="w-4 h-4" />
          </button>
        </div>
      )}

      {!loading && selectedCourse && filteredQs.length === 0 && (
        <Card className="text-center py-10 text-gray-400">
          <Icon name="inbox" className="w-9 h-9 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">Nessuna domanda trovata.</p>
          <p className="text-sm mt-1">Importa un file Excel o aggiungi domande manualmente.</p>
        </Card>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onDownloadTemplate={downloadTemplate}
          onImport={handleImport}
        />
      )}

      {/* ── NUOVO: Modal scarica domande ── */}
      {showDownload && (
        <Modal title="Scarica domande" onClose={() => setShowDownload(false)}>
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Scarica tutte le <strong>{questions.length} domande</strong> della materia selezionata.
            </p>
            <button
              onClick={() => { downloadExcel(); setShowDownload(false); }}
              className="flex items-center gap-3 w-full p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-800 text-sm">Scarica Excel (.xlsx)</p>
                <p className="text-xs text-emerald-600 mt-0.5">Formato importabile — stesso schema del template</p>
              </div>
            </button>
            <button
              onClick={() => { downloadPDF(); setShowDownload(false); }}
              className="flex items-center gap-3 w-full p-4 bg-red-50 border-2 border-red-200 rounded-xl hover:bg-red-100 transition-colors text-left">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-red-800 text-sm">Scarica PDF</p>
                <p className="text-xs text-red-600 mt-0.5">Domande con opzioni e risposte corrette evidenziate</p>
              </div>
            </button>
          </div>
        </Modal>
      )}

      {/* ── NUOVO: Modal elimina tutte le domande ── */}
      {showBulkDelete && (
        <BulkDeleteModal
          courseName={courses.find(c => c.id === selectedCourse)?.name ?? ''}
          count={questions.length}
          onClose={() => setShowBulkDelete(false)}
          onConfirm={async () => {
            const { supabase } = await import('@/lib/supabase');
            const { error } = await supabase
              .from('questions')
              .delete()
              .eq('course_id', selectedCourse);
            if (error) { flash('err', 'Errore durante l\'eliminazione.'); }
            else { flash('ok', `✅ ${questions.length} domande eliminate.`); reload(); }
            setShowBulkDelete(false);
          }}
        />
      )}

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

// ─── BULK DELETE MODAL ────────────────────────────────────────────────────────
function BulkDeleteModal({ courseName, count, onClose, onConfirm }: {
  courseName: string;
  count: number;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const CONFIRM_PHRASE = 'elimina tutte le domande';
  const [text, setText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const isValid = text.trim().toLowerCase() === CONFIRM_PHRASE;

  const handleConfirm = async () => {
    if (!isValid) return;
    setDeleting(true);
    await onConfirm();
    setDeleting(false);
  };

  return (
    <Modal title="Elimina tutte le domande" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
          <p className="text-sm font-semibold text-red-700 mb-1">Questa azione è irreversibile</p>
          <p className="text-sm text-red-600">
            Stai per eliminare <strong>{count} domande</strong> dalla materia <strong>{courseName}</strong>.
            Non sarà possibile recuperarle.
          </p>
        </div>

        <div>
          <p className="text-sm text-gray-700 mb-2">
            Per confermare, scrivi esattamente:
          </p>
          <p className="font-mono font-bold text-sm text-gray-800 bg-gray-100 rounded-lg px-3 py-2 mb-3 select-all">
            {CONFIRM_PHRASE}
          </p>
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Scrivi la frase di conferma…"
            className={`w-full border-2 rounded-xl px-4 py-2.5 text-base focus:outline-none transition-colors ${
              text.length > 0
                ? isValid
                  ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-300'
                  : 'border-red-300 focus:ring-2 focus:ring-red-200'
                : 'border-gray-300 focus:ring-2 focus:ring-gray-200'
            }`}
            autoFocus
          />
          {text.length > 0 && !isValid && (
            <p className="text-xs text-red-500 mt-1">La frase non è corretta. Rispetta lettere minuscole e spazi.</p>
          )}
          {isValid && (
            <p className="text-xs text-emerald-600 mt-1">✓ Frase corretta — puoi procedere.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
            Annulla
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid || deleting}
            className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition-colors ${
              isValid
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}>
            {deleting ? 'Eliminazione…' : `Elimina ${count} domande`}
          </button>
        </div>
      </div>
    </Modal>
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

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-sm font-semibold text-gray-700 mb-2">Passo 2 — Compila il file</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>• <strong>macro_area</strong> e <strong>topic</strong>: copia i nomi esatti dal secondo foglio del template</p>
            <p>• <strong>option_a … option_e</strong>: le opzioni di risposta (option_e può essere vuota per 4 opzioni)</p>
            <p>• <strong>correct</strong>: la lettera della risposta corretta: <code className="bg-gray-100 px-1 rounded">A</code>, <code className="bg-gray-100 px-1 rounded">B</code>, ecc. Per risposte multiple: <code className="bg-gray-100 px-1 rounded">A,C</code></p>
            <p>• <strong>explanation</strong>: facoltativa, viene mostrata dopo la risposta nell&apos;esercitazione</p>
          </div>
        </div>

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
                <Icon name="check" className="w-6 h-6 mb-1 text-emerald-600" strokeWidth={2.4} />
                <p className="text-sm font-semibold text-emerald-700">{file.name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">{(file.size / 1024).toFixed(1)} KB — clicca per cambiare</p>
              </>
            ) : (
              <>
                <Icon name="upload" className="w-6 h-6 mb-1 text-gray-400" />
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
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('pending');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [editingReport, setEditingReport] = useState<QuestionReport | null>(null);
  const [editQuestion, setEditQuestion] = useState<Question | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editText, setEditText] = useState('');
  const [editOptions, setEditOptions] = useState<string[]>([]);
  const [editCorrects, setEditCorrects] = useState<number[]>([]);
  const [editExplanation, setEditExplanation] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    // Auto-pulizia: rimuove le risolte più vecchie di 24h prima di mostrare la lista.
    await purgeOldResolvedReports(24);
    const data = await getReports(filter === 'all' ? undefined : filter);
    setReports(data);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const flash = (type: 'ok' | 'err', text: string) => { setMsg({ type, text }); setTimeout(() => setMsg(null), 3000); };

  const setStatus = async (id: string, status: 'pending' | 'resolved') => {
    const { error } = await updateReportStatus(id, status);
    if (error) flash('err', error);
    else { flash('ok', 'Stato aggiornato.'); load(); }
  };

  const handleDelete = async (id: string) => {
    const { error } = await deleteReport(id);
    if (error) flash('err', error);
    else { flash('ok', 'Segnalazione eliminata.'); load(); }
  };

  const clearResolved = async () => {
    if (!confirm('Eliminare definitivamente tutte le segnalazioni risolte?')) return;
    const { error } = await deleteResolvedReports();
    if (error) flash('err', error);
    else { flash('ok', 'Segnalazioni risolte eliminate.'); load(); }
  };

  const openEdit = async (r: QuestionReport) => {
    setEditingReport(r);
    setEditLoading(true);
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
  resolved: 'bg-emerald-100 text-emerald-700',
};
const statusLabel: Record<string, string> = {
  pending: 'Aperta',
  resolved: 'Risolta',
};

  return (
    <div className="space-y-4">
      {msg && <Alert type={msg.type} message={msg.text} />}

      <div className="flex gap-2 flex-wrap items-center">
        {(['all', 'pending', 'resolved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-sm font-medium px-4 py-2 rounded-xl border-2 transition-all ${filter === f ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
            {f === 'all' ? 'Tutte' : statusLabel[f]}
          </button>
        ))}
        <button onClick={clearResolved}
          className="ml-auto inline-flex items-center gap-1.5 text-xs font-semibold text-red-600 border border-red-200 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors">
          <Icon name="trash" className="w-3.5 h-3.5" />Svuota risolte
        </button>
      </div>
      <p className="text-[11px] text-gray-400 -mt-2 flex items-center gap-1.5">
        <Icon name="clock" className="w-3 h-3" />Le segnalazioni risolte vengono eliminate automaticamente dopo 24 ore.
      </p>

      {loading && <Spinner className="mt-10" />}

      {!loading && reports.length === 0 && (
        <Card className="text-center py-10 text-gray-400">
          <Icon name="check" className="w-9 h-9 mx-auto mb-3 text-emerald-400" strokeWidth={2.2} />
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
                {r.course_name && (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-[color:var(--sig-soft)] text-[color:var(--sig)]">
                    <Icon name="book" className="w-3 h-3" />{r.course_name}
                  </span>
                )}
                <span className="text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2 inline-flex items-center gap-1.5">
                <Icon name="user" className="w-3.5 h-3.5 text-gray-400" />
                Segnalata da <span className="font-semibold text-[rgb(32,44,71)]">{r.user_name || 'Utente sconosciuto'}</span>
              </p>
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

          <div className="flex gap-2 flex-wrap mt-2">
            <button onClick={() => openEdit(r)}
              className="flex items-center gap-1.5 text-xs bg-[rgb(32,44,71)] text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-[rgb(52,69,110)] transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modifica domanda
            </button>
            {r.status !== 'resolved' && (
              <button onClick={() => setStatus(r.id, 'resolved')}
                className="text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 font-medium px-3 py-1.5 rounded-lg hover:bg-emerald-100 transition-colors">
                Risolta
              </button>
            )}
            {r.status !== 'pending' && (
              <button onClick={() => setStatus(r.id, 'pending')}
                className="text-xs bg-white border border-gray-200 text-gray-500 font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors">
                ↩ Riapri
              </button>
            )}
            <button onClick={() => handleDelete(r.id)}
              className="inline-flex items-center gap-1.5 text-xs bg-white border border-red-200 text-red-500 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
              <Icon name="trash" className="w-3.5 h-3.5" />Elimina
            </button>
          </div>
        </Card>
      ))}

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
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <p className="font-semibold flex items-center gap-1.5"><Icon name="alert" className="w-3.5 h-3.5" />Segnalazione studente:</p>
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
