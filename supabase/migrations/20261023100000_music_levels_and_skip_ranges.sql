-- Keep historic Darb sources unreviewed (NULL). Do not claim "No music"
-- for resources published before the curator has checked the audio.
alter table public.content
  add column if not exists music_skip_ranges text;

alter table public.fcds_playlists
  add column if not exists music_status public.music_status,
  add column if not exists music_skip_ranges text;

-- Skip instructions only apply to content explicitly marked minimal music.
alter table public.content
  add constraint content_skip_ranges_minimal_only
  check (music_skip_ranges is null or music_status = 'minimal_music');

alter table public.fcds_playlists
  add constraint fcds_skip_ranges_minimal_only
  check (music_skip_ranges is null or music_status = 'minimal_music');
