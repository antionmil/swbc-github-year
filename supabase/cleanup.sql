-- Removes everything from the `githubyearcommits` project except the
-- leaderboard table. Run it in THAT project's SQL editor, nowhere else.
--
-- Why a loop and not 18 DROP statements: the schema that was run by mistake
-- also created functions, triggers, policies and enum types. Naming only the
-- tables would leave those behind.

-- STEP 1 - confirm nothing holds data. Every count must be 0.
select relname as table_name, n_live_tup as rows
from pg_stat_user_tables
where schemaname = 'public'
order by n_live_tup desc, relname;

-- STEP 2 - drop it all, keeping `leaderboard`.
do $$
declare r record;
begin
  for r in select tablename from pg_tables
           where schemaname = 'public' and tablename <> 'leaderboard'
  loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;

  for r in select viewname from pg_views where schemaname = 'public'
  loop
    execute format('drop view if exists public.%I cascade', r.viewname);
  end loop;

  -- Functions, but never one owned by an extension: pgcrypto and friends can
  -- live in `public`, and dropping their functions would break the extension.
  for r in select p.oid::regprocedure as sig
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and not exists (select 1 from pg_depend d
                             where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;

  -- Enum types left over once their tables are gone.
  for r in select t.typname
           from pg_type t join pg_namespace n on n.oid = t.typnamespace
           where n.nspname = 'public' and t.typtype = 'e'
             and not exists (select 1 from pg_depend d
                             where d.objid = t.oid and d.deptype = 'e')
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end $$;

-- STEP 3 - verify. The first query must return exactly one row: leaderboard.
select tablename from pg_tables where schemaname = 'public' order by tablename;
select count(*) as leaderboard_rows from public.leaderboard;
