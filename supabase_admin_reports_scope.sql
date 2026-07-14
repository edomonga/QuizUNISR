-- ============================================================
-- UniQuiz — Segnalazioni visibili agli admin limitati (per anno)
-- Esegui questo script nel SQL Editor di Supabase.
-- È idempotente: puoi rieseguirlo senza problemi.
-- Richiede che sia già stato eseguito supabase_admin_roles.sql
-- (usa le funzioni is_super_admin / can_manage_course).
-- ============================================================
--
-- Estende il modello: un admin limitato può ora gestire le SEGNALAZIONI
-- delle domande dei SUOI anni (super admin: tutte, come prima).

-- ------------------------------------------------------------
-- 1) POLICY SEGNALAZIONI — limitata per anno della domanda
-- ------------------------------------------------------------
drop policy if exists "Admins manage question_reports" on public.question_reports;
drop policy if exists "Super admins manage question_reports" on public.question_reports;
drop policy if exists "Manage question_reports by scope" on public.question_reports;
create policy "Manage question_reports by scope" on public.question_reports
  for all using (
    public.is_super_admin()
    or exists (
      select 1 from public.questions q
      where q.id = question_reports.question_id
        and public.can_manage_course(q.course_id)
    )
  );

-- ------------------------------------------------------------
-- 2) NOMI DEI SEGNALATORI (solo display_name) per gli admin
-- Gli admin limitati non possono leggere la tabella profiles: questa
-- funzione security-definer restituisce SOLO id + display_name, e solo
-- se il chiamante è un admin attivo. Usata per arricchire le segnalazioni.
-- ------------------------------------------------------------
create or replace function public.admin_display_names(ids uuid[])
returns table(id uuid, display_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name
  from public.profiles p
  where p.id = any(ids)
    and exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.is_admin = true and me.is_active = true
    );
$$;

-- ============================================================
-- VERIFICA (facoltativa): con un account admin limitato dovresti vedere
-- nel pannello solo le segnalazioni relative alle domande dei tuoi anni.
-- ============================================================
