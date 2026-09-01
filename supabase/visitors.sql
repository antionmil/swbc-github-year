-- Run this in the `githubyearcommits` project. Nowhere else.
--
-- Visitor counts for the live pill. No IP address, no user agent, no referrer
-- — one random id the browser generates for itself and keeps in localStorage.
-- Nothing here identifies a person, and nothing leaves this table.

create table if not exists public.visitors (
  sid        text primary key,
  first_seen timestamptz not null default now(),
  last_seen  timestamptz not null default now()
);

create index if not exists visitors_last_seen_idx on public.visitors (last_seen desc);

-- One round trip for the write AND all three numbers. Doing it as four
-- separate queries would mean four transatlantic hops on a 30-second ping
-- from every open tab.
create or replace function public.pulse(s text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare o integer; w integer; a integer;
begin
  insert into public.visitors (sid) values (s)
  on conflict (sid) do update set last_seen = now();

  select count(*) into o from public.visitors where last_seen > now() - interval '2 minutes';
  select count(*) into w from public.visitors where last_seen > now() - interval '7 days';
  select count(*) into a from public.visitors;

  return json_build_object('online', o, 'week', w, 'total', a);
end $$;

alter table public.visitors enable row level security;
