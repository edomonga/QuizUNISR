-- ============================================================
-- UniQuiz — Stato "email confermata" sul profilo
-- Esegui questo script nel SQL Editor di Supabase. Idempotente.
-- ============================================================
--
-- Porta su public.profiles l'informazione "l'utente ha confermato l'email?"
-- (che vive in auth.users.email_confirmed_at). Serve al pannello admin per
-- mostrare tra gli utenti "in attesa di attivazione" SOLO chi ha già
-- confermato l'email.
--
-- Nota: gli utenti registrati quando la conferma email era disattivata sono
-- già confermati (Supabase li auto-confermava): il backfill qui sotto li marca
-- correttamente come email_confirmed = true, quindi NON devono riconfermare.

-- ------------------------------------------------------------
-- 1) NUOVA COLONNA
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists email_confirmed boolean not null default false;

-- ------------------------------------------------------------
-- 2) ALLA CREAZIONE DEL PROFILO, imposta email_confirmed dallo stato auth
-- (mantiene la logica esistente su display_name/year).
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin, is_active, year, email_confirmed)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    false,
    nullif(new.raw_user_meta_data->>'year', '')::int,
    new.email_confirmed_at is not null
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 3) SINCRONIZZA quando l'utente conferma (o cambia stato) l'email
-- ------------------------------------------------------------
create or replace function public.sync_email_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set email_confirmed = (new.email_confirmed_at is not null)
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row
  when (new.email_confirmed_at is distinct from old.email_confirmed_at)
  execute function public.sync_email_confirmed();

-- ------------------------------------------------------------
-- 4) BACKFILL degli utenti esistenti (nessuno deve riconfermare)
-- ------------------------------------------------------------
update public.profiles p
set email_confirmed = (u.email_confirmed_at is not null)
from auth.users u
where u.id = p.id;

-- ============================================================
-- VERIFICA (facoltativa):
--   select email, is_active, email_confirmed from public.profiles order by created_at desc;
-- ============================================================
