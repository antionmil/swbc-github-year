-- Run this once in the Supabase SQL editor.
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

create index if not exists leaderboard_fill_idx
  on public.leaderboard (fill_pct desc, contributions desc);

-- RLS on, and NO policies: anon/authenticated clients get nothing. Every read
-- and write goes through the service-role key on the server, which bypasses
-- RLS. That key must never appear in client code.
alter table public.leaderboard enable row level security;
