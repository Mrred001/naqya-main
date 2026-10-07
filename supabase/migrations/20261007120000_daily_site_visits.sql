begin;

create table public.site_visits (
  id uuid primary key default gen_random_uuid(),
  visitor_key uuid not null,
  visit_date date not null default ((now() at time zone 'Africa/Khartoum')::date),
  created_at timestamptz not null default now(),
  constraint site_visits_one_per_visitor_per_day unique (visitor_key, visit_date)
);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;
grant insert (visitor_key) on public.site_visits to anon, authenticated;
grant select on public.site_visits to authenticated;

create policy "Visitors record daily visits"
  on public.site_visits for insert to anon, authenticated
  with check (visitor_key is not null);

create policy "Admins read daily visits"
  on public.site_visits for select to authenticated
  using (
    exists (
      select 1 from public.user_roles
      where user_roles.user_id = auth.uid()
        and user_roles.role = 'admin'
    )
  );

create function public.get_daily_site_visits(days integer default 7)
returns table (visit_date date, total bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'Africa/Khartoum')::date;
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
    on site_visits.visit_date = calendar.day::date
  group by calendar.day
  order by calendar.day;
end;
$$;

revoke all on function public.get_daily_site_visits(integer) from public, anon;
grant execute on function public.get_daily_site_visits(integer) to authenticated;

commit;
