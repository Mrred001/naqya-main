-- Live integration assertions. All request, association and source fixtures are rolled back.
begin;
select set_config('test.visitor',gen_random_uuid()::text,true);
select set_config('test.resource',(select id::text from public.fcds_playlists order by id limit 1),true);
select set_config('test.course',(select c.slug from public.fcds_courses c where not exists(select 1 from public.fcds_resource_courses l where l.course_slug=c.slug and l.resource_id=current_setting('test.resource')::uuid) order by c.slug limit 1),true);
select set_config('request.jwt.claim.sub','',true);
set local role anon;
do $$
declare v uuid:=current_setting('test.visitor')::uuid;rid uuid:=current_setting('test.resource')::uuid;c text:=current_setting('test.course');n integer;
begin
 n:=public.submit_community_request('message','{"details":"Integration test message"}',p_visitor=>v);assert n=1,'Anonymous message submission';
 begin
  perform public.submit_community_request('message','{"details":"short"}',p_visitor=>v);raise exception 'Short message accepted';
 exception when sqlstate '22023' then null;end;
 begin
  perform 1 from public.community_requests;raise exception 'Anonymous read allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.community_requests(kind,details,visitor_key,status) values('message','Forged approval',v,'approved');raise exception 'Anonymous direct write allowed';
 exception when insufficient_privilege then null;end;
 begin
  perform public.approve_course_recommendation(gen_random_uuid());raise exception 'Anonymous approval allowed';
 exception when insufficient_privilege then null;end;
 n:=public.submit_community_request('course_recommendation',jsonb_build_object('resource_id',rid,'details','Useful matrix tutorial'),array[c],v);assert n=1,'Recommendation created';
 n:=public.submit_community_request('course_recommendation',jsonb_build_object('resource_id',rid),array[c,c],v);assert n=0,'Repeated/multiselect duplicates suppressed';
 n:=public.submit_community_request('calculator_suggestion','{"youtube_url":"https://youtu.be/QA000000009","title":"Matrix square tutorial","calculator_model":"Test fx-991EX","calculator_topic":"matrices"}',p_visitor=>v);assert n=1,'Calculator suggestion submitted';
 n:=public.submit_community_request('calculator_suggestion','{"youtube_url":"https://youtube.com/watch?v=QA000000009","title":"Matrix square tutorial","calculator_model":"Test fx-991EX","calculator_topic":"matrices"}',p_visitor=>v);assert n=0,'Normalized duplicate suggestion suppressed';
 n:=public.submit_community_request('calculator_request','{"title":"Solve nonlinear equations","calculator_model":"Test fx-991EX","calculator_topic":"equations"}',p_visitor=>v);assert n=1,'Tutorial request without URL';
end $$;
reset role;
select set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' limit 1),true);
set local role authenticated;
do $$
declare v uuid:=current_setting('test.visitor')::uuid;rid uuid:=current_setting('test.resource')::uuid;c text:=current_setting('test.course');request_id uuid;published uuid;payload jsonb;
begin
 assert exists(select 1 from public.community_requests where visitor_key=v and kind='message' and status='pending'),'Admin inbox reads messages';
 assert not exists(select 1 from public.fcds_resource_courses where resource_id=rid and course_slug=c),'Submission does not auto-link a source';
 select id into request_id from public.community_requests where visitor_key=v and kind='course_recommendation';
 perform public.approve_course_recommendation(request_id);
 assert exists(select 1 from public.fcds_resource_courses where resource_id=rid and course_slug=c and role='support'),'Approval defaults to supporting role';
 assert (select status='approved' from public.community_requests where id=request_id),'Approval resolves the request';
 select id into request_id from public.community_requests where visitor_key=v and kind='calculator_suggestion';
 payload:='{"youtube_url":"https://youtu.be/QA000000009","title":"Matrix square tutorial","calculator_model":"Test fx-991EX","calculator_topic":"matrices","calculator_guide":true,"music_status":""}'::jsonb;
 begin
  perform public.approve_calculator_request(request_id,payload,'[]');raise exception 'Unreviewed audio accepted';
 exception when sqlstate '22023' then null;end;
 assert (select status='pending' from public.community_requests where id=request_id),'Failed publish stays pending';
 assert not exists(select 1 from public.fcds_playlists where public.youtube_resource_key(youtube_url)='video:QA000000009'),'No partial source insertion';
 published:=public.approve_calculator_request(request_id,payload||'{"music_status":"no_music"}','[]');
 assert exists(select 1 from public.fcds_playlists where id=published and calculator_guide and music_reviewed_at is not null),'Reviewed calculator source published';
 assert (select status='approved' and resource_id=published from public.community_requests where id=request_id),'Publication and suggestion approval are atomic';
 select id into request_id from public.community_requests where visitor_key=v and kind='calculator_request';
 published:=public.approve_calculator_request(request_id,payload||'{"music_status":"no_music","youtube_url":"https://youtube.com/watch?v=QA000000009"}','[]');
 assert (select count(*)=1 from public.fcds_playlists where public.youtube_resource_key(youtube_url)='video:QA000000009'),'Reusing tutorial for a request does not duplicate it';
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
 assert not exists(select 1 from public.community_requests),'Nonadmin cannot read private inbox';
 begin
  perform public.approve_course_recommendation(request_id);raise exception 'Nonadmin approval allowed';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$
begin
 assert pg_get_functiondef('public.get_daily_site_visits(integer)'::regprocedure) like '%site_visits.created_at at time zone ''Africa/Cairo''%','Daily traffic regrouped from original timestamps';
 assert pg_get_functiondef('public.get_site_analytics(integer,text)'::regprocedure) not like '%Africa/Khartoum%','All analytics boundaries use Cairo';
 assert ('2026-10-25 21:30:00+00'::timestamptz at time zone 'Africa/Cairo')::date='2026-10-26'::date,'Summer midnight';
 assert ('2026-12-01 21:30:00+00'::timestamptz at time zone 'Africa/Cairo')::date='2026-12-01'::date,'Winter midnight';
end $$;
rollback;
select 'Community, approval, deduplication, privacy and Egypt-time assertions passed; fixtures rolled back' result;
