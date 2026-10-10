begin;

-- Match the content identity, not tracking parameters, timestamps or URL format.
create or replace function public.youtube_resource_key(resource_url text)
returns text language plpgsql immutable set search_path = '' as $$
declare
  url text := btrim(resource_url);
  host text;
  path text;
  video_id text;
  list_id text;
begin
  if url !~* '^https?://' then return null; end if;
  host := lower(substring(url from '^https?://([^/?#]+)'));
  if host not in ('youtube.com','www.youtube.com','m.youtube.com','music.youtube.com',
    'youtu.be','www.youtu.be','youtube-nocookie.com','www.youtube-nocookie.com') then return null; end if;
  path := regexp_replace(url, '^https?://[^/?#]+', '', 'i');
  list_id := substring(path from '[?&]list=([A-Za-z0-9_-]+)');
  if path ~ '^/playlist([/?#]|$)' and list_id is not null then return 'playlist:' || list_id; end if;
  if host in ('youtu.be','www.youtu.be') then
    video_id := substring(path from '^/([A-Za-z0-9_-]+)');
  else
    video_id := substring(path from '[?&]v=([A-Za-z0-9_-]+)');
    if video_id is null then video_id := substring(path from '^/(?:embed|shorts|live)/([A-Za-z0-9_-]+)'); end if;
  end if;
  if video_id is not null and video_id <> 'videoseries' then return 'video:' || video_id; end if;
  if list_id is not null then return 'playlist:' || list_id; end if;
  return null;
end;
$$;

create index if not exists fcds_resource_youtube_key_idx on public.fcds_playlists(public.youtube_resource_key(youtube_url));
create index if not exists content_youtube_key_idx on public.content(public.youtube_resource_key(youtube_url));
create index if not exists fcds_suggestion_youtube_key_idx on public.fcds_playlist_suggestions(public.youtube_resource_key(youtube_url)) where status = 'pending';
create index if not exists general_suggestion_youtube_key_idx on public.general_content_suggestions(public.youtube_resource_key(youtube_url)) where status = 'pending';

-- Return only duplicate status; never expose suggestion details or submitters.
create or replace function public.suggestion_link_status(resource_url text)
returns text language plpgsql volatile security definer set search_path = '' as $$
declare resource_key text := public.youtube_resource_key(resource_url);
begin
  if resource_key is null then raise exception 'invalid_youtube_url' using errcode = '22023'; end if;
  if exists(select 1 from public.fcds_playlists where public.youtube_resource_key(youtube_url) = resource_key)
    or exists(select 1 from public.content where public.youtube_resource_key(youtube_url) = resource_key)
    then return 'existing'; end if;
  if exists(select 1 from public.fcds_playlist_suggestions where status = 'pending' and public.youtube_resource_key(youtube_url) = resource_key)
    or exists(select 1 from public.general_content_suggestions where status = 'pending' and public.youtube_resource_key(youtube_url) = resource_key)
    then return 'pending'; end if;
  return null;
end;
$$;
revoke all on function public.suggestion_link_status(text) from public;
grant execute on function public.suggestion_link_status(text) to anon, authenticated;

create or replace function public.prevent_duplicate_resource_suggestion()
returns trigger language plpgsql security definer set search_path = '' as $$
declare link_status text;
begin
  perform pg_advisory_xact_lock(hashtextextended(public.youtube_resource_key(new.youtube_url), 0));
  link_status := public.suggestion_link_status(new.youtube_url);
  if link_status = 'existing' then raise exception 'resource_already_exists'; end if;
  if link_status = 'pending' then raise exception 'resource_already_suggested'; end if;
  return new;
end;
$$;
revoke all on function public.prevent_duplicate_resource_suggestion() from public, anon, authenticated;
create trigger check_fcds_suggestion_link before insert on public.fcds_playlist_suggestions
for each row execute function public.prevent_duplicate_resource_suggestion();
create trigger check_general_suggestion_link before insert on public.general_content_suggestions
for each row execute function public.prevent_duplicate_resource_suggestion();

-- Anonymous browser IDs are private; only aggregate published-video rankings are public.
create table public.fcds_resource_opens (
  resource_id uuid not null references public.fcds_playlists(id) on delete cascade,
  visitor_id uuid not null,
  open_count bigint not null default 1 check (open_count > 0),
  last_opened_at timestamptz not null default now(),
  primary key (resource_id, visitor_id)
);
alter table public.fcds_resource_opens enable row level security;
revoke all on public.fcds_resource_opens from anon, authenticated;

create or replace function public.record_fcds_open(resource_id uuid, visitor_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if visitor_id is null or not exists(select 1 from public.fcds_playlists p where p.id = resource_id) then return; end if;
  insert into public.fcds_resource_opens as opens (resource_id, visitor_id)
  values (record_fcds_open.resource_id, record_fcds_open.visitor_id)
  on conflict on constraint fcds_resource_opens_pkey do update
    set open_count = opens.open_count + 1, last_opened_at = now()
    where opens.last_opened_at <= now() - interval '30 minutes';
end;
$$;
revoke all on function public.record_fcds_open(uuid, uuid) from public;
grant execute on function public.record_fcds_open(uuid, uuid) to anon, authenticated;

create or replace function public.get_top_fcds_videos()
returns table(id uuid, course_slug text, youtube_url text, title text, channel text,
  thumbnail_url text, created_at timestamptz, total_opens bigint)
language sql stable security definer set search_path = '' as $$
  select p.id, p.course_slug, p.youtube_url, p.title, p.channel,
    p.thumbnail_url, p.created_at, sum(o.open_count)::bigint as total_opens
  from public.fcds_playlists p join public.fcds_resource_opens o on o.resource_id = p.id
  where public.youtube_resource_key(p.youtube_url) like 'video:%'
  group by p.id
  order by total_opens desc, p.created_at desc, p.id
  limit 3;
$$;
revoke all on function public.get_top_fcds_videos() from public;
grant execute on function public.get_top_fcds_videos() to anon, authenticated;

commit;
