begin;
create table public.user_resource_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  fcds_playlist_id uuid not null references public.fcds_playlists(id) on delete cascade,
  status text not null check (status in ('in_progress', 'completed')),
  primary key (user_id, fcds_playlist_id)
);
alter table public.user_resource_progress enable row level security;
revoke all on public.user_resource_progress from public, anon, authenticated;
grant select, delete on public.user_resource_progress to authenticated;
grant insert (user_id, fcds_playlist_id, status) on public.user_resource_progress to authenticated;
grant update (user_id, fcds_playlist_id, status) on public.user_resource_progress to authenticated;
create policy "Read own resource progress" on public.user_resource_progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "Insert own resource progress" on public.user_resource_progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Update own resource progress" on public.user_resource_progress
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Delete own resource progress" on public.user_resource_progress
  for delete to authenticated using ((select auth.uid()) = user_id);
commit;
