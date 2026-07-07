'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/authHelpers';
import { supabase } from '@/lib/supabase';
import { getAccountSummary, updateProfile, type AccountSummary } from '@/lib/db';
import { PageShell, Card, Spinner, Modal } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function AccountPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const [fetching, setFetching] = useState(true);
  const [editName, setEditName] = useState(false);
  const [changePw, setChangePw] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/login'); }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getAccountSummary(user.id).then(s => { setSummary(s); setFetching(false); });
  }, [user?.id]);

  if (loading || !user) return <PageShell><Spinner className="mt-20" /></PageShell>;

  const stats: { icon: IconName; value: string | number; label: string }[] = [
    { icon: 'help',   value: summary?.totalQuestions ?? '—', label: 'Domande svolte' },
    { icon: 'target', value: summary ? `${summary.accuracy}%` : '—', label: 'Accuratezza media' },
    { icon: 'clock',  value: summary?.exams ?? '—', label: 'Esami simulati' },
    { icon: 'award',  value: summary?.bestScore ?? '—', label: 'Miglior voto' },
  ];

  const handleLogout = async () => { await signOut(); router.push('/login'); };

  return (
    <PageShell>
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl hover:bg-gray-200 transition-colors">
            <Icon name="chevron-left" className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Account</h2>
        </div>

        {/* Identità */}
        <Card className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[color:var(--sig-soft)] text-[color:var(--sig)] flex items-center justify-center font-extrabold text-lg flex-shrink-0">
            {initials(user.display_name)}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-[rgb(32,44,71)] text-lg leading-tight truncate">{user.display_name}</h3>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 truncate"><Icon name="mail" className="w-3.5 h-3.5 flex-shrink-0" />{user.email}</p>
            <span className="inline-flex items-center gap-1 mt-2 text-xs font-bold px-2.5 py-0.5 rounded-full bg-[color:var(--sig-soft)] text-[color:var(--sig)]">
              <Icon name={user.is_admin ? 'shield' : 'user'} className="w-3 h-3" />{user.is_admin ? 'Amministratore' : 'Studente'}
            </span>
          </div>
          <button onClick={() => setEditName(true)} title="Modifica"
            className="ml-auto self-start w-9 h-9 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 flex items-center justify-center flex-shrink-0">
            <Icon name="edit" className="w-4 h-4" />
          </button>
        </Card>

        {/* Riepilogo globale */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-2.5 px-1">Il tuo percorso</p>
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => (
            <Card key={s.label} className="flex items-center gap-3 p-4">
              <span className="w-9 h-9 rounded-xl bg-[color:var(--sig-soft)] text-[color:var(--sig)] flex items-center justify-center flex-shrink-0">
                <Icon name={s.icon} className="w-5 h-5" />
              </span>
              <span className="min-w-0">
                <b className="block text-lg font-extrabold text-[rgb(32,44,71)] tabular-nums leading-tight">{fetching ? '…' : s.value}</b>
                <span className="text-xs text-gray-400">{s.label}</span>
              </span>
            </Card>
          ))}
        </div>

        {/* Impostazioni */}
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-2.5 px-1">Impostazioni account</p>
        <Card className="p-0 overflow-hidden">
          <button onClick={() => setEditName(true)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
            <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0"><Icon name="user" className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0"><span className="block text-xs text-gray-400">Nome visualizzato</span><span className="block text-sm font-semibold text-[rgb(32,44,71)] truncate">{user.display_name}</span></span>
            <Icon name="chevron-right" className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
          <div className="flex items-center gap-3 px-4 py-3.5 border-t border-gray-100">
            <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0"><Icon name="mail" className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0"><span className="block text-xs text-gray-400">Email</span><span className="block text-sm font-semibold text-[rgb(32,44,71)] truncate">{user.email}</span></span>
            <span className="text-[10.5px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-md flex-shrink-0">Non modificabile</span>
          </div>
          <button onClick={() => setChangePw(true)} className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-100 hover:bg-gray-50 transition-colors text-left">
            <span className="w-9 h-9 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0"><Icon name="lock" className="w-[18px] h-[18px]" /></span>
            <span className="flex-1 min-w-0"><span className="block text-xs text-gray-400">Sicurezza</span><span className="block text-sm font-semibold text-[rgb(32,44,71)]">Cambia password</span></span>
            <Icon name="chevron-right" className="w-4 h-4 text-gray-300 flex-shrink-0" />
          </button>
        </Card>

        {/* Le mie materie */}
        {summary && summary.perCourse.length > 0 && (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mt-6 mb-2.5 px-1">Le mie materie</p>
            <Card className="space-y-3">
              {summary.perCourse.map(c => (
                <button key={c.course_id} onClick={() => router.push(`/course/${c.course_id}`)} className="w-full flex items-center gap-3 text-left group">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700 truncate group-hover:text-[rgb(32,44,71)]">{c.course_name}</span>
                      <span className="font-bold text-[color:var(--sig)] tabular-nums flex-shrink-0">{c.accuracy}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${c.accuracy}%`, backgroundColor: 'var(--sig)' }} />
                    </div>
                  </div>
                </button>
              ))}
            </Card>
          </>
        )}

        <button onClick={handleLogout}
          className="mt-6 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-[1.5px] border-gray-200 text-red-600 font-bold text-sm hover:bg-red-50 hover:border-transparent transition-colors">
          <Icon name="logout" className="w-4 h-4" />Esci dall'account
        </button>
      </div>

      {editName && <EditNameModal current={user.display_name} userId={user.id} onClose={() => setEditName(false)} onSaved={refresh} />}
      {changePw && <ChangePasswordModal onClose={() => setChangePw(false)} />}
    </PageShell>
  );
}

function EditNameModal({ current, userId, onClose, onSaved }: { current: string; userId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(current);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('Il nome non può essere vuoto.'); return; }
    setSaving(true); setError('');
    const { error } = await updateProfile(userId, { display_name: trimmed });
    if (error) { setError('Impossibile salvare. Riprova.'); setSaving(false); return; }
    await onSaved();
    onClose();
  };

  return (
    <Modal title="Nome visualizzato" onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Come vuoi essere chiamato?</label>
          <input value={name} onChange={e => setName(e.target.value)} maxLength={60} autoFocus
            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)]" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annulla</button>
          <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvataggio…' : 'Salva'}</button>
        </div>
      </div>
    </Modal>
  );
}

function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    if (password.length < 8) { setError('La password deve essere di almeno 8 caratteri.'); return; }
    if (password !== confirm) { setError('Le password non corrispondono.'); return; }
    setSaving(true); setError('');
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) { setError('Errore durante il salvataggio. Riprova.'); return; }
    setDone(true);
  };

  return (
    <Modal title="Cambia password" onClose={onClose}>
      {done ? (
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" className="h-7 w-7" strokeWidth={2.4} /></div>
          <p className="font-semibold text-emerald-700">Password aggiornata!</p>
          <button onClick={onClose} className="btn-primary mt-5 w-full">Chiudi</button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nuova password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} autoFocus placeholder="Minimo 8 caratteri"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Conferma password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-[color:var(--sig)]" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-secondary flex-1">Annulla</button>
            <button onClick={save} disabled={saving} className="btn-primary flex-1">{saving ? 'Salvataggio…' : 'Aggiorna'}</button>
          </div>
        </div>
      )}
    </Modal>
  );
}
