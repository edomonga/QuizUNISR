'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui';
import { updateProfile } from '@/lib/db';

const YEARS = [1, 2, 3, 4, 5, 6];

export function YearPicker({
  current,
  userId,
  onClose,
  onSaved,
}: {
  current: number | null | undefined;
  userId: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  const pick = async (year: number | null) => {
    if (saving) return;
    setSaving(true);
    await updateProfile(userId, { year });
    await onSaved();
    onClose();
  };

  return (
    <Modal title="Il tuo anno di corso" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Seleziona l&apos;anno che stai frequentando: le materie del tuo anno verranno messe in
          cima alla dashboard, le altre restano accessibili ma ripiegate.
        </p>
        <div className="grid grid-cols-3 gap-2.5">
          {YEARS.map(y => (
            <button
              key={y}
              type="button"
              disabled={saving}
              onClick={() => pick(y)}
              className={`py-3 rounded-xl border-2 text-sm font-bold transition-all disabled:opacity-50 ${
                current === y
                  ? 'border-[rgb(32,44,71)] bg-[rgb(32,44,71)] text-white'
                  : 'border-gray-200 text-gray-700 hover:border-[color:var(--sig)]'
              }`}
            >
              {y}º Anno
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => pick(null)}
          className={`w-full py-2.5 rounded-xl border-2 text-sm font-medium transition-all disabled:opacity-50 ${
            current == null
              ? 'border-[rgb(32,44,71)] bg-[rgb(240,242,247)] text-[rgb(32,44,71)]'
              : 'border-gray-200 text-gray-500 hover:border-gray-300'
          }`}
        >
          Non impostato
        </button>
      </div>
    </Modal>
  );
}
