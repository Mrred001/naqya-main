-- Public ingestion is intentionally write-only. Aggregates require a curator account.
create schema if not exists analytics_private;
revoke all on schema analytics_private from public, anon, authenticated;
create table analytics_private.config (singleton boolean primary key default true check(singleton), tracked_since timestamptz not null default now());
insert into analytics_private.config(singleton) values(true);
alter table analytics_private.config enable row level security;
create table analytics_private.events (
 id bigint generated always as identity primary key,
 occurred_at timestamptz not null default now(),
 visitor_key uuid not null, session_key uuid not null,
 library text not null check(library in ('site','general','fcds')),
 event_name text not null check(event_name in ('page_view','resource_open','save','share','search')),
 resource_id uuid, course_slug text, page_path text,
 search_term text, result_count integer,
 source text not null, campaign text,
 dedupe_key text not null, bucket bigint not null,
 unique(visitor_key, library, event_name, dedupe_key, bucket)
);
alter table analytics_private.events enable row level security;
create index analytics_events_time on analytics_private.events(occurred_at, library);
create index analytics_events_visitor on analytics_private.events(visitor_key, occurred_at);

create function public.record_site_event(
 p_visitor uuid, p_session uuid, p_library text, p_event text,
 p_resource uuid default null, p_course text default null, p_path text default null,
 p_term text default null, p_results integer default null,
 p_source text default 'direct', p_campaign text default null
) returns void language plpgsql security definer set search_path='' as $$
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
  if p_library='fcds' then select course_slug into v_course from public.fcds_playlists where id=p_resource;
   if not found then raise exception 'Unknown resource' using errcode='22023'; end if;
  elsif p_library='general' then
   if not exists(select 1 from public.content where id=p_resource) then raise exception 'Unknown resource' using errcode='22023'; end if;
  else raise exception 'Invalid resource library' using errcode='22023'; end if;
 end if;
 if p_course is not null then
  if p_library<>'fcds' or not exists(select 1 from public.fcds_courses where slug=p_course) then
   raise exception 'Unknown course' using errcode='22023'; end if;
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
end $$;
revoke all on function public.record_site_event(uuid,uuid,text,text,uuid,text,text,text,integer,text,text) from public;
grant execute on function public.record_site_event(uuid,uuid,text,text,uuid,text,text,text,integer,text,text) to anon,authenticated;

create function public.get_site_analytics(p_days integer default 7,p_library text default 'all') returns jsonb
language plpgsql security definer set search_path='' as $$
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
  select c.id,c.name,c.slug,count(p.id) as resources from public.fcds_courses c left join public.fcds_playlists p on p.course_slug=c.slug group by c.id,c.name,c.slug
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
 'coverage',case when p_library='general' then null else jsonb_build_object('total',(select count(*) from coverage),'covered',(select count(*) from coverage where resources>0),'missing',coalesce((select jsonb_agg(to_jsonb(x)) from (select name,slug from coverage where resources=0 order by name limit 10)x),'[]'::jsonb)) end,
 'pending',(select count(*) from (select id,'general' as library from public.general_content_suggestions where status='pending' union all select id,'fcds' from public.fcds_playlist_suggestions where status='pending')s where p_library='all' or library=p_library),
 'reports',(select count(*) from public.site_reports where status='new' and (p_library='all' or library=p_library))
 ) into v_result;
 return v_result;
end $$;
revoke all on function public.get_site_analytics(integer,text) from public,anon;
grant execute on function public.get_site_analytics(integer,text) to authenticated;
