-- Wspólna tablica wyników Fibi Run (Supabase).
-- Instrukcja: README.md, sekcja "Tablica wyników".
-- W SQL Editor projektu wklej całość i uruchom.

create table if not exists public.scores (
  id bigint generated always as identity primary key,
  nick text not null
    check (char_length(trim(nick)) >= 1 and char_length(nick) <= 12),
  score integer not null
    check (score >= 0 and score <= 999999),
  time_ms integer not null
    check (time_ms >= 0 and time_ms <= 86400000),
  created_at timestamptz not null default now()
);

create index if not exists scores_rank_idx on public.scores (score desc, time_ms asc);

alter table public.scores enable row level security;

drop policy if exists "scores_select_public" on public.scores;
create policy "scores_select_public"
  on public.scores for select
  using (true);

drop policy if exists "scores_insert_public" on public.scores;
create policy "scores_insert_public"
  on public.scores for insert
  with check (
    char_length(trim(nick)) >= 1 and char_length(nick) <= 12
    and score >= 0 and score <= 999999
    and time_ms >= 0 and time_ms <= 86400000
  );

-- Brak polityk UPDATE/DELETE: gracze nie mogą poprawiać ani usuwać wyników.
-- Klucz anon jest publiczny (wchodzi do CFG w game.js) – nie wklejaj service_role.
