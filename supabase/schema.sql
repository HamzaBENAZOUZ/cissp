-- =====================================================================
--  CISSP QCM : schéma Supabase
--  À exécuter une fois dans Supabase > SQL Editor > New query > Run
--  Ensuite, exécuter private/seed_questions.sql pour charger les questions.
-- =====================================================================

-- ---------- Contenu (lecture seule pour les utilisateurs connectés) ----------
create table if not exists public.chapters (
  id      int primary key,
  title   text not null,
  domain  int  check (domain between 1 and 8),   -- null = test complet (Practice Tests)
  title_fr text
);

create table if not exists public.questions (
  id           bigint generated always as identity primary key,
  chapter_id   int  not null references public.chapters(id) on delete cascade,
  number       int  not null,
  question     text not null,
  options      jsonb not null,          -- ["texte A", "texte B", ...]
  correct      jsonb not null,          -- ["B"] ou ["A","C","D"]
  explanation  text not null,
  multi        boolean not null default false,
  question_fr     text,                 -- traduction française (facultative)
  options_fr      jsonb,
  explanation_fr  text,
  scenario        text,                 -- mise en situation commune à plusieurs questions (Practice Tests)
  scenario_fr     text,
  unique (chapter_id, number)
);
-- Bases créées avec une version précédente : ajoute les colonnes FR si besoin.
alter table public.chapters  add column if not exists title_fr text;
alter table public.questions add column if not exists question_fr text;
alter table public.questions add column if not exists options_fr jsonb;
alter table public.questions add column if not exists explanation_fr text;
alter table public.questions add column if not exists scenario text;
alter table public.questions add column if not exists scenario_fr text;
alter table public.chapters  alter column domain drop not null;
create index if not exists questions_chapter_idx on public.questions(chapter_id);

-- ---------- Progression (privée à chaque utilisateur) ----------
create table if not exists public.attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode        text not null check (mode in ('chapter','exam','mistakes','domain')),
  chapter_id  int references public.chapters(id),
  total       int not null check (total > 0),
  correct     int not null check (correct >= 0),
  duration_s  int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts(user_id, created_at desc);

create table if not exists public.answers (
  id           bigint generated always as identity primary key,
  attempt_id   uuid not null references public.attempts(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id  bigint not null references public.questions(id) on delete cascade,
  selected     jsonb not null,
  is_correct   boolean not null,
  created_at   timestamptz not null default now()
);
create index if not exists answers_user_q_idx on public.answers(user_id, question_id, created_at desc);

-- ---------- Row Level Security ----------
alter table public.chapters  enable row level security;
alter table public.questions enable row level security;
alter table public.attempts  enable row level security;
alter table public.answers   enable row level security;

-- Les questions ne sont lisibles QUE par un utilisateur connecté
-- (la clé "anon" publiée dans le site ne suffit pas à les lire).
drop policy if exists "chapters_read_auth"  on public.chapters;
create policy "chapters_read_auth"  on public.chapters  for select to authenticated using (true);
drop policy if exists "questions_read_auth" on public.questions;
create policy "questions_read_auth" on public.questions for select to authenticated using (true);

-- Chaque utilisateur ne voit / n'écrit que ses propres tentatives et réponses.
drop policy if exists "attempts_own" on public.attempts;
create policy "attempts_own" on public.attempts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "answers_own" on public.answers;
create policy "answers_own" on public.answers for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Droits de table (Supabase les donne par défaut, on les rend explicites).
grant select on public.chapters, public.questions to authenticated;
grant select, insert, delete on public.attempts, public.answers to authenticated;
revoke all on public.chapters, public.questions, public.attempts, public.answers from anon;

-- Quiz sauvegardés (v4) : reprise d'un quiz en cours, sur n'importe quel appareil.
create table if not exists public.saved_quizzes (
  id          text not null,                                   -- identifiant généré par le site
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data        jsonb not null,                                  -- question en cours, réponses, temps écoulé…
  updated_at  timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.saved_quizzes enable row level security;

drop policy if exists "saved_quizzes_own" on public.saved_quizzes;
create policy "saved_quizzes_own" on public.saved_quizzes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.saved_quizzes to authenticated;
revoke all on public.saved_quizzes from anon;

-- Questions marquées « à réviser » (v6).
create table if not exists public.flags (
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id  bigint not null references public.questions(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, question_id)
);

alter table public.flags enable row level security;

drop policy if exists "flags_own" on public.flags;
create policy "flags_own" on public.flags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on public.flags to authenticated;
revoke all on public.flags from anon;
