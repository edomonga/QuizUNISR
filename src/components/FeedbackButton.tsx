'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Modal } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { submitFeedback, type FeedbackCategory } from '@/lib/db';

const CATEGORIES: { value: FeedbackCategory; label: string; icon: IconName }[] = [
  { value: 'suggerimento', label: 'Suggerimento', icon: 'bulb' },
  { value: 'bug',          label: 'Problema',     icon: 'bug' },
  { value: 'contenuti',    label: 'Contenuti',    icon: 'book' },
  { value: 'altro',        label: 'Altro',        icon: 'message' },
];

export function FeedbackButton() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<FeedbackCategory>('suggerimento');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const reset = () => {
    setOpen(false);
    setCategory('suggerimento');
    setMessage('');
    setSending(false);
    setSent(false);
    setError(null);
  };

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    setError(null);
    const { error } = await submitFeedback({
      user_id: user.id,
      user_name: user.display_name,
      category,
      message: message.trim(),
    });
    setSending(false);
    if (error) setError("Impossibile inviare il feedback. Riprova tra poco.");
    else setSent(true);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60 px-4 py-3 text-sm font-medium text-gray-500 transition-all hover:border-[color:var(--sig)] hover:text-[color:var(--sig)] hover:bg-[color:var(--sig-soft)] hover:shadow-sm"
      >
        <Icon name="bulb" className="w-4 h-4 transition-transform group-hover:scale-110" />
        Hai un'idea per migliorare UniQuiz? Inviaci un feedback
      </button>

      {open && (
        <Modal title="Invia un feedback" onClose={reset}>
          {sent ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" className="h-7 w-7" strokeWidth={2.4} />
              </div>
              <p className="font-semibold text-emerald-700">Grazie per il tuo feedback!</p>
              <p className="mt-1 text-sm text-gray-500">Lo useremo per migliorare l'app.</p>
              <button onClick={reset} className="btn-primary mt-5 w-full">Chiudi</button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Raccontaci cosa possiamo migliorare: un suggerimento, un problema riscontrato o
                un'idea per nuovi contenuti.
              </p>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Categoria</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(c => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm font-medium transition-all ${
                        category === c.value
                          ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <Icon name={c.icon} className="w-4 h-4" />
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Il tuo messaggio</label>
                <textarea
                  className="w-full resize-none rounded-xl border border-gray-300 p-3 text-base focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  maxLength={1000}
                  placeholder="Es: mi piacerebbe poter ripassare solo gli errori di un singolo argomento…"
                />
                <div className="mt-1 text-right text-xs text-gray-400">{message.length}/1000</div>
              </div>

              {error && (
                <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-sm font-medium text-red-700">{error}</p>
              )}

              <button
                onClick={handleSend}
                disabled={!message.trim() || sending}
                className="btn-primary w-full"
              >
                {sending ? 'Invio…' : 'Invia feedback'}
              </button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
