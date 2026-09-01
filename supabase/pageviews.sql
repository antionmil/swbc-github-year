-- Run this in the `githubyearcommits` project. Replaces the earlier pulse().
--
-- Adds page views alongside unique visitors. They answer different questions:
-- visitors is people, views is how often they come back and how deep they go.
-- A sponsor usually wants both, and one without the other is easy to misread.

create table if not exists public.counters (
  key text primary key,
  n   bigint not null default 0
);

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

  -- Only the first call of a page load carries v=true. The 30-second
  -- heartbeats that keep "online now" honest must not count as views.
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

alter table public.counters enable row level security;
