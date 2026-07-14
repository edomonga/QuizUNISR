# UniQuiz v3 — Guida completa al deploy

## Cosa serve
- Account GitHub (ce l'hai già)
- Account Vercel (ce l'hai già)
- Account Supabase (gratuito, da creare)

---

## PASSO 1 — Crea il tuo account Supabase (5 minuti)

1. Vai su **https://supabase.com**
2. Clicca **Start your project** → **Sign up with GitHub** (usa lo stesso account GitHub)
3. Una volta dentro, clicca **New project**
4. Compila:
   - **Name**: `uniquiz` (o come vuoi)
   - **Database Password**: scegli una password sicura (salvala da qualche parte)
   - **Region**: `West EU (Ireland)` — è la più vicina all'Italia
5. Clicca **Create new project** e aspetta ~2 minuti che si avvii

---

## PASSO 2 — Crea il database (3 minuti)

1. Una volta che il progetto è pronto, clicca **SQL Editor** nel menu a sinistra
2. Clicca **New query**
3. Apri il file `supabase_schema.sql` che trovi nel progetto
4. Copia **tutto il contenuto** e incollalo nell'editor SQL di Supabase
5. Clicca **Run** (il pulsante verde in basso a destra)
6. Dovresti vedere "Success. No rows returned" — significa che ha funzionato

---

## PASSO 3 — Configura le email (2 minuti)

Questo permette a Supabase di accettare registrazioni e inviare email di conferma.

1. Nel menu a sinistra vai su **Authentication** → **URL Configuration**
2. In **Site URL** metti l'URL del tuo sito Vercel (lo trovi dopo il deploy, per ora metti `http://localhost:3000`)
3. In **Redirect URLs** aggiungi: `http://localhost:3000/login`
4. Clicca **Save**

---

## PASSO 4 — Copia le chiavi API (2 minuti)

1. Nel menu a sinistra vai su **Project Settings** → **API**
2. Copia due valori:
   - **Project URL** (es. `https://abcdefghij.supabase.co`)
   - **anon / public** key (la chiave lunga sotto "Project API keys")
3. Tienile pronte per il passo 6

---

## PASSO 5 — Carica il codice su GitHub (3 minuti)

Se non hai ancora fatto il push su GitHub:

```bash
# Dalla cartella del progetto (medquiz)
git init
git add .
git commit -m "UniQuiz v3 con Supabase"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/uniquiz.git
git push -u origin main
```

Se hai già una repository esistente:
```bash
git add .
git commit -m "Aggiornamento a v3 con Supabase"
git push
```

---

## PASSO 6 — Configura le variabili su Vercel (2 minuti)

1. Vai su **https://vercel.com** → il tuo progetto
2. Clicca **Settings** → **Environment Variables**
3. Aggiungi queste due variabili (una alla volta):

| Nome | Valore |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | L'URL copiato al passo 4 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | La chiave copiata al passo 4 |

4. Per ogni variabile scegli **All environments** (Production, Preview, Development)
5. Clicca **Save** su ciascuna

---

## PASSO 7 — Rideploy su Vercel (1 minuto)

1. Vai su **Deployments** nel tuo progetto Vercel
2. Clicca i tre puntini sull'ultimo deployment → **Redeploy**
3. Aspetta ~2 minuti

---

## PASSO 8 — Aggiorna l'URL su Supabase

1. Ora che hai l'URL definitivo di Vercel (es. `https://uniquiz-abc123.vercel.app`)
2. Torna su Supabase → **Authentication** → **URL Configuration**
3. Aggiorna **Site URL** con l'URL Vercel reale
4. In **Redirect URLs** aggiungi anche `https://uniquiz-abc123.vercel.app/login`

---

## PASSO 9 — Crea il tuo account admin (primo avvio)

1. Vai sul sito e registrati con la tua email `@studenti.unisr.it`
2. Conferma l'email (controlla la casella di posta)
3. Torna su Supabase → **Table Editor** → **profiles**
4. Trova il tuo utente, clicca sulla riga e modifica:
   - `is_admin` → `true`
   - `is_active` → `true`
5. Clicca **Save**
6. Ora puoi fare login e accedere al pannello admin

Da questo momento puoi attivare altri utenti direttamente dall'interfaccia admin del sito.

---

## Come aggiungere domande

1. Accedi con il tuo account admin
2. Vai su **Pannello Admin** → tab **Materie**
3. Clicca su **Medicina Legale** → aggiungi le macro-aree (es. "Igiene e Sanità Pubblica")
4. Per ogni macro-area aggiungi gli argomenti (es. "Epidemiologia e metodi di studio")
5. Vai sul tab **Domande** → seleziona la materia → **+ Nuova domanda**
6. Compila testo, opzioni, risposta corretta, argomento

---

## Sviluppo locale

```bash
# Crea il file .env.local (NON caricare su GitHub)
cp .env.local.example .env.local
# Inserisci i tuoi valori Supabase nel file .env.local

npm install
npm run dev
# Apri http://localhost:3000
```

---

## Un solo dispositivo per utente (anti-condivisione password)

Per un'app in abbonamento serve evitare che una password venga condivisa fra
più persone. Con questa funzione **ogni account può essere attivo su un solo
dispositivo alla volta**: quando qualcuno accede da un nuovo dispositivo, il
dispositivo precedente viene **disconnesso automaticamente** (il nuovo vince).
Inoltre, ad ogni accesso da un **dispositivo mai visto** viene inviata una
**email di avviso all'amministratore**.

### PASSO A — Aggiorna il database

1. Supabase → **SQL Editor** → **New query**
2. Apri il file `supabase_single_device.sql`, copia **tutto** e incolla
3. Clicca **Run**

> ⚠️ Esegui questo SQL **prima** di pubblicare la nuova versione del sito:
> il codice legge la colonna `active_session_id`, che viene creata da questo
> script. Se pubblichi il codice senza aver eseguito prima l'SQL, il login
> smette temporaneamente di funzionare finché non lo esegui.

### PASSO B — Configura l'email di notifica (provider Resend, gratuito)

Le notifiche usano [Resend](https://resend.com) (piano gratuito ampiamente
sufficiente).

1. Crea un account su **https://resend.com** e conferma la mail
2. Vai su **API Keys** → **Create API Key** → copia la chiave (inizia con `re_`)
3. (Consigliato) Per usare un mittente tuo, verifica un dominio in
   **Domains**. Se non hai un dominio, puoi lasciare il mittente di default
   `onboarding@resend.dev` (funziona subito, senza verifica)
4. Su **Vercel** → il tuo progetto → **Settings** → **Environment Variables**
   aggiungi (per **All environments**):

| Nome | Valore | Obbligatoria |
|------|--------|--------------|
| `RESEND_API_KEY` | la chiave `re_...` copiata da Resend | Sì |
| `ADMIN_NOTIFICATION_EMAIL` | l'email dove ricevere gli avvisi (la tua) | Sì |
| `EMAIL_FROM` | mittente, es. `UniQuiz <no-reply@tuodominio.it>` | No (default `onboarding@resend.dev`) |

5. **Redeploy** del progetto su Vercel

> Se `RESEND_API_KEY` o `ADMIN_NOTIFICATION_EMAIL` non sono impostate, il sito
> continua a funzionare normalmente (l'anti-condivisione resta attivo): viene
> semplicemente saltato l'invio dell'email.

### Come funziona in pratica

- Al login viene creato un identificativo di sessione unico salvato sul
  profilo dell'utente. Ogni dispositivo controlla ogni ~45 secondi (e quando
  la scheda torna in primo piano) se è ancora la sessione valida: se un altro
  dispositivo ha effettuato l'accesso, viene disconnesso con il messaggio
  *"Sei stato disconnesso perché è stato effettuato l'accesso da un altro
  dispositivo"*.
- Ogni dispositivo viene registrato nella tabella `user_devices`. Puoi
  consultarla da Supabase → **Table Editor** → `user_devices` per vedere da
  quanti dispositivi accede ciascun utente (indizio di condivisione).
- L'email all'amministratore parte **solo la prima volta** che un utente usa
  un determinato dispositivo, per evitare avvisi ripetuti ad ogni accesso.

---

## Ruoli admin: super admin e admin limitati per anno

Puoi avere due tipi di amministratore:

- **Super admin** — potere pieno: gestione utenti, tutte le materie/domande, segnalazioni e assegnazione dei permessi agli altri admin.
- **Admin limitato** — può gestire **solo le materie e le domande degli anni che gli assegni** (es. solo 3° e 4°). Non vede la sezione Utenti né le Segnalazioni.

### PASSO — Aggiorna il database

1. Supabase → **SQL Editor** → **New query**
2. Apri il file `supabase_admin_roles.sql`, copia **tutto** e incolla
3. Clicca **Run** (l'avviso "operazioni distruttive" è normale: lo script
   ricrea alcune policy di sicurezza, non cancella dati)

> Lo script promuove automaticamente gli admin attuali a **super admin**, così
> non resti mai chiuso fuori. Eseguilo **prima** di pubblicare la nuova versione.

### Come si usa (dal pannello Admin → Utenti)

Per ogni utente attivo trovi un selettore di ruolo con tre voci:

- **Utente** — nessun potere di amministrazione.
- **Limitato** — admin ristretto: sotto compaiono i pulsanti degli **anni** (1°–6°); accendi quelli che deve poter gestire.
- **Super** — potere pieno come te.

Il limite è applicato anche a livello di database (RLS): un admin limitato **non può** modificare, nemmeno via URL o API, contenuti di anni non suoi. Il tuo stesso account è protetto (non puoi declassarti o eliminarti da solo per errore).
