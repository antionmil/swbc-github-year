-- Run this in the `githubyearcommits` project. Nowhere else.
--
-- A shared counter for /api/seen. Counting in each serverless instance was
-- measured against the live site and let 95 of 95 parallel requests through,
-- because no single instance ever saw more than a handful.

create table if not exists public.hits (
  bucket text primary key,   -- "<ip>:<hour>"
  n      integer not null default 0,
  hour   integer not null
);

create index if not exists hits_hour_idx on public.hits (hour);

-- One atomic statement. `bucket` is the PRIMARY KEY, which is load-bearing:
-- without the uniqueness there is no conflict to catch, every call inserts a
-- fresh row, every count comes back as 1, and the limit silently never fires.
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

  -- Cheap opportunistic sweep; rows are worthless once the hour has passed.
  if v % 500 = 0 then
    delete from public.hits where hour < h - 2;
  end if;

  return v;
end $$;

alter table public.hits enable row level security;
