-- ============================================================
-- UniQuiz — Schema Supabase
-- Copia e incolla tutto questo nel SQL Editor di Supabase
-- ============================================================

-- 1. PROFILES (utenti)
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  display_name text not null,
  is_admin boolean not null default false,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

-- 2. COURSES (materie)
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subtitle text not null default '',
  icon text not null default '📖',
  accent_color text not null default 'bg-blue-600',
  text_color text not null default 'text-blue-700',
  border_color text not null default 'border-blue-200',
  is_available boolean not null default false,
  exam_rules jsonb not null default '{
    "total_questions": 30,
    "time_limit_seconds": 2700,
    "correct_score": 1,
    "wrong_penalty": 0.2,
    "omitted_score": 0,
    "options_per_question": 5,
    "allow_multiple_correct": false,
    "distribution": {}
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. MACRO AREAS
create table if not exists public.macro_areas (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- 4. TOPICS (argomenti)
create table if not exists public.topics (
  id uuid primary key default gen_random_uuid(),
  macro_area_id uuid not null references public.macro_areas(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

-- 5. QUESTIONS (domande)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  macro_area_id uuid not null references public.macro_areas(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  question_text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answers jsonb not null default '[0]'::jsonb,
  explanation text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. USER STATS
create table if not exists public.user_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  topic_id uuid not null references public.topics(id) on delete cascade,
  topic_name text not null default '',
  macro_area_id uuid not null references public.macro_areas(id) on delete cascade,
  macro_area_name text not null default '',
  correct int not null default 0,
  total int not null default 0,
  updated_at timestamptz not null default now()
);

-- 7. EXAM RESULTS
create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  course_name text not null,
  score_in_30 numeric not null,
  raw_score numeric not null,
  correct int not null,
  wrong int not null,
  omitted int not null,
  duration_seconds int not null,
  answers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 8. APP FEEDBACK (feedback generale degli utenti sull'app)
create table if not exists public.app_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null default '',
  category text not null default 'altro',
  message text not null,
  status text not null default 'new', -- 'new' | 'reviewed'
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.macro_areas enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.user_stats enable row level security;
alter table public.exam_results enable row level security;
alter table public.app_feedback enable row level security;

-- Profiles: users read their own, admins read all
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Admins can view all profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, is_admin, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    false,
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Courses: everyone authenticated can read, only admins write
create policy "Anyone authenticated can read courses" on public.courses
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage courses" on public.courses
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Macro areas
create policy "Anyone authenticated can read macro_areas" on public.macro_areas
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage macro_areas" on public.macro_areas
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Topics
create policy "Anyone authenticated can read topics" on public.topics
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage topics" on public.topics
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Questions
create policy "Anyone authenticated can read active questions" on public.questions
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage questions" on public.questions
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- User stats: users manage their own
create policy "Users can manage own stats" on public.user_stats
  for all using (auth.uid() = user_id);

create policy "Admins can read all stats" on public.user_stats
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- Exam results: users manage their own
create policy "Users can manage own exam results" on public.exam_results
  for all using (auth.uid() = user_id);

create policy "Admins can read all exam results" on public.exam_results
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- App feedback: utenti creano/leggono il proprio, admin leggono e gestiscono tutto
create policy "Users can insert own feedback" on public.app_feedback
  for insert with check (auth.uid() = user_id);

create policy "Users can view own feedback" on public.app_feedback
  for select using (auth.uid() = user_id);

create policy "Admins can manage all feedback" on public.app_feedback
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
  );

-- ============================================================
-- SEED: Medicina Legale course
-- ============================================================

-- Inserisce il corso Medicina Legale con le sue regole d'esame
insert into public.courses (name, subtitle, icon, accent_color, text_color, border_color, is_available, exam_rules)
values (
  'Medicina Legale',
  'Igiene · Medicina Legale · Med. Lavoro · Economia Sanitaria',
  '⚖️',
  'bg-blue-600',
  'text-blue-700',
  'border-blue-200',
  true,
  '{
    "total_questions": 30,
    "time_limit_seconds": 2700,
    "correct_score": 1,
    "wrong_penalty": 0.2,
    "omitted_score": 0,
    "options_per_question": 5,
    "allow_multiple_correct": false,
    "distribution": {}
  }'::jsonb
);

-- Nota: dopo aver inserito il corso, aggiungi le macro-aree e gli argomenti
-- dall'interfaccia admin, poi carica le domande tramite il pannello admin.
-- La distribuzione dell'esame va aggiornata dall'admin dopo aver creato le macro-aree.
