-- =====================================================================
--  Mise à jour v4 : quiz sauvegardés (reprise sur n'importe quel appareil)
--  Exécutez ce fichier UNE fois dans Supabase > SQL Editor.
--  Vos questions et votre progression ne sont pas touchées.
-- =====================================================================
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
