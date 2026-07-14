-- ============================================================
-- UniQuiz — Ruoli admin: super admin + admin limitati per anno
-- Esegui questo script nel SQL Editor di Supabase.
-- È idempotente: puoi rieseguirlo senza problemi.
-- ============================================================
--
-- Modello:
--  - SUPER ADMIN (is_super_admin = true): potere pieno di oggi — gestione
--    utenti, tutte le materie/domande, segnalazioni, e assegnazione dei
--    permessi agli altri admin.
--  - ADMIN LIMITATO (is_admin = true, is_super_admin = false): può gestire
--    SOLO i contenuti (materie, argomenti, domande) degli anni elencati in
--    admin_years. Non vede la sezione Utenti né le Segnalazioni.
--
-- Le colonne di privilegio (is_admin, is_active, is_super_admin, admin_years)
-- possono essere modificate SOLO da un super admin (o dal service-role lato
-- server): lo garantisce il trigger prevent_privilege_change aggiornato qui.
-- ============================================================

-- ------------------------------------------------------------
-- 1) NUOVE COLONNE
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists is_super_admin boolean not null default false,
  add column if not exists admin_years int[] not null default '{}';

-- ------------------------------------------------------------
-- 2) PROMUOVI GLI ADMIN ATTUALI A SUPER ADMIN
-- Chi è già admin oggi mantiene il potere pieno (nessuno resta chiuso fuori).
-- I nuovi admin limitati andranno creati dopo dal pannello.
-- ------------------------------------------------------------
update public.profiles set is_super_admin = true where is_admin = true;

-- ------------------------------------------------------------
-- 3) FUNZIONI HELPER (security definer → niente ricorsione sulle RLS)
-- ------------------------------------------------------------
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_super_admin = true and p.is_active = true
  );
$$;

-- Vero se il chiamante può gestire i contenuti di un dato anno di corso:
-- super admin sempre, admin limitato solo se l'anno è tra i suoi.
create or replace function public.can_manage_year(y int)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.is_active = true
      and (
        p.is_super_admin = true
        or (p.is_admin = true and y is not null and y = any(p.admin_years))
      )
  );
$$;

-- Comodità: risolve l'anno della materia e delega a can_manage_year.
create or replace function public.can_manage_course(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_manage_year((select year from public.courses where id = cid));
$$;

-- ------------------------------------------------------------
-- 4) TRIGGER ANTI-ESCALATION (aggiornato)
-- Ora protegge anche is_super_admin/admin_years e richiede il SUPER admin
-- per qualunque modifica ai campi di privilegio.
-- ------------------------------------------------------------
create or replace function public.prevent_privilege_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.is_admin       is distinct from old.is_admin
      or new.is_active   is distinct from old.is_active
      or new.is_super_admin is distinct from old.is_super_admin
      or new.admin_years is distinct from old.admin_years) then
    -- Contesto server / service_role (nessun utente): consentito.
    if auth.uid() is null then
      return new;
    end if;
    -- Altrimenti serve essere SUPER admin.
    if not exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_super_admin = true and p.is_active = true
    ) then
      raise exception 'Non autorizzato a modificare i privilegi (solo super admin).';
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
-- 5) POLICY DI GESTIONE CONTENUTI — ora limitate per anno
-- Sostituiscono le vecchie "Admins can manage ..." (che davano potere a
-- QUALSIASI admin). Le policy di sola lettura per gli studenti restano invariate.
-- ------------------------------------------------------------

-- Courses
drop policy if exists "Admins can manage courses" on public.courses;
drop policy if exists "Admins manage courses by scope" on public.courses;
create policy "Admins manage courses by scope" on public.courses
  for all using (public.can_manage_year(year))
  with check (public.can_manage_year(year));

-- Macro areas
drop policy if exists "Admins can manage macro_areas" on public.macro_areas;
drop policy if exists "Admins manage macro_areas by scope" on public.macro_areas;
create policy "Admins manage macro_areas by scope" on public.macro_areas
  for all using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));

-- Topics
drop policy if exists "Admins can manage topics" on public.topics;
drop policy if exists "Admins manage topics by scope" on public.topics;
create policy "Admins manage topics by scope" on public.topics
  for all using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));

-- Questions
drop policy if exists "Admins can manage questions" on public.questions;
drop policy if exists "Admins manage questions by scope" on public.questions;
create policy "Admins manage questions by scope" on public.questions
  for all using (public.can_manage_course(course_id))
  with check (public.can_manage_course(course_id));

-- ------------------------------------------------------------
-- 6) GESTIONE UTENTI E SEGNALAZIONI — solo super admin
-- ------------------------------------------------------------

-- Profiles: la gestione di tutti i profili passa ai soli super admin.
-- (Restano "Users can view own profile" e "Users can update own profile".)
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Super admins manage all profiles" on public.profiles;
create policy "Super admins manage all profiles" on public.profiles
  for all using (public.is_super_admin());

-- Question reports: gestione riservata ai super admin.
drop policy if exists "Admins manage question_reports" on public.question_reports;
drop policy if exists "Super admins manage question_reports" on public.question_reports;
create policy "Super admins manage question_reports" on public.question_reports
  for all using (public.is_super_admin());

-- ============================================================
-- VERIFICA (facoltativa):
--   select id, email, is_admin, is_super_admin, admin_years from public.profiles
--   where is_admin = true;
-- I tuoi account admin attuali devono avere is_super_admin = true.
-- ============================================================
