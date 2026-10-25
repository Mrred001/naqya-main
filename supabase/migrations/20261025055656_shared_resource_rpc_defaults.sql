create or replace function public.save_darb_resource(p_id uuid default null,p_payload jsonb default '{}'::jsonb,p_links jsonb default '[]'::jsonb,p_append boolean default false,p_suggestion uuid default null,p_general_suggestion uuid default null)
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
