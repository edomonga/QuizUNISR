-- ============================================================
-- UniQuiz — Immagini nelle domande
-- Esegui nel SQL Editor di Supabase. Idempotente.
-- (Richiede la funzione public.is_admin(), già presente.)
-- ============================================================

-- ------------------------------------------------------------
-- 1) COLONNA: URL dell'immagine sulla domanda (solo il link, non il file)
-- ------------------------------------------------------------
alter table public.questions
  add column if not exists image_url text;

-- ------------------------------------------------------------
-- 2) BUCKET di Storage pubblico per le immagini delle domande
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- 3) POLICY sullo Storage
--    Lettura: pubblica (le immagini sono servite via URL pubblico).
--    Scrittura: riservata agli admin (super o limitati).
-- ------------------------------------------------------------
drop policy if exists "Public read question images" on storage.objects;
create policy "Public read question images" on storage.objects
  for select using (bucket_id = 'question-images');

drop policy if exists "Admins insert question images" on storage.objects;
create policy "Admins insert question images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'question-images' and public.is_admin());

drop policy if exists "Admins update question images" on storage.objects;
create policy "Admins update question images" on storage.objects
  for update to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

drop policy if exists "Admins delete question images" on storage.objects;
create policy "Admins delete question images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'question-images' and public.is_admin());

-- ============================================================
-- Dopo l'esecuzione: nell'editor della domanda comparirà il riquadro
-- "Immagine" per caricare/rimuovere la foto (upload verso questo bucket,
-- sulla domanda si salva solo l'URL pubblico).
-- ============================================================
