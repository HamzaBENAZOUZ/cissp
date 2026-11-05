-- =====================================================================
--  Vérification et réparation des tables « quiz sauvegardés » (v4) et « questions marquées » (v6)
--  À exécuter dans Supabase > SQL Editor. Sans risque : ne supprime aucune donnée.
-- =====================================================================

-- 1) Réparation (idempotente) : crée ce qui manque, remet les droits et les règles RLS.
create table if not exists public.saved_quizzes (
  id text not null, user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null, updated_at timestamptz not null default now(), primary key (user_id, id));
create table if not exists public.flags (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id bigint not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, question_id));
alter table public.saved_quizzes alter column user_id set default auth.uid();
alter table public.flags         alter column user_id set default auth.uid();
alter table public.saved_quizzes enable row level security;
alter table public.flags         enable row level security;
drop policy if exists "saved_quizzes_own" on public.saved_quizzes;
create policy "saved_quizzes_own" on public.saved_quizzes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "flags_own" on public.flags;
create policy "flags_own" on public.flags for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.saved_quizzes, public.flags to authenticated;
revoke all on public.saved_quizzes, public.flags from anon;
notify pgrst, 'reload schema';   -- l'API voit tout de suite les nouvelles tables

-- 2) Contrôle : chaque ligne doit afficher « OK ».
select 'tables'   as controle, case when count(*) = 2 then 'OK' else 'MANQUANT : ' || 2 - count(*) end as resultat
  from information_schema.tables where table_schema = 'public' and table_name in ('saved_quizzes', 'flags')
union all
select 'RLS', case when bool_and(relrowsecurity) then 'OK' else 'RLS désactivé' end
  from pg_class where oid in ('public.saved_quizzes'::regclass, 'public.flags'::regclass)
union all
select 'règles', case when count(*) = 2 then 'OK' else count(*) || ' règle(s) sur 2' end
  from pg_policies where schemaname = 'public' and policyname in ('saved_quizzes_own', 'flags_own')
union all
select 'droits', case when count(distinct table_name) = 2 then 'OK' else 'droits manquants' end
  from information_schema.role_table_grants
  where grantee = 'authenticated' and table_schema = 'public' and table_name in ('saved_quizzes', 'flags') and privilege_type = 'INSERT';
