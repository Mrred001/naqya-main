-- Existing labels are retained, but are not trusted without a curator review.
alter table public.content
  add column if not exists music_skip_ranges text,
  add column if not exists music_reviewed_at timestamptz;
alter table public.content alter column music_status drop default;

alter table public.fcds_playlists
  add column if not exists music_status text,
  add column if not exists music_skip_ranges text,
  add column if not exists music_reviewed_at timestamptz;

alter table public.fcds_playlists
  add constraint fcds_music_status_check
  check (music_status is null or music_status in ('no_music', 'minimal_music', 'has_music'));
alter table public.content
  add constraint content_skip_ranges_minimal_only
  check (music_skip_ranges is null or (music_status is not null and music_status = 'minimal_music'));
alter table public.fcds_playlists
  add constraint fcds_skip_ranges_minimal_only
  check (music_skip_ranges is null or (music_status is not null and music_status = 'minimal_music'));
