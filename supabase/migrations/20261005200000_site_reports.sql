begin;
create table public.site_reports (
  id uuid primary key default gen_random_uuid(),
  library text not null check (library in ('general', 'fcds')),
  details text not null check (char_length(btrim(details)) between 10 and 2000),
  page_path text not null check (char_length(page_path) between 1 and 500 and left(page_path, 1) = '/'),
  status text not null default 'new' check (status in ('new', 'resolved')),
  created_at timestamptz not null default now()
);
alter table public.site_reports enable row level security;
revoke all on public.site_reports from anon, authenticated;
grant insert (library, details, page_path) on public.site_reports to anon, authenticated;
grant select on public.site_reports to authenticated;
grant update (status) on public.site_reports to authenticated;
create policy "Visitors submit new reports" on public.site_reports for insert to anon, authenticated with check (status = 'new');
create policy "Admins read reports" on public.site_reports for select to authenticated using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);
create policy "Admins update reports" on public.site_reports for update to authenticated using (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
) with check (
  exists (select 1 from public.user_roles where user_id = auth.uid() and role = 'admin')
);
commit;
