create table public.fcds_playlist_suggestions (
  id uuid primary key default gen_random_uuid(),

  course_slug text not null,

  youtube_url text not null,

  title text not null,

  channel text,

  note text,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),

  created_at timestamptz not null default now()
);

alter table public.fcds_playlist_suggestions
enable row level security;

create policy "Anyone can submit FCDS playlist suggestions"
on public.fcds_playlist_suggestions
for insert
to anon, authenticated
with check (status = 'pending');

create policy "Admins can read FCDS playlist suggestions"
on public.fcds_playlist_suggestions
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  )
);

create policy "Admins can update FCDS playlist suggestions"
on public.fcds_playlist_suggestions
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  )
);

create policy "Admins can delete FCDS playlist suggestions"
on public.fcds_playlist_suggestions
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  )
);