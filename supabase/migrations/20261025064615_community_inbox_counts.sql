do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.get_site_analytics(integer,text)'::regprocedure);
 definition:=replace(definition,
  'union all select id,''fcds'' from public.fcds_playlist_suggestions where status=''pending'')s',
  'union all select id,''fcds'' from public.fcds_playlist_suggestions where status=''pending'' union all select id,''fcds'' from public.community_requests where status=''pending'' and kind<>''message'')s');
 execute definition;
end $$;
