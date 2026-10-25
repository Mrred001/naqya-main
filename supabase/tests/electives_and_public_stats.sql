begin;
do $$ declare s jsonb; begin
 if (select count(*) from public.fcds_courses where course_kind='faculty')<>14 then raise exception 'Faculty seed missing';end if;
 if (select count(*) from public.fcds_courses where course_kind='program')<>8 then raise exception 'Program seed missing';end if;
 if exists(select 1 from public.fcds_courses where course_kind<>'core' and (year<>'' or semester is not null)) then raise exception 'Electives must be independent of year/semester';end if;
 s:=public.get_darb_public_stats();
 if (s->>'visits')::bigint<>(select count(*) from public.site_visits) then raise exception 'Incorrect historical visits';end if;
 if (select count(*) from jsonb_object_keys(s))<>4 then raise exception 'Aggregate must not expose private identifiers';end if;
end $$;
-- Reclassification keeps the same course and all links. The transaction rolls back.
do $$ declare target uuid; links bigint; begin
 select id into target from public.fcds_courses where slug='data-structures';
 select count(*) into links from public.fcds_resource_courses where course_slug='data-structures';
 update public.fcds_courses set course_kind='faculty' where id=target;
 if not exists(select 1 from public.fcds_courses where id=target and slug='data-structures' and year='' and semester is null) then raise exception 'Classification lost course identity';end if;
 if links<>(select count(*) from public.fcds_resource_courses where course_slug='data-structures') then raise exception 'Classification lost resource links';end if;
end $$;
do $$ declare admin_id uuid; target uuid; begin
 select user_id into admin_id from public.user_roles where role='admin' limit 1;
 select id into target from public.fcds_playlists where music_reviewed_at is null limit 1;
 if admin_id is null or target is null then raise exception 'Review fixtures unavailable';end if;
 perform set_config('request.jwt.claim.sub',admin_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',admin_id,'role','authenticated','is_anonymous',false)::text,true);
 perform set_config('test.review_target',target::text,true);
end $$;
set local role authenticated;
do $$ declare changed integer; begin
 update public.fcds_playlists set music_status='no_music',music_reviewed_at=now(),music_skip_ranges=null where id=current_setting('test.review_target')::uuid;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Admin could not save explicit review';end if;
end $$;
reset role;
do $$ declare student_id uuid; begin
 select u.id into student_id from auth.users u where not exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') limit 1;
 if student_id is null then raise exception 'Student fixture unavailable';end if;
 perform set_config('request.jwt.claim.sub',student_id::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',student_id,'role','authenticated','is_anonymous',false)::text,true);
end $$;
set local role authenticated;
do $$ declare changed integer; begin
 update public.fcds_playlists set music_status='no_music',music_reviewed_at=now() where id=current_setting('test.review_target')::uuid;
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Non-admin could save review';end if;
 update public.fcds_courses set course_kind='program' where slug='data-structures';
 get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Non-admin could reclassify course';end if;
end $$;
reset role;
set local role anon;
do $$ begin
 if public.get_darb_public_stats() is null then raise exception 'Public stats unavailable';end if;
 if has_table_privilege('anon','public.site_visits','select') then raise exception 'Raw visits exposed';end if;
end $$;
rollback;
select 'electives, public aggregates, explicit admin review and account isolation passed; fixtures rolled back' as verification;
