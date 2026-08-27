import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ambiente di default leggero (Node puro): la maggior parte dei test
    // riguarda logica pura senza bisogno del DOM. I singoli file che
    // necessitano di `window`/`localStorage` lo dichiarano da soli con
    // il pragma `// @vitest-environment jsdom` in cima al file.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // authHelpers.ts importa src/lib/supabase.ts, che va in errore al
    // caricamento se mancano le variabili d'ambiente (comportamento voluto
    // in produzione). Valori fittizi qui: nessun test chiama davvero
    // Supabase, servono solo a far caricare il modulo senza lanciare.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    },
  },
});
