begin;

-- Keep the same three-way music classification across both libraries and
-- persist what users report with suggestions so curators can verify it.
alter table public.fcds_playlists
  add column if not exists music_status text not null default 'no_music'
  check (music_status in ('no_music', 'minimal_music', 'has_music'));

alter table public.general_content_suggestions
  add column if not exists music_status text not null default 'no_music'
  check (music_status in ('no_music', 'minimal_music'));

alter table public.fcds_playlist_suggestions
  add column if not exists music_status text not null default 'no_music'
  check (music_status in ('no_music', 'minimal_music'));

commit;
