-- Cyber30 cloud sync schema for Supabase.
-- Paste this whole file into: Dashboard -> SQL Editor -> New query -> Run.
-- Every row belongs to the signed-in user; Row Level Security stops anyone reading or changing anyone else's rows.

create table if not exists public.records (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tbl     text not null check (tbl in ('kv', 'progress', 'quiz', 'journal', 'flash', 'activity')),
  pk      text not null check (char_length(pk) between 1 and 200),
  data    jsonb not null check (pg_column_size(data) < 20000),
  updated double precision not null,
  primary key (user_id, tbl, pk)
);

alter table public.records enable row level security;

drop policy if exists "read own rows" on public.records;
drop policy if exists "insert own rows" on public.records;
drop policy if exists "update own rows" on public.records;
create policy "read own rows" on public.records for select to authenticated
  using (user_id = (select auth.uid()));
create policy "insert own rows" on public.records for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "update own rows" on public.records for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- One call does the whole sync: merge the device's records (newest "updated" wins), return everything.
create or replace function public.sync(items jsonb)
returns setof public.records
language sql
security invoker
set search_path = ''
as $$
  insert into public.records (user_id, tbl, pk, data, updated)
  select auth.uid(), i ->> 'tbl', i ->> 'pk', i -> 'data', (i ->> 'updated')::double precision
  from jsonb_array_elements(coalesce(items, '[]'::jsonb)) as i
  where auth.uid() is not null
  on conflict (user_id, tbl, pk) do update
    set data = excluded.data, updated = excluded.updated
    where public.records.updated < excluded.updated;
  select * from public.records where user_id = auth.uid();
$$;

revoke execute on function public.sync(jsonb) from public, anon;
grant execute on function public.sync(jsonb) to authenticated;
