-- Preserve canonical source IDs: existing saves, progress, and opens remain valid.
alter table public.fcds_playlists alter column course_slug drop not null;
alter table public.fcds_playlists
 add column calculator_guide boolean not null default false,
 add column calculator_topic text,
 add column calculator_model text,
 add constraint calculator_topic_check check (calculator_topic is null or calculator_topic in ('basics','matrices','equations','statistics','other'));
create unique index fcds_resource_unique_youtube on public.fcds_playlists(public.youtube_resource_key(youtube_url)) where public.youtube_resource_key(youtube_url) is not null;
create table public.fcds_resource_courses (
 resource_id uuid not null references public.fcds_playlists(id) on delete cascade,
 course_slug text not null references public.fcds_courses(slug) on delete cascade on update cascade,
 role text not null default 'primary' check(role in ('primary','support')),
 note text check(char_length(note)<=1500),
 primary key(resource_id,course_slug)
);
create index fcds_resource_courses_course on public.fcds_resource_courses(course_slug,role);
alter table public.fcds_resource_courses enable row level security;
grant select on public.fcds_resource_courses to anon,authenticated;
grant insert,update,delete on public.fcds_resource_courses to authenticated;
create policy "Public read source associations" on public.fcds_resource_courses for select to anon,authenticated using(true);
create policy "Curators manage source associations" on public.fcds_resource_courses for all to authenticated
 using(exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'))
 with check(exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin'));
insert into public.fcds_resource_courses(resource_id,course_slug,role) select id,course_slug,'primary' from public.fcds_playlists where course_slug is not null;
-- Compatibility with old clients during rollout; new clients use the association RPC.
create function public.sync_initial_resource_course() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.course_slug is not null then
  insert into public.fcds_resource_courses(resource_id,course_slug,role) values(new.id,new.course_slug,'primary') on conflict do nothing;
 end if;
 return new;
end $$;
revoke all on function public.sync_initial_resource_course() from public,anon,authenticated;
create trigger initial_resource_course after insert on public.fcds_playlists for each row execute function public.sync_initial_resource_course();

create function public.save_darb_resource(p_id uuid,p_payload jsonb,p_links jsonb,p_append boolean default false,p_suggestion uuid default null,p_general_suggestion uuid default null)
returns uuid language plpgsql security invoker set search_path='' as $$
declare rid uuid; k text; is_existing boolean:=false; link jsonb; requested_url text; review text;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then raise exception 'Admin access required' using errcode='42501'; end if;
 requested_url:=btrim(p_payload->>'youtube_url'); k:=public.youtube_resource_key(requested_url);
 if k is null or nullif(btrim(p_payload->>'title'),'') is null then raise exception 'Valid YouTube URL and title required' using errcode='22023'; end if;
 if jsonb_typeof(p_links) is distinct from 'array' or jsonb_array_length(p_links)>300 then raise exception 'Invalid course selection' using errcode='22023'; end if;
 if jsonb_array_length(p_links)=0 and coalesce((p_payload->>'calculator_guide')::boolean,false)=false then raise exception 'Choose a course or the calculator guide' using errcode='22023'; end if;
 for link in select value from jsonb_array_elements(p_links) loop
  if nullif(link->>'course_slug','') is null or not exists(select 1 from public.fcds_courses where slug=link->>'course_slug') or coalesce(link->>'role','') not in ('primary','support') or char_length(coalesce(link->>'note',''))>1500 then raise exception 'Invalid course association' using errcode='22023'; end if;
 end loop;
 if (select count(*) from jsonb_array_elements(p_links))<>(select count(distinct value->>'course_slug') from jsonb_array_elements(p_links)) then raise exception 'Duplicate course association' using errcode='22023'; end if;
 review:=p_payload->>'music_status';
 if coalesce(review,'') not in ('no_music','minimal_music','has_music') then raise exception 'Review the music level first' using errcode='22023'; end if;
 if review='minimal_music' and k like 'video:%' and nullif(btrim(p_payload->>'music_skip_ranges'),'') is null then raise exception 'Music timestamps required for videos' using errcode='22023'; end if;
 if coalesce((p_payload->>'calculator_guide')::boolean,false) and (coalesce(p_payload->>'calculator_topic','') not in ('basics','matrices','equations','statistics','other') or nullif(btrim(p_payload->>'calculator_model'),'') is null) then raise exception 'Calculator topic and model required' using errcode='22023'; end if;
 if p_suggestion is not null and not exists(select 1 from public.fcds_playlist_suggestions where id=p_suggestion and status='pending' and public.youtube_resource_key(youtube_url)=k) then raise exception 'Suggestion is no longer pending or its link differs' using errcode='22023'; end if;
 if p_general_suggestion is not null and not exists(select 1 from public.general_content_suggestions where id=p_general_suggestion and status='pending' and public.youtube_resource_key(youtube_url)=k) then raise exception 'Suggestion is no longer pending or its link differs' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(k,0));
 if p_id is not null then
  select id into rid from public.fcds_playlists where id=p_id for update;
  if rid is null then raise exception 'Source not found' using errcode='22023'; end if;
 else
  select id into rid from public.fcds_playlists where public.youtube_resource_key(youtube_url)=k for update;
  is_existing:=rid is not null;
 end if;
 if rid is null then
  insert into public.fcds_playlists(course_slug,youtube_url,title,channel,language,thumbnail_url,music_status,music_skip_ranges,music_reviewed_at,calculator_guide,calculator_topic,calculator_model)
  values(p_links->0->>'course_slug',requested_url,btrim(p_payload->>'title'),nullif(btrim(p_payload->>'channel'),''),coalesce(nullif(p_payload->>'language',''),'Arabic'),nullif(p_payload->>'thumbnail_url',''),review,case when review='minimal_music' then nullif(btrim(p_payload->>'music_skip_ranges'),'') end,now(),coalesce((p_payload->>'calculator_guide')::boolean,false),nullif(p_payload->>'calculator_topic',''),nullif(btrim(p_payload->>'calculator_model'),'')) returning id into rid;
 else
  update public.fcds_playlists set youtube_url=requested_url,title=btrim(p_payload->>'title'),channel=nullif(btrim(p_payload->>'channel'),''),language=coalesce(nullif(p_payload->>'language',''),'Arabic'),thumbnail_url=nullif(p_payload->>'thumbnail_url',''),music_status=review,music_skip_ranges=case when review='minimal_music' then nullif(btrim(p_payload->>'music_skip_ranges'),'') end,music_reviewed_at=now(),
  calculator_guide=case when is_existing or p_append then calculator_guide or coalesce((p_payload->>'calculator_guide')::boolean,false) else coalesce((p_payload->>'calculator_guide')::boolean,false) end,
  calculator_topic=case when is_existing or p_append then coalesce(nullif(p_payload->>'calculator_topic',''),calculator_topic) else nullif(p_payload->>'calculator_topic','') end,
  calculator_model=case when is_existing or p_append then coalesce(nullif(btrim(p_payload->>'calculator_model'),''),calculator_model) else nullif(btrim(p_payload->>'calculator_model'),'') end where id=rid;
 end if;
 if not (p_append or is_existing) then delete from public.fcds_resource_courses where resource_id=rid; end if;
 insert into public.fcds_resource_courses(resource_id,course_slug,role,note)
 select rid,value->>'course_slug',value->>'role',nullif(btrim(value->>'note'),'') from jsonb_array_elements(p_links)
 on conflict(resource_id,course_slug) do update set role=excluded.role,note=excluded.note;
 if p_suggestion is not null then update public.fcds_playlist_suggestions set status='approved' where id=p_suggestion; end if;
 if p_general_suggestion is not null then update public.general_content_suggestions set status='approved' where id=p_general_suggestion; end if;
 return rid;
end $$;
revoke all on function public.save_darb_resource(uuid,jsonb,jsonb,boolean,uuid,uuid) from public,anon;
grant execute on function public.save_darb_resource(uuid,jsonb,jsonb,boolean,uuid,uuid) to authenticated;
CREATE OR REPLACE FUNCTION public.record_site_event(p_visitor uuid, p_session uuid, p_library text, p_event text, p_resource uuid DEFAULT NULL::uuid, p_course text DEFAULT NULL::text, p_path text DEFAULT NULL::text, p_term text DEFAULT NULL::text, p_results integer DEFAULT NULL::integer, p_source text DEFAULT 'direct'::text, p_campaign text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_course text; v_term text; v_source text; v_key text; v_seconds integer;
begin
 -- Visits from a signed-in curator are excluded from the new analytics.
 if auth.uid() is not null and exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then return; end if;
 if p_visitor is null or p_session is null or p_library is null or p_event is null
 or p_library not in ('site','general','fcds') or p_event not in ('page_view','resource_open','save','share','search') then
 raise exception 'Invalid analytics event' using errcode='22023'; end if;
 if p_path is not null and (length(p_path)>180 or p_path !~ '^/(fcds|naqya|explore|watch|saved)?(/[-a-zA-Z0-9_]+)*$') then
 raise exception 'Invalid analytics path' using errcode='22023'; end if;
 if p_resource is not null then
  if p_library='fcds' then perform 1 from public.fcds_playlists where id=p_resource;
   if not found then raise exception 'Unknown resource' using errcode='22023'; end if;
  elsif p_library='general' then
   if not exists(select 1 from public.content where id=p_resource) then raise exception 'Unknown resource' using errcode='22023'; end if;
  else raise exception 'Invalid resource library' using errcode='22023'; end if;
 end if;
 if p_course is not null then
  if p_library<>'fcds' or not exists(select 1 from public.fcds_courses where slug=p_course) then
   raise exception 'Unknown course' using errcode='22023'; end if;
  if p_resource is not null and not exists(select 1 from public.fcds_resource_courses where resource_id=p_resource and course_slug=p_course) then raise exception 'Source not linked to course' using errcode='22023'; end if;
  v_course := p_course;
 end if;
 if p_event in ('resource_open','save') and p_resource is null then raise exception 'Resource required' using errcode='22023'; end if;
 if p_event='share' and p_resource is null and v_course is null then raise exception 'Share target required' using errcode='22023'; end if;
 if p_event='search' then
  v_term := lower(left(trim(regexp_replace(coalesce(p_term,''),'\s+',' ','g')),100));
  -- Avoid retaining email addresses, pasted links, or phone-like searches.
  if length(v_term)<2 or v_term ~ '(@|https?://|www\.|[0-9]{7,})' then return; end if;
  if p_results is null or p_results<0 or p_results>100000 then raise exception 'Invalid result count' using errcode='22023'; end if;
 end if;
 if (select count(*) from analytics_private.events where visitor_key=p_visitor and occurred_at>now()-interval '1 hour')>=300 then return; end if;
 v_source := coalesce(nullif(left(regexp_replace(lower(coalesce(p_source,'')),'[^a-z0-9_. -]','','g'),80),''),'direct');
 v_seconds := case p_event when 'page_view' then 30 when 'search' then 600 else 1800 end;
 v_key := coalesce(p_resource::text,v_course,v_term,p_path,'/');
 insert into analytics_private.events(visitor_key,session_key,library,event_name,resource_id,course_slug,page_path,search_term,result_count,source,campaign,dedupe_key,bucket)
 values(p_visitor,p_session,p_library,p_event,p_resource,v_course,p_path,v_term,case when p_event='search' then p_results end,v_source,nullif(left(regexp_replace(coalesce(p_campaign,''),'[^a-zA-Z0-9_ .-]','','g'),80),''),v_key,floor(extract(epoch from now())/v_seconds)::bigint)
 on conflict do nothing;
end $function$;

CREATE OR REPLACE FUNCTION public.get_site_analytics(p_days integer DEFAULT 7, p_library text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_today date := (now() at time zone 'Africa/Khartoum')::date;
 v_start timestamptz; v_previous timestamptz; v_end timestamptz; v_result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then
  raise exception 'Admin access required' using errcode='42501'; end if;
 if p_days not in (1,7,30) or p_library not in ('all','general','fcds') or p_days is null or p_library is null then
  raise exception 'Invalid analytics filter' using errcode='22023'; end if;
 v_start := ((v_today-(p_days-1))::timestamp at time zone 'Africa/Khartoum');
 v_previous := v_start - make_interval(days=>p_days);
 v_end := ((v_today+1)::timestamp at time zone 'Africa/Khartoum');
 with scoped as (
  select * from analytics_private.events where (p_library='all' or library=p_library)
 ), current_events as (select * from scoped where occurred_at>=v_start and occurred_at<v_end),
 previous_events as (select * from scoped where occurred_at>=v_previous and occurred_at<v_start),
 periods as (select 'current' as period,* from current_events union all select 'previous',* from previous_events),
 first_seen as (select visitor_key,min(occurred_at) as first_at from scoped group by visitor_key),
 summaries as (
  select period,jsonb_build_object(
   'visitors',count(distinct visitor_key),'sessions',count(distinct session_key),
   'opens',count(*) filter(where event_name='resource_open'),
   'open_visitors',count(distinct visitor_key) filter(where event_name='resource_open'),
   'saves',count(*) filter(where event_name='save'),'shares',count(*) filter(where event_name='share'),
   'searches',count(*) filter(where event_name='search'),
   'no_results',count(*) filter(where event_name='search' and result_count=0),
   'returning',count(distinct e.visitor_key) filter(where f.first_at < case when period='current' then v_start else v_previous end)
  ) as metrics from periods e join first_seen f using(visitor_key) group by period
 ), daily as (
  select d::date as day,count(distinct e.visitor_key) as visitors,count(*) filter(where e.event_name='resource_open') as opens
  from generate_series(v_today-(p_days-1),v_today,interval '1 day') d
  left join current_events e on (e.occurred_at at time zone 'Africa/Khartoum')::date=d::date group by d
 ), resources as (
  select e.library,e.resource_id,coalesce(c.title,p.title,'Unavailable resource') as title,
  count(*) filter(where event_name='resource_open') as opens,count(*) filter(where event_name='save') as saves,count(*) filter(where event_name='share') as shares
  from current_events e left join public.content c on e.library='general' and c.id=e.resource_id
  left join public.fcds_playlists p on e.library='fcds' and p.id=e.resource_id
  where e.resource_id is not null group by e.library,e.resource_id,c.title,p.title
  order by opens desc,saves desc,shares desc limit 10
 ), course_usage as (
  select c.name,c.slug,count(*) filter(where e.event_name='page_view') as views,count(*) filter(where e.event_name='resource_open') as opens
  from current_events e join public.fcds_courses c on c.slug=e.course_slug group by c.name,c.slug order by opens desc,views desc limit 10
 ), terms as (
  select search_term as term,count(*) as searches,count(*) filter(where result_count=0) as no_results
  from current_events where event_name='search' group by search_term order by searches desc,term limit 10
 ), missed as (
  select search_term as term,count(*) as searches from current_events where event_name='search' and result_count=0 group by search_term order by searches desc,term limit 10
 ), sources as (
  select source,count(distinct session_key) as sessions,count(distinct visitor_key) as visitors from current_events group by source order by sessions desc limit 10
 ), campaigns as (
  select campaign,source,count(distinct session_key) as sessions,count(distinct visitor_key) as visitors from current_events where campaign is not null group by campaign,source order by sessions desc limit 10
 ), coverage as (
  select c.id,c.name,c.slug,count(p.id) as resources from public.fcds_courses c left join public.fcds_resource_courses rc on rc.course_slug=c.slug and rc.role='primary' left join public.fcds_playlists p on p.id=rc.resource_id group by c.id,c.name,c.slug
 ), cohort as (
  select f.visitor_key,f.first_at,exists(select 1 from scoped e where e.visitor_key=f.visitor_key
    and (e.occurred_at at time zone 'Africa/Khartoum')::date>(f.first_at at time zone 'Africa/Khartoum')::date
    and e.occurred_at<=f.first_at+interval '7 days') as returned
  from first_seen f where f.first_at>=v_start and f.first_at<=now()-interval '7 days'
 )
 select jsonb_build_object(
 'tracked_since',(select tracked_since from analytics_private.config),
 'current',coalesce((select metrics from summaries where period='current'),'{}'::jsonb),
 'previous',coalesce((select metrics from summaries where period='previous'),'{}'::jsonb),
 'daily',coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily),'[]'::jsonb),
 'resources',coalesce((select jsonb_agg(to_jsonb(resources)) from resources),'[]'::jsonb),
 'courses',coalesce((select jsonb_agg(to_jsonb(course_usage)) from course_usage),'[]'::jsonb),
 'searches',coalesce((select jsonb_agg(to_jsonb(terms)) from terms),'[]'::jsonb),
 'missed_searches',coalesce((select jsonb_agg(to_jsonb(missed)) from missed),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(sources)) from sources),'[]'::jsonb),
 'campaigns',coalesce((select jsonb_agg(to_jsonb(campaigns)) from campaigns),'[]'::jsonb),
 'retention',jsonb_build_object('eligible',(select count(*) from cohort),'returned',(select count(*) from cohort where returned)),
 'coverage',case when p_library='general' then null else jsonb_build_object('unique_resources',(select count(*) from public.fcds_playlists),'associations',(select count(*) from public.fcds_resource_courses),'support_only',(select count(*) from coverage c where c.resources=0 and exists(select 1 from public.fcds_resource_courses rc where rc.course_slug=c.slug and rc.role='support')),'total',(select count(*) from coverage),'covered',(select count(*) from coverage where resources>0),'missing',coalesce((select jsonb_agg(to_jsonb(x)) from (select name,slug from coverage where resources=0 order by name limit 10)x),'[]'::jsonb)) end,
 'pending',(select count(*) from (select id,'general' as library from public.general_content_suggestions where status='pending' union all select id,'fcds' from public.fcds_playlist_suggestions where status='pending')s where p_library='all' or library=p_library),
 'reports',(select count(*) from public.site_reports where status='new' and (p_library='all' or library=p_library))
 ) into v_result;
 return v_result;
end $function$;
