# Backup del database

Ogni notte la GitHub Action **Backup database** (`.github/workflows/backup.yml`)
salva una copia cifrata del database Supabase. Le copie restano disponibili
7 giorni.

## Dove trovare i backup

GitHub → repository → **Actions** → **Backup database** → clic su un'esecuzione
riuscita (pallino verde) → sezione **Artifacts** in fondo alla pagina →
`uniquiz-backup-AAAA-MM-GG`.

Per un backup immediato (per esempio prima di un'operazione rischiosa nel
pannello admin): **Actions** → **Backup database** → **Run workflow**.

## Cosa contiene

- `roles.sql`: ruoli del database
- `schema.sql`: struttura (tabelle, regole di accesso, funzioni, trigger)
- `data.sql`: tutti i dati, compresi gli account utente (`auth.users`)

Non contiene le immagini delle domande (bucket Storage `question-images`).

## Ripristino

Si ripristina in un **nuovo** progetto Supabase, senza toccare quello in uso:
così si può controllare il risultato prima di passarci.

1. Scarica l'artifact e decomprimi lo zip: ottieni `uniquiz-backup-AAAA-MM-GG.tar.gz.gpg`.
2. Decifra (chiede la password `BACKUP_PASSPHRASE`) ed estrai:
   ```bash
   gpg -d uniquiz-backup-AAAA-MM-GG.tar.gz.gpg > backup.tar.gz
   tar -xzf backup.tar.gz
   ```
3. Crea un nuovo progetto Supabase e copia la sua stringa di connessione
   (pulsante **Connect** → **Session pooler**).
4. Carica il backup nel nuovo progetto:
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file backup/roles.sql \
     --file backup/schema.sql \
     --command 'SET session_replication_role = replica' \
     --file backup/data.sql \
     --dbname "STRINGA_DI_CONNESSIONE_NUOVO_PROGETTO"
   ```
5. Nel nuovo progetto ricrea il bucket `question-images` (o riesegui
   `supabase_question_images.sql`) e ricarica le immagini.
6. Su Vercel aggiorna `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY` con quelli
   del nuovo progetto, aggiorna l'host Supabase in `next.config.mjs` e rifai
   il deploy.

Riferimento: https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
