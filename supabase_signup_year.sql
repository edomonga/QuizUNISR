-- ============================================================
-- UniQuiz — L'anno scelto in registrazione viene salvato sul profilo
-- Aggiorna la funzione handle_new_user perché legga `year` dai metadati
-- di registrazione. Esegui nel SQL Editor di Supabase. Idempotente.
-- (Richiede che la colonna profiles.year esista già — vedi supabase_add_year.sql)
-- ============================================================

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin, is_active, year)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    false,
    nullif(new.raw_user_meta_data->>'year', '')::int
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
