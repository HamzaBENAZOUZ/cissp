-- Sections de fin de chapitre du CISSP Official Study Guide (Summary + Study Essentials), texte exact du livre
-- (copyright Wiley) : lecture réservée aux comptes connectés, jamais dans le dépôt ni dans l'APK.
create table if not exists public.cissp_book_notes (
  chapter_id     int primary key references public.chapters(id) on delete cascade,
  summary        jsonb not null,   -- lignes (texte exact, anglais)
  summary_fr     jsonb,            -- traduction française (facultative)
  essentials     jsonb not null,   -- lignes « - point » (texte exact, anglais)
  essentials_fr  jsonb
);
alter table public.cissp_book_notes enable row level security;
drop policy if exists "cissp_book_notes_read_auth" on public.cissp_book_notes;
create policy "cissp_book_notes_read_auth" on public.cissp_book_notes for select to authenticated using (true);
