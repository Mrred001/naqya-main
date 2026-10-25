create table public.community_requests (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('message','calculator_suggestion','calculator_request','course_recommendation')),
 status text not null default 'pending' check(status in ('pending','approved','rejected','resolved')),
 title text not null default '' check(char_length(title)<=200),
 details text not null default '' check(char_length(details)<=3000),
 youtube_url text,
 calculator_topic text check(calculator_topic in ('basics','matrices','equations','statistics','other')),
 calculator_model text check(char_length(calculator_model)<=200),
 resource_id uuid references public.fcds_playlists(id) on delete set null,
 course_slug text references public.fcds_courses(slug) on update cascade on delete set null,
 visitor_key uuid not null,
 user_id uuid default auth.uid() references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
alter table public.community_requests enable row level security;
revoke all on public.community_requests from public,anon,authenticated;
grant select on public.community_requests to authenticated;
grant update(status,resource_id) on public.community_requests to authenticated;
create policy "Curators read community requests" on public.community_requests for select to authenticated using(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'));
create policy "Curators resolve community requests" on public.community_requests for update to authenticated using(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin')) with check(exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin'));
create index community_requests_status_created on public.community_requests(status,created_at desc);
create index community_requests_visitor_created on public.community_requests(visitor_key,created_at);
create unique index community_pending_course on public.community_requests(resource_id,course_slug) where kind='course_recommendation' and status='pending';
create unique index community_pending_calculator on public.community_requests(public.youtube_resource_key(youtube_url)) where kind='calculator_suggestion' and status='pending';

-- Public submission is a bounded write-only endpoint; no caller can read messages or choose a status/owner.
create function public.submit_community_request(p_kind text,p_payload jsonb,p_courses text[] default '{}',p_visitor uuid default null)
returns integer language plpgsql security definer set search_path='' as $$
declare rid uuid; c text; n integer:=0; inserted integer; body text:=btrim(coalesce(p_payload->>'details','')); heading text:=btrim(coalesce(p_payload->>'title','')); model text:=btrim(coalesce(p_payload->>'calculator_model','')); topic text:=p_payload->>'calculator_topic'; url text:=btrim(p_payload->>'youtube_url');
begin
 if p_visitor is null or coalesce(p_kind,'') not in ('message','calculator_suggestion','calculator_request','course_recommendation') or jsonb_typeof(p_payload) is distinct from 'object' or char_length(body)>3000 or char_length(heading)>200 then raise exception 'Invalid request' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_visitor::text,1));
 if (select count(*) from public.community_requests where visitor_key=p_visitor and created_at>now()-interval '1 hour')>=40 then raise exception 'Please try again later' using errcode='P0001'; end if;
 if p_kind='message' then
  if char_length(body)<10 then raise exception 'Message must have at least 10 characters' using errcode='22023';end if;
  insert into public.community_requests(kind,details,visitor_key,user_id) values(p_kind,body,p_visitor,auth.uid());return 1;
 elsif p_kind in ('calculator_suggestion','calculator_request') then
  if char_length(heading)<3 or char_length(model) not between 1 and 200 or coalesce(topic,'') not in ('basics','matrices','equations','statistics','other') then raise exception 'Operation, model and title required' using errcode='22023';end if;
  if p_kind='calculator_suggestion' then
   if public.youtube_resource_key(url) is null then raise exception 'Valid YouTube URL required' using errcode='22023';end if;
   if exists(select 1 from public.fcds_playlists where calculator_guide and public.youtube_resource_key(youtube_url)=public.youtube_resource_key(url)) then raise exception 'This tutorial is already in the guide' using errcode='22023';end if;
  end if;
  insert into public.community_requests(kind,title,details,youtube_url,calculator_topic,calculator_model,visitor_key,user_id) values(p_kind,heading,body,case when p_kind='calculator_suggestion' then url end,topic,model,p_visitor,auth.uid()) on conflict do nothing;
  get diagnostics n=row_count;return n;
 end if;
 rid:=(p_payload->>'resource_id')::uuid;
 if rid is null or not exists(select 1 from public.fcds_playlists where id=rid) or p_courses is null or cardinality(p_courses) not between 1 and 100 or exists(select 1 from unnest(p_courses) s where s is null or not exists(select 1 from public.fcds_courses where slug=s)) then raise exception 'Choose valid courses and source' using errcode='22023';end if;
 for c in select distinct unnest(p_courses) loop
  if not exists(select 1 from public.fcds_resource_courses where resource_id=rid and course_slug=c) then
   insert into public.community_requests(kind,details,resource_id,course_slug,visitor_key,user_id) values(p_kind,body,rid,c,p_visitor,auth.uid()) on conflict do nothing;
   get diagnostics inserted=row_count;n:=n+inserted;
  end if;
 end loop;
 return n;
