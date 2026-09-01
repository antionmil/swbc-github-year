-- Run this in the `githubyearcommits` Supabase project. Nowhere else.
--
-- NOT named `profiles`. Supabase's own User Management starter creates
-- public.profiles, and `create table if not exists` is then a silent no-op:
-- the table exists, so nothing is created, and every write fails later with
-- PGRST204 "could not find the column" rather than anything about a clash.

create table if not exists public.leaderboard (
  handle          text primary key,          -- lowercased, the dedupe key
  display_handle  text not null,             -- original casing, for display
  fill_pct        numeric(4,1) not null,     -- active days / days in range
  active_days     integer not null,
  total_days      integer not null,
  contributions   integer not null,
  streak          integer not null,
  updated_at      timestamptz not null default now()
);

-- Each row covers the twelve months ending the day it was measured. Two rows
-- measured six months apart are therefore two DIFFERENT years, and ranking
-- them without showing that would be dishonest. Stored so the page can say so.
alter table public.leaderboard add column if not exists from_date date;
alter table public.leaderboard add column if not exists to_date   date;

-- True when the figure came from that person's own OAuth token, so their
-- private contributions are counted on the days they happened.
alter table public.leaderboard
  add column if not exists includes_private boolean not null default false;

create index if not exists leaderboard_fill_idx
  on public.leaderboard (fill_pct desc, contributions desc);

-- RLS on, and NO policies: anon/authenticated clients get nothing. Every read
-- and write goes through the service-role key on the server, which bypasses
-- RLS. That key must never appear in client code.
alter table public.leaderboard enable row level security;

-- The board is now opt-in by sign-in. Everything recorded under the old
-- look-anyone-up rule was entered without consent, so it goes.
delete from public.leaderboard;
