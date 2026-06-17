import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata: Metadata = {
  title: 'UniQuiz – Preparazione Esami',
  description: 'Piattaforma di preparazione esami per studenti UniSR',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-[rgb(240,242,247)]">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
