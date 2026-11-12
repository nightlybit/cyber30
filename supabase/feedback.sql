-- Cyber30 tester feedback. Paste into: Dashboard -> SQL Editor -> New query -> Run.
-- Signed-in users can SEND feedback; nobody can read it through the app.
-- You read it in the dashboard: Table Editor -> feedback (or the query at the bottom).

create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  kind        text not null default 'general' check (kind in ('general', 'bug', 'idea', 'content')),
  rating      smallint check (rating between 1 and 5),
  day         smallint check (day between 1 and 40),
  message     text not null check (char_length(message) between 3 and 2000),
  platform    text check (char_length(platform) <= 40),
  app_version text check (char_length(app_version) <= 40)
);

alter table public.feedback enable row level security;

drop policy if exists "signed-in users can send feedback" on public.feedback;
create policy "signed-in users can send feedback" on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()));
-- No select/update/delete policies on purpose: testers can't read or change anyone's feedback.

-- Simple anti-spam: at most 20 messages per person per day.
create or replace function public.feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.feedback
      where user_id = new.user_id and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Thanks! That''s plenty of feedback for today - try again tomorrow.';
  end if;
  return new;
end;
$$;
revoke execute on function public.feedback_rate_limit() from public, anon, authenticated;

drop trigger if exists feedback_rate_limit on public.feedback;
create trigger feedback_rate_limit before insert on public.feedback
  for each row execute function public.feedback_rate_limit();

-- To read feedback with the sender's email, run this in the SQL Editor:
-- select f.created_at, u.email, f.kind, f.rating, f.day, f.message, f.platform
-- from public.feedback f join auth.users u on u.id = f.user_id order by f.created_at desc;
