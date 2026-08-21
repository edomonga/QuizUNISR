-- ============================================================
-- UniQuiz — Elimina domande senza errori di vincolo
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- ============================================================
--
-- Problema: eliminare una domanda già "vista"/sbagliata/segnalata da uno
-- studente falliva con un generico errore, perché le tabelle collegate
-- (user_wrong_questions, user_questions_seen, question_reports, ...)
-- referenziano questions.id SENZA "ON DELETE CASCADE". Con 800+ utenti
-- attivi, praticamente ogni domanda ha già righe collegate: "Elimina tutte"
-- (e anche l'eliminazione di singole domande molto usate) falliva.
--
-- Questo script trova AUTOMATICAMENTE ogni chiave esterna che referenzia
-- questions(id) tramite una colonna question_id e la ricrea con
-- ON DELETE CASCADE: se una domanda viene eliminata, le righe che la
-- riguardano (statistiche, tracciamento "vista", segnalazioni) vengono
-- eliminate insieme a lei — cosa corretta, perché non avrebbero più senso.
-- Non serve conoscere in anticipo i nomi delle tabelle o dei vincoli.

do $$
declare
  r record;
begin
  for r in
    select
      tc.table_name,
      tc.constraint_name,
      kcu.column_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    join information_schema.constraint_column_usage ccu
      on tc.constraint_name = ccu.constraint_name
     and tc.table_schema = ccu.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'questions'
      and kcu.column_name = 'question_id'
  loop
    execute format('alter table public.%I drop constraint %I', r.table_name, r.constraint_name);
    execute format(
      'alter table public.%I add constraint %I foreign key (question_id) references public.questions(id) on delete cascade',
      r.table_name, r.constraint_name
    );
    raise notice 'Impostato ON DELETE CASCADE su %.% (vincolo %)', r.table_name, r.column_name, r.constraint_name;
  end loop;
end $$;

-- ============================================================
-- VERIFICA (facoltativa): elenca le chiavi esterne verso questions(id) e la
-- loro regola di eliminazione (deve risultare "CASCADE" su tutte le righe).
--
--   select tc.table_name, rc.delete_rule
--   from information_schema.table_constraints tc
--   join information_schema.referential_constraints rc
--     on tc.constraint_name = rc.constraint_name and tc.table_schema = rc.constraint_schema
--   join information_schema.constraint_column_usage ccu
--     on tc.constraint_name = ccu.constraint_name and tc.table_schema = ccu.table_schema
--   where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
--     and ccu.table_name = 'questions';
-- ============================================================
