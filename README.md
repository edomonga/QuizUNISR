# MedQuiz 🩺

Applicazione web per la preparazione all'esame universitario di Medicina Legale, Igiene, Medicina del Lavoro e Economia Sanitaria.

## Funzionalità

- **Login** con username e password
- **Esercitazione libera**: scegli macro-aree e argomenti, numero di domande variabile. La risposta corretta viene mostrata immediatamente dopo ogni risposta.
- **Simulazione esame**: 30 domande (12 Igiene + 12 Med. Legale + 3 Med. Lavoro + 3 Econ. Sanitaria), 45 minuti, punteggio +1/-0.2/0, navigazione libera avanti/indietro.
- **Profilo personale**: statistiche per argomento, punti di forza e aree deboli, storico esami. Possibilità di ripassare gli argomenti più deboli in modo mirato.

## Credenziali demo

| Username | Password |
|----------|----------|
| studente | medicina2024 |
| admin | admin123 |

## Setup locale

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo
npm run dev

# Apri http://localhost:3000
```

## Deploy su Vercel (tramite GitHub)

1. **Crea repository GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: MedQuiz app"
   git branch -M main
   git remote add origin https://github.com/TUO_USERNAME/medquiz.git
   git push -u origin main
   ```

2. **Connetti a Vercel**:
   - Vai su [vercel.com](https://vercel.com)
   - Clicca "Add New Project"
   - Importa il repository GitHub `medquiz`
   - Vercel rileva automaticamente Next.js
   - Clicca "Deploy"

3. **In ~2 minuti il sito è online** all'URL `https://medquiz-[hash].vercel.app`

## Struttura del progetto

```
src/
├── app/
│   ├── globals.css      # Stili Tailwind CSS
│   ├── layout.tsx       # Layout root Next.js
│   └── page.tsx         # App principale (tutte le viste)
├── data/
│   └── questions.ts     # Database domande (~100+ domande categorizzate)
└── lib/
    └── auth.ts          # Autenticazione e gestione utenti
```

## Aggiungere nuove domande

Apri `src/data/questions.ts` e aggiungi un oggetto al array `questions`:

```typescript
{
  id: 'ig_org_XXX',           // ID univoco: [macro]_[topic]_[numero]
  macroArea: 'igiene',         // 'igiene' | 'medicina_legale' | 'medicina_del_lavoro' | 'economia_sanitaria'
  topic: 'Organizzazione sanitaria e SSN',
  question: 'Testo della domanda',
  options: ['Opzione A', 'Opzione B', 'Opzione C', 'Opzione D', 'Opzione E'],
  correctAnswer: 0,            // Indice 0-based della risposta corretta
}
```

## Tecnologie

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **localStorage** per le statistiche utente (persistenti nel browser)
