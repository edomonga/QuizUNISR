import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MedQuiz – Preparazione Esame Medicina Legale',
  description: 'Esercitati con domande di Medicina Legale, Igiene, Medicina del Lavoro ed Economia Sanitaria per il tuo esame universitario.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body className="min-h-screen bg-[rgb(240,242,247)]">
        {children}
      </body>
    </html>
  )
}
