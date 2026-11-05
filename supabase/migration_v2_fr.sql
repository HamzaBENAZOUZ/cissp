-- =====================================================================
--  Mise à jour v2 (version bilingue FR/EN)
--  Pour une base déjà installée : exécutez ce fichier UNE fois dans
--  Supabase > SQL Editor, PUIS ré-exécutez private/seed_questions.sql
--  (ou seed_part1..3.sql). Votre progression n'est pas touchée.
-- =====================================================================
alter table public.chapters  add column if not exists title_fr text;
alter table public.questions add column if not exists question_fr text;
alter table public.questions add column if not exists options_fr jsonb;
alter table public.questions add column if not exists explanation_fr text;
