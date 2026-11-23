-- ============================================================
-- UniQuiz — Privacy dei profili + indici mancanti
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================
--
-- PROBLEMA
-- La policy "Read all profiles" permetteva a QUALSIASI utente autenticato
-- (anche non ancora attivato) di leggere tutti i profili tramite l'API
-- pubblica di Supabase: email, nome, anno, ruolo admin di tutti gli utenti.
-- C'erano inoltre 8 policy sovrapposte sulla tabella, alcune delle quali
-- permettevano agli admin limitati di modificare i profili di chiunque.
--
-- DOPO QUESTO SCRIPT
--   - ogni utente legge e modifica SOLO il proprio profilo (i campi
--     privilegiati restano protetti dai trigger già presenti);
--   - i super admin (scheda "Utenti" del pannello) leggono e gestiscono tutti;
--   - gli admin limitati vedono i nomi dei segnalatori solo tramite la
--     funzione admin_display_names(), come già fa l'app.
-- Nessuna modifica al codice dell'app è necessaria.
-- ============================================================

-- ------------------------------------------------------------
-- 1) PROFILI: rimuove tutte le policy precedenti
-- ------------------------------------------------------------
drop policy if exists "Read all profiles"                on public.profiles;
drop policy if exists "Admins can manage all profiles"   on public.profiles;
drop policy if exists "Super admins manage all profiles" on public.profiles;
drop policy if exists "Admin delete profile"             on public.profiles;
drop policy if exists "Admin insert profile"             on public.profiles;
drop policy if exists "Admin update any profile"         on public.profiles;
drop policy if exists "Update own profile"               on public.profiles;
drop policy if exists "Users can update own profile"     on public.profiles;

drop policy if exists "Profiles: read own or super admin"   on public.profiles;
drop policy if exists "Profiles: insert own or super admin" on public.profiles;
drop policy if exists "Profiles: update own or super admin" on public.profiles;
drop policy if exists "Profiles: delete by super admin"     on public.profiles;

-- ------------------------------------------------------------
-- 2) PROFILI: quattro policy, una per azione
--    (select ...) evita di ricalcolare l'utente per ogni riga.
-- ------------------------------------------------------------
create policy "Profiles: read own or super admin" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Profiles: insert own or super admin" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Profiles: update own or super admin" on public.profiles
  for update to authenticated
  using      (id = (select auth.uid()) or (select public.is_super_admin()))
  with check (id = (select auth.uid()) or (select public.is_super_admin()));

create policy "Profiles: delete by super admin" on public.profiles
  for delete to authenticated
  using ((select public.is_super_admin()));

-- ------------------------------------------------------------
-- 3) INDICI sulle chiavi esterne segnalati dall'advisor Supabase
--    (velocizzano filtri per materia/utente e le cancellazioni a cascata)
-- ------------------------------------------------------------
create index if not exists app_feedback_user_idx            on public.app_feedback(user_id);
create index if not exists exam_results_course_idx          on public.exam_results(course_id);
create index if not exists macro_areas_course_idx           on public.macro_areas(course_id);
create index if not exists question_reports_user_idx        on public.question_reports(user_id);
create index if not exists topics_course_idx                on public.topics(course_id);
create index if not exists topics_macro_area_idx            on public.topics(macro_area_id);
create index if not exists user_questions_seen_course_idx   on public.user_questions_seen(course_id);
create index if not exists user_stats_course_idx            on public.user_stats(course_id);
create index if not exists user_stats_macro_area_idx        on public.user_stats(macro_area_id);
create index if not exists user_stats_topic_idx             on public.user_stats(topic_id);
create index if not exists user_wrong_questions_course_idx  on public.user_wrong_questions(course_id);

-- ============================================================
-- VERIFICA (facoltativa): devono comparire solo le 4 policy "Profiles: ..."
--   select policyname, cmd from pg_policies
--   where schemaname = 'public' and tablename = 'profiles';
-- ============================================================