end $$;
revoke all on function public.submit_community_request(text,jsonb,text[],uuid) from public;
grant execute on function public.submit_community_request(text,jsonb,text[],uuid) to anon,authenticated;

create function public.approve_course_recommendation(p_request uuid,p_role text default 'support',p_note text default null)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.community_requests;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then raise exception 'Admin access required' using errcode='42501';end if;
 if coalesce(p_role,'') not in ('primary','support') or char_length(coalesce(p_note,''))>1500 then raise exception 'Invalid course role or note' using errcode='22023';end if;
 select * into r from public.community_requests where id=p_request and kind='course_recommendation' and status='pending' for update;
 if r.id is null or r.resource_id is null or r.course_slug is null then raise exception 'Request or source no longer available' using errcode='22023';end if;
 insert into public.fcds_resource_courses(resource_id,course_slug,role,note) values(r.resource_id,r.course_slug,p_role,nullif(btrim(p_note),'')) on conflict(resource_id,course_slug) do nothing;
 update public.community_requests set status='approved' where id=r.id;
end $$;
revoke all on function public.approve_course_recommendation(uuid,text,text) from public,anon;
grant execute on function public.approve_course_recommendation(uuid,text,text) to authenticated;

create function public.approve_calculator_request(p_request uuid,p_payload jsonb,p_links jsonb)
returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.community_requests; rid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then raise exception 'Admin access required' using errcode='42501';end if;
 select * into r from public.community_requests where id=p_request and kind in ('calculator_suggestion','calculator_request') and status='pending' for update;
 if r.id is null or coalesce((p_payload->>'calculator_guide')::boolean,false)=false then raise exception 'Pending calculator request required' using errcode='22023';end if;
 if r.kind='calculator_suggestion' and public.youtube_resource_key(r.youtube_url) is distinct from public.youtube_resource_key(p_payload->>'youtube_url') then raise exception 'Suggestion URL differs' using errcode='22023';end if;
 rid:=public.save_darb_resource(p_payload=>p_payload,p_links=>p_links);
 update public.community_requests set status='approved',resource_id=rid where id=r.id;
 return rid;
end $$;
revoke all on function public.approve_calculator_request(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.approve_calculator_request(uuid,jsonb,jsonb) to authenticated;

CREATE OR REPLACE FUNCTION public.get_site_analytics(p_days integer DEFAULT 7, p_library text DEFAULT 'all'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_today date := (now() at time zone 'Africa/Cairo')::date;
 v_start timestamptz; v_previous timestamptz; v_end timestamptz; v_result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.user_roles where user_id=auth.uid() and role='admin') then
  raise exception 'Admin access required' using errcode='42501'; end if;
 if p_days not in (1,7,30) or p_library not in ('all','general','fcds') or p_days is null or p_library is null then
  raise exception 'Invalid analytics filter' using errcode='22023'; end if;
 v_start := ((v_today-(p_days-1))::timestamp at time zone 'Africa/Cairo');
 v_previous := ((v_today-(2*p_days-1))::timestamp at time zone 'Africa/Cairo');
 v_end := ((v_today+1)::timestamp at time zone 'Africa/Cairo');
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
  left join current_events e on (e.occurred_at at time zone 'Africa/Cairo')::date=d::date group by d
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
    and (e.occurred_at at time zone 'Africa/Cairo')::date>(f.first_at at time zone 'Africa/Cairo')::date
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
end $function$
;
CREATE OR REPLACE FUNCTION public.get_daily_site_visits(days integer DEFAULT 7)
 RETURNS TABLE(visit_date date, total bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  today date := (now() at time zone 'Africa/Cairo')::date;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_roles
    where user_roles.user_id = auth.uid()
      and user_roles.role = 'admin'
  ) then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if days < 1 or days > 90 then
    raise exception 'Days must be between 1 and 90' using errcode = '22023';
  end if;

  return query
  select calendar.day::date, count(site_visits.id)::bigint
  from generate_series(today - (days - 1), today, interval '1 day') as calendar(day)
  left join public.site_visits
    on (site_visits.created_at at time zone 'Africa/Cairo')::date = calendar.day::date
  group by calendar.day
  order by calendar.day;
end;
$function$
;
alter table public.site_visits alter column visit_date set default ((now() at time zone 'Africa/Cairo')::date);

