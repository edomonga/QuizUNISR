-- ============================================================
-- UniQuiz — Permessi per eliminare le segnalazioni (question_reports)
-- Necessario perché gli admin possano cancellare le segnalazioni
-- (pulsante "Elimina", "Svuota risolte" e auto-pulizia 24h).
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================

alter table public.question_reports enable row level security;

-- Consente agli admin ogni operazione (incl. DELETE) sulle segnalazioni.
drop policy if exists "Admins manage question_reports" on public.question_reports;
create policy "Admins manage question_reports" on public.question_reports
  for all using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.is_admin = true
    )
  );

-- (Facoltativo) Assicura la colonna usata dall'auto-pulizia.
alter table public.question_reports
  add column if not exists resolved_at timestamptz;
