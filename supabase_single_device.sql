-- ============================================================
-- UniQuiz — Un solo dispositivo per utente + tracciamento accessi
-- Esegui questo script nel SQL Editor di Supabase.
-- È idempotente: puoi rieseguirlo senza problemi.
-- ============================================================
--
-- Cosa fa:
--  1) Aggiunge a `profiles` la "sessione attiva" corrente (active_session_id).
--     Ad ogni login viene generato un id di sessione nuovo e scritto qui:
--     il dispositivo che non ha più l'id corrispondente viene disconnesso
--     (policy "il nuovo dispositivo vince").
--  2) Crea la tabella `user_devices` che memorizza i dispositivi da cui
--     ciascun utente ha effettuato l'accesso. Il primo accesso da un
--     dispositivo mai visto genera la notifica email all'amministratore.
--
-- Nota sicurezza: le scritture su queste colonne/tabella avvengono SOLO
-- lato server tramite la service-role key (API /api/session/claim), che
-- bypassa la RLS. Gli utenti possono solo LEGGERE i propri dati.
-- ============================================================

-- ------------------------------------------------------------
-- 1) SESSIONE ATTIVA sul profilo
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists active_session_id uuid,
  add column if not exists active_session_updated_at timestamptz;

-- ------------------------------------------------------------
-- 2) DISPOSITIVI CONOSCIUTI per utente
-- ------------------------------------------------------------
create table if not exists public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_id text not null,
  user_agent text,
  last_ip text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  unique (user_id, device_id)
);

create index if not exists user_devices_user_idx on public.user_devices(user_id);

alter table public.user_devices enable row level security;

-- Gli utenti possono vedere solo i propri dispositivi.
drop policy if exists "Users can view own devices" on public.user_devices;
create policy "Users can view own devices" on public.user_devices
  for select using (auth.uid() = user_id);

-- Gli admin possono leggere tutti i dispositivi (utile per audit manuale).
drop policy if exists "Admins can view all devices" on public.user_devices;
create policy "Admins can view all devices" on public.user_devices
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Nessuna policy di INSERT/UPDATE per gli utenti: le scritture passano
-- esclusivamente dalla service-role key lato server.

-- ============================================================
-- VERIFICA (facoltativa): dovresti vedere le nuove colonne e la tabella.
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='profiles'
--     and column_name like 'active_session%';
--   select * from public.user_devices limit 5;
-- ============================================================
