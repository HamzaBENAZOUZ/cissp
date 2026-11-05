-- =====================================================================
--  Mise à jour v3 : section « Official Practice Tests »
--  Pour une base déjà installée : exécutez ce fichier UNE fois dans
--  Supabase > SQL Editor, PUIS les fichiers private/seed_practice_part1..6.sql.
--  Vos questions actuelles et votre progression ne sont pas touchées.
-- =====================================================================
alter table public.chapters  add column if not exists title_fr text;
alter table public.chapters  alter column domain drop not null;          -- tests complets : pas de domaine
alter table public.questions add column if not exists question_fr text;
alter table public.questions add column if not exists options_fr jsonb;
alter table public.questions add column if not exists explanation_fr text;
alter table public.questions add column if not exists scenario text;     -- mise en situation partagée
alter table public.questions add column if not exists scenario_fr text;
