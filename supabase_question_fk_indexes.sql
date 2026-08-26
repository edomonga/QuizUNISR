-- ============================================================
-- UniQuiz — Indici su question_id (elimina i timeout in cascata)
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- Richiede che supabase_question_delete_cascade.sql sia già stato eseguito.
-- ============================================================
--
-- Problema: con ON DELETE CASCADE attivo, eliminare una domanda impone al
-- database di trovare le righe collegate in ogni tabella che la referenzia
-- (user_wrong_questions, user_questions_seen, question_reports, ...).
-- SENZA un indice su question_id, quella ricerca è una scansione COMPLETA
-- della tabella. Con 800+ utenti attivi, user_questions_seen può avere
-- centinaia di migliaia di righe: eliminare 1500+ domande in una sola
-- istruzione, ciascuna con una scansione completa su tabelle enormi, supera
-- il tempo massimo consentito ("canceling statement due to statement
-- timeout") anche se il vincolo di per sé non blocca più nulla.
--
-- Questo script crea AUTOMATICAMENTE un indice su question_id per ogni
-- tabella che referenzia questions(id) tramite quella colonna (stessa
-- individuazione dinamica usata per il fix del vincolo): la ricerca delle
-- righe da cancellare passa da "scansiona tutto" a "trova subito", e il
-- timeout sparisce.

do $$
declare
  r record;
  idx_name text;
begin
  for r in
    select tc.table_name, kcu.column_name
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
    idx_name := 'idx_' || r.table_name || '_question_id';
    execute format('create index if not exists %I on public.%I (%I)', idx_name, r.table_name, r.column_name);
    raise notice 'Indice creato/verificato: % su %.%', idx_name, r.table_name, r.column_name;
  end loop;
end $$;

-- ============================================================
-- VERIFICA (facoltativa): elenca gli indici creati.
--
--   select tablename, indexname from pg_indexes
--   where schemaname = 'public' and indexname like 'idx_%_question_id';
-- ============================================================
