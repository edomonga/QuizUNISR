-- ============================================================
-- UniQuiz — Hardening di sicurezza
-- Esegui questo script nel SQL Editor di Supabase.
-- È idempotente: puoi rieseguirlo senza problemi.
-- ============================================================

-- ------------------------------------------------------------
-- 1) ANTI PRIVILEGE-ESCALATION
-- Impedisce a chi NON è admin di modificare is_admin / is_active
-- (sul proprio profilo o su quello altrui). Chiude la falla per cui
-- un utente poteva farsi admin da solo con un UPDATE diretto.
-- Gli admin restano liberi di gestire gli altri profili.
-- ------------------------------------------------------------
create or replace function public.prevent_privilege_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.is_admin is distinct from old.is_admin
      or new.is_active is distinct from old.is_active) then
    -- Contesto server / service_role (nessun utente): consentito.
    if auth.uid() is null then
      return new;
    end if;
    -- Altrimenti serve essere admin.
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    ) then
      raise exception 'Non autorizzato a modificare i privilegi (is_admin/is_active).';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_priv on public.profiles;
create trigger trg_prevent_priv
  before update on public.profiles
  for each row execute function public.prevent_privilege_change();


-- ------------------------------------------------------------
-- 2) ACCESSO AI CONTENUTI SOLO PER PROFILI ATTIVI
-- Prima bastava essere autenticati (auth.role() = 'authenticated')
-- per leggere materie/argomenti/domande: un account NON attivato
-- otteneva comunque un JWT valido e poteva scaricare tutto.
-- Ora la lettura richiede un profilo attivo. Questa stessa funzione
-- gestirà il paywall futuro (basta aggiungere la condizione "abbonato").
-- ------------------------------------------------------------
create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
  );
$$;

-- Courses
drop policy if exists "Anyone authenticated can read courses" on public.courses;
drop policy if exists "Active users can read courses" on public.courses;
create policy "Active users can read courses" on public.courses
  for select using (public.is_active_user());

-- Macro areas
drop policy if exists "Anyone authenticated can read macro_areas" on public.macro_areas;
drop policy if exists "Active users can read macro_areas" on public.macro_areas;
create policy "Active users can read macro_areas" on public.macro_areas
  for select using (public.is_active_user());

-- Topics
drop policy if exists "Anyone authenticated can read topics" on public.topics;
drop policy if exists "Active users can read topics" on public.topics;
create policy "Active users can read topics" on public.topics
  for select using (public.is_active_user());

-- Questions
drop policy if exists "Anyone authenticated can read active questions" on public.questions;
drop policy if exists "Active users can read questions" on public.questions;
create policy "Active users can read questions" on public.questions
  for select using (public.is_active_user());

-- Le policy "Admins can manage ..." restano invariate (gli admin sono
-- comunque attivi). Nessuna modifica ai dati.


-- ------------------------------------------------------------
-- 3) VERIFICA MANUALE — esegui queste query e controlla l'output.
-- Ogni tabella deve avere rowsecurity = true, e ogni policy deve avere
-- senso (in particolare le tabelle create fuori dallo schema:
-- question_reports, user_wrong_questions, user_questions_seen).
-- ------------------------------------------------------------
-- Tabelle senza RLS attiva (dovrebbe essere VUOTO):
--   select tablename from pg_tables
--   where schemaname='public' and rowsecurity = false;
--
-- Elenco completo delle policy:
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname='public' order by tablename, policyname;
--
-- Se una fra question_reports / user_wrong_questions / user_questions_seen
-- NON ha RLS, abilitala e aggiungi le policy "own row", ad esempio:
--   alter table public.user_wrong_questions enable row level security;
--   create policy "own rows" on public.user_wrong_questions
--     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
