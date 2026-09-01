-- Everything the site needs, in one file. Run it once in a fresh Supabase
-- project. Safe to re-run.
--
-- The whole site works without any of this — `leaderboardEnabled` is false
-- when the env vars are absent, and the lookup, the poster and the share card
-- carry on exactly as they are. This adds the leaderboard and the counters.

-- ── Leaderboard ────────────────────────────────────────────────────────────
-- NOT named `profiles`. Supabase's own User Management starter creates
-- public.profiles, and `create table if not exists` is then a silent no-op:
-- the table exists, so nothing is created, and every write fails later with
-- PGRST204 "could not find the column" rather than anything about a clash.
create table if not exists public.leaderboard (
  handle          text primary key,          -- lowercased, the dedupe key
  display_handle  text not null,             -- original casing
  fill_pct        numeric(4,1) not null,     -- active days / days in range
  active_days     integer not null,
  total_days      integer not null,
  contributions   integer not null,
  streak          integer not null,
  from_date       date,
  to_date         date,
  includes_private boolean not null default false,
  updated_at      timestamptz not null default now()
);

-- Each row covers the twelve months ending the day it was measured, so two
-- rows measured six months apart describe two DIFFERENT years. `to_date` is
-- stored and shown for exactly that reason.
create index if not exists leaderboard_fill_idx
  on public.leaderboard (fill_pct desc, contributions desc);

-- ── Visitors and page views ────────────────────────────────────────────────
-- One random id per browser, generated client-side and kept in localStorage.
-- No IP address, no user agent, no referrer. Nothing here identifies a person.
create table if not exists public.visitors (
  sid        text primary key,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);
create index if not exists visitors_last_seen_idx on public.visitors (last_seen desc);

create table if not exists public.counters (
  key text primary key,
  n   bigint not null default 0
);

-- One round trip for the write AND all four numbers. Four separate queries
-- would be four database round trips on a 30-second heartbeat from every tab.
create or replace function public.pulse(s text, v boolean default false)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare o integer; w integer; a integer; pv bigint;
begin
  insert into public.visitors (sid) values (s)
  on conflict (sid) do update set last_seen = now();

  -- Only the first call of a page load passes v=true. The heartbeats that keep
  -- "online now" honest must not count as views.
  if v then
    insert into public.counters (key, n) values ('views', 1)
    on conflict (key) do update set n = counters.n + 1;
  end if;

  select count(*) into o from public.visitors where last_seen > now() - interval '2 minutes';
  select count(*) into w from public.visitors where last_seen > now() - interval '7 days';
  select count(*) into a from public.visitors;
  select n into pv from public.counters where key = 'views';

  return json_build_object('online', o, 'week', w, 'total', a, 'views', coalesce(pv, 0));
end $$;

-- ── Rate limit ─────────────────────────────────────────────────────────────
-- Counting in each serverless instance was measured against the live site and
-- let 95 of 95 parallel requests through, because no single instance ever saw
-- more than a handful. A shared counter is the only kind that holds.
create table if not exists public.hits (
  bucket text primary key,   -- "<ip>:<hour>"
  n      integer not null default 0,
  hour   integer not null
);
create index if not exists hits_hour_idx on public.hits (hour);

create or replace function public.bump(b text, h integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v integer;
begin
  insert into public.hits (bucket, n, hour) values (b, 1, h)
  on conflict (bucket) do update set n = hits.n + 1
  returning n into v;

  if v % 500 = 0 then
    delete from public.hits where hour < h - 2;
  end if;

  return v;
end $$;

-- ── Access ─────────────────────────────────────────────────────────────────
-- RLS on, and NO policies: anon and authenticated clients get nothing. Every
-- read and write goes through the service-role key on the server, which
-- bypasses RLS. That key must never appear in client code, which is why
-- src/lib/leaderboard.ts imports "server-only".
alter table public.leaderboard enable row level security;
alter table public.visitors    enable row level security;
alter table public.counters    enable row level security;
alter table public.hits        enable row level security;
