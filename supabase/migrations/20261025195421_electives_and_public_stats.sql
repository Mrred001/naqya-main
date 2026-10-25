-- Electives are independent of year/semester. Existing course IDs and links survive reclassification.
alter table public.fcds_courses add column course_kind text not null default 'core'
  check(course_kind in ('core','faculty','program'));
alter table public.fcds_courses add column specializations text[] not null default '{}'
  check(specializations <@ array['computer-data-science','ai','cyber-security','healthcare']::text[]);
create function public.normalize_elective_course() returns trigger language plpgsql set search_path='' as $$
begin
 if new.course_kind <> 'core' then new.year := ''; new.semester := null; end if;
 if new.course_kind = 'faculty' then new.specializations := '{}'; end if;
 return new;
end $$;
revoke all on function public.normalize_elective_course() from public,anon,authenticated;
create trigger normalize_elective_course before insert or update on public.fcds_courses for each row execute function public.normalize_elective_course();
alter table public.fcds_courses add constraint elective_without_semester check(course_kind='core' or (year='' and semester is null));

-- Source: Chameleon faculty electives / Computing & Data Sciences program electives, reviewed 2026-10-25.
-- EL-Fxx / EL-Pxx are internal library identifiers, not official course codes.
do $seed$
declare item record; existing_id uuid;
begin
 for item in select * from jsonb_to_recordset($courses$[{"slug": "software-engineering", "name": "Software Engineering", "kind": "faculty", "code": "EL-F01"}, {"slug": "systems-analysis-design", "name": "Systems Analysis and Design", "kind": "faculty", "code": "EL-F02"}, {"slug": "algorithm-design", "name": "Algorithm Design", "kind": "faculty", "code": "EL-F03"}, {"slug": "distributed-processing", "name": "Distributed Processing", "kind": "faculty", "code": "EL-F04"}, {"slug": "mobile-programming", "name": "Mobile Programming", "kind": "faculty", "code": "EL-F05"}, {"slug": "web-programming", "name": "Web Programming", "kind": "faculty", "code": "EL-F06"}, {"slug": "operating-systems", "name": "Operating Systems", "kind": "faculty", "code": "EL-F07"}, {"slug": "computer-networks", "name": "Computer Networks", "kind": "faculty", "code": "EL-F08"}, {"slug": "first-aids", "name": "First Aid", "kind": "faculty", "code": "EL-F09"}, {"slug": "modern-tourism", "name": "Modern Tourism", "kind": "faculty", "code": "EL-F10"}, {"slug": "fitness-and-health", "name": "Fitness and Health", "kind": "faculty", "code": "EL-F11"}, {"slug": "economic-science", "name": "Economy Science", "kind": "faculty", "code": "EL-F12"}, {"slug": "pet-handling", "name": "Pet Handling", "kind": "faculty", "code": "EL-F13"}, {"slug": "nutrition", "name": "Nutrition", "kind": "faculty", "code": "EL-F14"}, {"slug": "convex-optimization", "name": "Convex Optimization", "kind": "program", "code": "EL-P01"}, {"slug": "combinatorial-optimization", "name": "Non-Linear and Combinatorial Optimization", "kind": "program", "code": "EL-P02"}, {"slug": "multivariate-statistical-analysis", "name": "Multivariate Statistical Analysis", "kind": "program", "code": "EL-P03"}, {"slug": "bayesian-statistics", "name": "Bayesian Statistics", "kind": "program", "code": "EL-P04"}, {"slug": "data-compression-techniques", "name": "Data Compression Techniques", "kind": "program", "code": "EL-P05"}, {"slug": "concurrent-algorithms", "name": "Concurrent Algorithms and Data Structures", "kind": "program", "code": "EL-P06"}, {"slug": "distributed-database-systems", "name": "Distributed Database Systems", "kind": "program", "code": "EL-P07"}, {"slug": "advanced-database-systems", "name": "Advanced Database Systems", "kind": "program", "code": "EL-P08"}]$courses$::jsonb) as x(slug text,name text,kind text,code text) loop
  select id into existing_id from public.fcds_courses where slug=item.slug or lower(btrim(name))=lower(item.name) order by created_at limit 1;
  if existing_id is null then
   insert into public.fcds_courses(name,slug,code,year,semester,specialization,course_kind,specializations)
   values(item.name,item.slug,item.code,'',null,'computer-data-science',item.kind,case when item.kind='program' then array['computer-data-science'] else '{}'::text[] end);
  else
   update public.fcds_courses set course_kind=item.kind,specializations=case when item.kind='program' then array['computer-data-science'] else '{}'::text[] end where id=existing_id;
  end if;
 end loop;
end $seed$;

-- Curator explicitly reviewed the playlist intro (approximately 5-10 seconds).
insert into public.fcds_playlists(course_slug,youtube_url,title,channel,language,thumbnail_url,music_status,music_reviewed_at)
select c.slug,'https://www.youtube.com/playlist?list=PLTr1xN4uMK5seRz6IO7Am9Zp2UKdnzO_n','Operating Systems in Arabic - شرح نظم التشغيل','SoftwareTube','Arabic','https://i.ytimg.com/vi/BW90V5-J4a0/hqdefault.jpg','minimal_music',now()
from public.fcds_courses c where c.course_kind='faculty' and lower(c.name)='operating systems'
and not exists(select 1 from public.fcds_playlists p where public.youtube_resource_key(p.youtube_url)='playlist:PLTr1xN4uMK5seRz6IO7Am9Zp2UKdnzO_n');
update public.fcds_playlists set music_status='minimal_music',music_reviewed_at=now(),music_skip_ranges=null
where public.youtube_resource_key(youtube_url)='playlist:PLTr1xN4uMK5seRz6IO7Am9Zp2UKdnzO_n';
insert into public.fcds_resource_courses(resource_id,course_slug,role,note)
select p.id,c.slug,'primary','حسب مراجعة أحمد: موسيقى في الانترو أول حوالي 5–10 ثواني؛ بنوصيك تتخطى أول 10 ثواني. التوقيت تقريبي وقد يختلف بين فيديوهات القائمة، فاتأكد من انتهاء الموسيقى قبل المتابعة. طابق الموضوعات مع منهجك الحالي؛ القائمة ليست ضماناً لتغطية المادة كاملة.'
from public.fcds_playlists p cross join public.fcds_courses c
where public.youtube_resource_key(p.youtube_url)='playlist:PLTr1xN4uMK5seRz6IO7Am9Zp2UKdnzO_n' and c.course_kind='faculty' and lower(c.name)='operating systems'
on conflict(resource_id,course_slug) do update set note=excluded.note;

-- Only aggregate counts are public; visitor identifiers and raw analytics stay private.
create function public.get_darb_public_stats() returns jsonb language sql stable security definer set search_path='' as $$
 with sources as (
  select distinct public.youtube_resource_key(p.youtube_url) as source_key
  from public.fcds_playlists p where p.calculator_guide or exists(select 1 from public.fcds_resource_courses l where l.resource_id=p.id)
 )
 select jsonb_build_object(
  'playlists',(select count(*) from sources where source_key like 'playlist:%'),
  'videos',(select count(*) from sources where source_key like 'video:%'),
  'visits',(select count(*) from public.site_visits),
  'tracked_since',(select min(created_at) from public.site_visits)
 );
$$;
revoke all on function public.get_darb_public_stats() from public;
grant execute on function public.get_darb_public_stats() to anon,authenticated;
