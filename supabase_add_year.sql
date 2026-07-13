-- ============================================================
-- UniQuiz — Anno di corso dell'utente (dashboard personalizzata)
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================

-- Anno di corso frequentato dall'utente (1..6), null = non impostato.
alter table public.profiles
  add column if not exists year int;

-- Nessuna nuova policy necessaria: l'utente aggiorna il proprio profilo con la
-- policy "Users can update own profile" già esistente, e il trigger
-- prevent_privilege_change blocca solo is_admin/is_active (non `year`).
