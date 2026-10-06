begin;
create table public.user_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content_id uuid references public.content(id) on delete cascade,
  fcds_playlist_id uuid references public.fcds_playlists(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint exactly_one_source check (num_nonnulls(content_id, fcds_playlist_id) = 1),
  unique (user_id, content_id),
  unique (user_id, fcds_playlist_id)
);
create index user_bookmarks_owner_date on public.user_bookmarks(user_id, created_at desc);
alter table public.user_bookmarks enable row level security;
revoke all on public.user_bookmarks from anon, authenticated;
grant select, delete on public.user_bookmarks to authenticated;
grant insert (user_id, content_id, fcds_playlist_id) on public.user_bookmarks to authenticated;
create policy "Read own bookmarks" on public.user_bookmarks for select to authenticated using ((select auth.uid()) = user_id);
create policy "Save own bookmarks" on public.user_bookmarks for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Remove own bookmarks" on public.user_bookmarks for delete to authenticated using ((select auth.uid()) = user_id);
commit;
