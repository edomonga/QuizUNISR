'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/authHelpers';
import { useRouter, usePathname } from 'next/navigation';

// ─── TopNav ───────────────────────────────────────────────────────────────────

export function TopNav({ courseName }: { courseName?: string }) {
  const { user } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between sticky top-0 z-50 shadow-md flex-shrink-0">
      <Link href="/dashboard" className="flex items-center gap-2 font-bold text-base hover:opacity-80 transition-opacity">
        <span className="text-lg">🩺</span>
        <span>UniQuiz</span>
        {courseName && <span className="hidden sm:inline text-blue-300 font-normal text-sm">· {courseName}</span>}
      </Link>
      <div className="flex items-center gap-3">
        {user?.is_admin && (
          <Link href="/admin" className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Admin">
            <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        )}
        <span className="text-blue-200 text-sm hidden sm:block">{user?.display_name}</span>
        <button onClick={handleLogout} className="text-blue-300 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10">
          Esci
        </button>
      </div>
    </nav>
  );
}

// ─── PageShell ────────────────────────────────────────────────────────────────

export function PageShell({ children, courseName }: { children: ReactNode; courseName?: string }) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav courseName={courseName} />
      <main className="flex-1 py-6 overflow-auto">
        {children}
      </main>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-5 ${className}`}>{children}</div>;
}

// ─── PageHeader ───────────────────────────────────────────────────────────────

export function PageHeader({ title, back, children }: { title: string; back?: string; children?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      {back && (
        <Link href={back} className="p-2 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0">
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
      )}
      <h2 className="text-xl font-bold text-[rgb(32,44,71)] flex-1">{title}</h2>
      {children}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="w-8 h-8 border-4 border-[rgb(32,44,71)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// ─── Alert ────────────────────────────────────────────────────────────────────

export function Alert({ type, message }: { type: 'ok' | 'err' | 'warn'; message: string }) {
  const styles = {
    ok: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    err: 'bg-red-50 border-red-200 text-red-700',
    warn: 'bg-amber-50 border-amber-200 text-amber-800',
  };
  const icons = { ok: '✅', err: '❌', warn: '⚠️' };
  return (
    <div className={`p-3 rounded-xl border text-sm font-medium flex items-start gap-2 ${styles[type]}`}>
      <span className="flex-shrink-0">{icons[type]}</span>
      <span>{message}</span>
    </div>
  );
}

// ─── Checkbox ────────────────────────────────────────────────────────────────

export function Checkbox({ checked, small }: { checked: boolean; small?: boolean }) {
  const sz = small ? 'w-4 h-4' : 'w-5 h-5';
  return (
    <div className={`${sz} rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? 'bg-[rgb(32,44,71)] border-[rgb(32,44,71)]' : 'border-gray-300 bg-white'}`}>
      {checked && (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

// ─── ProgressBar ─────────────────────────────────────────────────────────────

export function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  const bg = color ?? (pct >= 70 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444');
  return (
    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bg }} />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="font-bold text-[rgb(32,44,71)] text-lg">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 text-xl leading-none">×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] focus:border-transparent transition-shadow"
        {...props}
      />
    </div>
  );
}

export function Select({ label, children, ...props }: { label: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <select
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] bg-white"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

export function Textarea({ label, ...props }: { label: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <textarea
        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)] resize-none"
        {...props}
      />
    </div>
  );
}
