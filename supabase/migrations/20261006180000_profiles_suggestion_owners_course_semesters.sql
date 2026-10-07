begin;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

drop policy if exists "Read own profile or admins" on public.profiles;
create policy "Read own profile or admins"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or exists (
    select 1
    from public.user_roles
    where user_roles.user_id = (select auth.uid())
      and user_roles.role = 'admin'
  )
);

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  handle_prefix text;
begin
  handle_prefix := regexp_replace(
    lower(split_part(coalesce(new.email, ''), '@', 1)),
    '[^a-z0-9]+',
    '_',
    'g'
  );
  handle_prefix := coalesce(nullif(left(handle_prefix, 20), ''), 'student');

  insert into public.profiles (id, username)
  values (
    new.id,
    handle_prefix || '_' || left(replace(new.id::text, '-', ''), 10)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_profile_for_auth_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

with users_to_backfill as (
  select
    id,
    coalesce(
      nullif(left(regexp_replace(lower(split_part(coalesce(email, ''), '@', 1)), '[^a-z0-9]+', '_', 'g'), 20), ''),
      'student'
    ) as handle_prefix
  from auth.users
)
insert into public.profiles (id, username)
select
  id,
  handle_prefix || '_' || left(replace(id::text, '-', ''), 10)
from users_to_backfill
on conflict (id) do nothing;

alter table public.fcds_playlist_suggestions
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fcds_playlist_suggestions_user_id_fkey'
      and conrelid = 'public.fcds_playlist_suggestions'::regclass
  ) then
    alter table public.fcds_playlist_suggestions
      add constraint fcds_playlist_suggestions_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete set null;
  end if;
end;
$$;

alter table public.general_content_suggestions
  add column if not exists user_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'general_content_suggestions_user_id_fkey'
      and conrelid = 'public.general_content_suggestions'::regclass
  ) then
    alter table public.general_content_suggestions
      add constraint general_content_suggestions_user_id_fkey
      foreign key (user_id) references public.profiles(id) on delete set null;
  end if;
end;
$$;

create index if not exists fcds_playlist_suggestions_user_id_idx
  on public.fcds_playlist_suggestions(user_id);
create index if not exists general_content_suggestions_user_id_idx
  on public.general_content_suggestions(user_id);

create or replace function public.set_suggestion_submitter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := (select auth.uid());
  return new;
end;
$$;

revoke all on function public.set_suggestion_submitter() from public, anon, authenticated;
drop trigger if exists set_fcds_suggestion_submitter on public.fcds_playlist_suggestions;
create trigger set_fcds_suggestion_submitter
before insert on public.fcds_playlist_suggestions
for each row execute function public.set_suggestion_submitter();

drop trigger if exists set_general_suggestion_submitter on public.general_content_suggestions;
create trigger set_general_suggestion_submitter
before insert on public.general_content_suggestions
for each row execute function public.set_suggestion_submitter();

alter table public.fcds_courses
  add column if not exists semester smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fcds_courses_semester_range'
      and conrelid = 'public.fcds_courses'::regclass
  ) then
    alter table public.fcds_courses
      add constraint fcds_courses_semester_range
      check (semester is null or semester between 1 and 8);
  end if;
end;
$$;

commit;
