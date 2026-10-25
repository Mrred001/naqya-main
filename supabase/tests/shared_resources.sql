-- Integration assertions use existing course slugs but roll back every fixture.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.user_roles where role='admin' limit 1),true);
set local role authenticated;
do $$
declare rid uuid; same_id uuid; c1 text; c2 text; payload jsonb; aid uuid:=auth.uid(); sid uuid; before_coverage int;
begin
 select slug into c1 from public.fcds_courses order by slug limit 1;
 select slug into c2 from public.fcds_courses where slug<>c1 order by slug limit 1;
 assert c1 is not null and c2 is not null, 'Existing course fixtures required';
 payload:='{"youtube_url":"https://www.youtube.com/watch?v=QA000000001","title":"Shared resource transaction test","music_status":"no_music","calculator_guide":true,"calculator_topic":"matrices","calculator_model":"Test model"}'::jsonb;
 insert into public.fcds_playlist_suggestions(course_slug,youtube_url,title,status) values(c2,'https://youtu.be/QA000000001','Suggestion fixture','pending') returning id into sid;
 rid:=public.save_darb_resource(p_payload=>payload,p_links=>jsonb_build_array(jsonb_build_object('course_slug',c1,'role','primary'),jsonb_build_object('course_slug',c2,'role','support','note','Matrix steps')));
 assert (select count(*)=2 from public.fcds_resource_courses where resource_id=rid), 'Multiple course links';
 assert (select role='support' from public.fcds_resource_courses where resource_id=rid and course_slug=c2), 'Support role survives compatibility trigger';
 insert into public.user_bookmarks(user_id,fcds_playlist_id) values(aid,rid);
 insert into public.user_resource_progress(user_id,fcds_playlist_id,status) values(aid,rid,'in_progress');
 same_id:=public.save_darb_resource(p_payload=>payload||'{"youtube_url":"https://youtu.be/QA000000001"}'::jsonb,p_links=>jsonb_build_array(jsonb_build_object('course_slug',c1,'role','primary')));
 assert same_id=rid, 'Duplicate URL must reuse canonical ID';
 assert (select count(*)=2 from public.fcds_resource_courses where resource_id=rid), 'Duplicate add appends rather than losing links';
 perform public.save_darb_resource(p_id=>rid,p_payload=>payload||'{"calculator_guide":false}'::jsonb,p_links=>'[]'::jsonb);
 assert exists(select 1 from public.fcds_playlists where id=rid), 'Unlink must keep source';
 assert exists(select 1 from public.user_bookmarks where fcds_playlist_id=rid), 'Unlink must keep saves';
 assert exists(select 1 from public.user_resource_progress where fcds_playlist_id=rid), 'Unlink must keep progress';
 assert not exists(select 1 from public.fcds_resource_courses where resource_id=rid), 'Clear selection removes links';
 before_coverage:=(public.get_site_analytics(7,'fcds')->'coverage'->>'covered')::int;
 perform public.save_darb_resource(p_id=>rid,p_payload=>payload,p_links=>jsonb_build_array(jsonb_build_object('course_slug',c1,'role','support')));
 assert (public.get_site_analytics(7,'fcds')->'coverage'->>'covered')::int=before_coverage, 'Support sources must not inflate coverage';
 begin
  perform public.save_darb_resource(p_id=>rid,p_payload=>payload||'{"title":"Invalid overwrite","music_status":""}'::jsonb,p_links=>'[]'::jsonb);
  raise exception 'Missing review was accepted';
 exception when sqlstate '22023' then null;end;
 assert (select title='Shared resource transaction test' from public.fcds_playlists where id=rid), 'Invalid edit is atomic';
 begin
  perform public.save_darb_resource(p_payload=>payload||'{"youtube_url":"https://youtu.be/QA000000002","music_status":"minimal_music"}'::jsonb,p_links=>jsonb_build_array(jsonb_build_object('course_slug',c1,'role','primary')));
  raise exception 'Missing timestamps accepted';
 exception when sqlstate '22023' then null;end;
 perform public.save_darb_resource(p_payload=>payload,p_links=>jsonb_build_array(jsonb_build_object('course_slug',c2,'role','support')),p_suggestion=>sid);
 assert (select status='approved' from public.fcds_playlist_suggestions where id=sid), 'Approval commits together with links';
 assert (select count(*)=1 from public.fcds_playlists where public.youtube_resource_key(youtube_url)='video:QA000000001'), 'Suggestion duplicates are merged';
 perform set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000099',true);
 begin
  perform public.save_darb_resource(p_payload=>payload,p_links=>'[]'::jsonb);
  raise exception 'Nonadmin save allowed';
 exception when insufficient_privilege then null;end;
 begin
  update public.fcds_resource_courses set note='Forbidden' where resource_id=rid;
  assert not found, 'Nonadmin update must affect no rows';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$
declare rid uuid; c text; other_course text; visitor1 uuid:=gen_random_uuid(); visitor2 uuid:=gen_random_uuid();
begin
 select id into rid from public.fcds_playlists where public.youtube_resource_key(youtube_url)='video:QA000000001';
 select course_slug into c from public.fcds_resource_courses where resource_id=rid limit 1;
 select slug into other_course from public.fcds_courses where slug not in(select course_slug from public.fcds_resource_courses where resource_id=rid) limit 1;
 perform public.record_site_event(visitor1,gen_random_uuid(),'fcds','resource_open',rid,null,'/fcds/calculator');
 perform public.record_site_event(visitor2,gen_random_uuid(),'fcds','resource_open',rid,c,'/fcds/course/'||c);
 assert exists(select 1 from analytics_private.events where visitor_key=visitor1 and course_slug is null),'Guide opens must not count toward a course';
 assert exists(select 1 from analytics_private.events where visitor_key=visitor2 and course_slug=c),'Course opens use actual course context';
 begin
  perform public.record_site_event(gen_random_uuid(),gen_random_uuid(),'fcds','resource_open',rid,other_course,'/fcds/course/'||other_course);
  raise exception 'Unrelated course context accepted';
 exception when sqlstate '22023' then null;end;
 assert not has_function_privilege('anon','public.save_darb_resource(uuid,jsonb,jsonb,boolean,uuid,uuid)','execute'),'Anonymous users cannot save sources';
 assert has_table_privilege('anon','public.fcds_resource_courses','select'),'Public course links are readable';
 assert not has_table_privilege('anon','public.fcds_resource_courses','insert'),'Public cannot create course links';
end $$;
rollback;
select 'shared resource integration assertions passed; all fixtures rolled back' as result;
