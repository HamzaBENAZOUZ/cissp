-- =====================================================================
--  Mise à jour v6 : questions marquées « à réviser »
--  Exécutez ce fichier UNE fois dans Supabase > SQL Editor.
--  Vos questions et votre progression ne sont pas touchées.
-- =====================================================================
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
