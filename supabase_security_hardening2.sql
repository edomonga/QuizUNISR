-- ============================================================
-- UniQuiz — Hardening 2: permessi di esecuzione delle funzioni
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================
--
-- Risolve gli avvisi del Security Advisor
-- "Public/Signed-in Users Can Execute SECURITY DEFINER Function".
--
-- Principio:
--  - Le funzioni TRIGGER non devono essere eseguibili da nessun utente
--    (il trigger le esegue comunque in automatico, non serve il privilegio).
--  - Le funzioni helper usate dalle RLS e la RPC admin_display_names devono
--    restare eseguibili SOLO dagli utenti autenticati (e da service_role).
--
-- Nessuna funzione qui espone dati altrui: controllano lo stato del chiamante
-- (auth.uid()) o hanno una guardia interna. Questo script chiude l'accesso
-- pubblico (anon) e rimuove l'esecuzione diretta dove non necessaria.

-- ------------------------------------------------------------
-- 1) FUNZIONI TRIGGER — nessun utente deve poterle eseguire
-- ------------------------------------------------------------
revoke execute on function public.handle_new_user()            from public, anon, authenticated;
revoke execute on function public.prevent_privilege_change()   from public, anon, authenticated;
revoke execute on function public.protect_profile_privileges() from public, anon, authenticated;
revoke execute on function public.sync_email_confirmed()       from public, anon, authenticated;

-- ------------------------------------------------------------
-- 2) HELPER RLS + RPC ADMIN — solo utenti autenticati (+ service_role)
-- ------------------------------------------------------------
revoke execute on function public.is_active_user()              from public, anon;
grant  execute on function public.is_active_user()              to authenticated, service_role;

revoke execute on function public.is_admin()                    from public, anon;
grant  execute on function public.is_admin()                    to authenticated, service_role;

revoke execute on function public.is_super_admin()              from public, anon;
grant  execute on function public.is_super_admin()              to authenticated, service_role;

revoke execute on function public.can_manage_year(integer)      from public, anon;
grant  execute on function public.can_manage_year(integer)      to authenticated, service_role;

revoke execute on function public.can_manage_course(uuid)       from public, anon;
grant  execute on function public.can_manage_course(uuid)       to authenticated, service_role;

revoke execute on function public.admin_display_names(uuid[])   from public, anon;
grant  execute on function public.admin_display_names(uuid[])   to authenticated, service_role;

-- ============================================================
-- NOTE
-- - I trigger continuano a funzionare: Postgres non richiede il privilegio
--   EXECUTE all'utente che scatena il trigger.
-- - Le RLS continuano a funzionare: l'utente autenticato può eseguire le
--   helper durante la valutazione delle policy.
-- - Le operazioni con service-role bypassano le RLS, quindi non dipendono da
--   queste funzioni; il grant a service_role è solo prudenziale.
--
-- Dopo l'esecuzione, riesegui il Security Advisor: gli avvisi su queste
-- funzioni dovrebbero sparire. Resta da attivare (dal pannello) la
-- "Leaked Password Protection" in Authentication.
-- ============================================================
