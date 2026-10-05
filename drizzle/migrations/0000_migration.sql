create type public.app_role as enum ('admin');
create type public.content_kind as enum ('video','playlist');
create type public.music_status as enum ('no_music','minimal_music','has_music');

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create table public.content (
  id uuid primary key default gen_random_uuid(),
  youtube_url text not null,
  youtube_id text not null,
  title text not null,
  channel text not null,
  thumbnail_url text,
  duration_seconds int not null default 0,
  content_type public.content_kind not null default 'video',
  category_id uuid references public.categories(id) on delete set null,
  language text not null default 'English',
  music_status public.music_status not null default 'no_music',
  recommendation text,
  featured boolean not null default false,
  date_added timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);
create table public.content_tags (
  content_id uuid not null references public.content(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (content_id, tag_id)
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  unique (user_id, role)
);

grant select on public.categories, public.content, public.tags, public.content_tags to anon, authenticated;
grant insert, update, delete on public.categories, public.content, public.tags, public.content_tags to authenticated;
grant select on public.user_roles to authenticated;
grant all on public.categories, public.content, public.tags, public.content_tags, public.user_roles to service_role;

alter table public.categories enable row level security;
alter table public.content enable row level security;
alter table public.tags enable row level security;
alter table public.content_tags enable row level security;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

do $$ declare t text; begin
  foreach t in array array['categories','content','tags','content_tags'] loop
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin insert" on public.%I for insert to authenticated with check (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "admin update" on public.%I for update to authenticated using (public.has_role(auth.uid(), ''admin''))', t);
    execute format('create policy "admin delete" on public.%I for delete to authenticated using (public.has_role(auth.uid(), ''admin''))', t);
  end loop;
end $$;

-- First account to sign up becomes the curator (admin)
create or replace function public.handle_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created_admin after insert on auth.users
  for each row execute function public.handle_first_admin();

insert into public.categories (name, slug, sort_order) values
 ('Self Development','self-development',1),('Data Science','data-science',2),('Technology','technology',3),
 ('Islam','islam',4),('Podcasts','podcasts',5),('Business','business',6),('Study','study',7),('Productivity','productivity',8);

insert into public.content (youtube_url, youtube_id, title, channel, thumbnail_url, duration_seconds, content_type, category_id, language, music_status, recommendation, featured, date_added) values
('https://www.youtube.com/watch?v=aircAruvnKk','aircAruvnKk','But what is a neural network?','3Blue1Brown','https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg',1140,'video',(select id from categories where slug='data-science'),'English','minimal_music','The clearest visual intuition for neural networks ever made. Watch it before any course.',true, now() - interval '20 days'),
('https://www.youtube.com/watch?v=kCc8FmEb1nY','kCc8FmEb1nY','Let''s build GPT: from scratch, in code, spelled out','Andrej Karpathy','https://i.ytimg.com/vi/kCc8FmEb1nY/hqdefault.jpg',6960,'video',(select id from categories where slug='data-science'),'English','no_music','Two hours that demystify transformers completely. No hype, just code and patience.',true, now() - interval '3 days'),
('https://www.youtube.com/watch?v=zjkBMFhNj_g','zjkBMFhNj_g','Intro to Large Language Models','Andrej Karpathy','https://i.ytimg.com/vi/zjkBMFhNj_g/hqdefault.jpg',3600,'video',(select id from categories where slug='technology'),'English','no_music','The best one-hour mental model of what LLMs are and where they are going.',false, now() - interval '1 day'),
('https://www.youtube.com/watch?v=UF8uR6Z6KLc','UF8uR6Z6KLc','Steve Jobs'' 2005 Stanford Commencement Address','Stanford','https://i.ytimg.com/vi/UF8uR6Z6KLc/hqdefault.jpg',903,'video',(select id from categories where slug='self-development'),'English','no_music','Fifteen minutes on mortality, curiosity and connecting the dots. I rewatch it every year.',true, now() - interval '12 days'),
('https://www.youtube.com/watch?v=u4ZoJKF_VuA','u4ZoJKF_VuA','How great leaders inspire action','TED','https://i.ytimg.com/vi/u4ZoJKF_VuA/hqdefault.jpg',1084,'video',(select id from categories where slug='business'),'English','no_music','A simple idea — start with why — that changes how you think about any product or team.',false, now() - interval '7 days'),
('https://www.youtube.com/watch?v=3E7hkPZ-HTk','3E7hkPZ-HTk','Quit social media','TEDx Talks · Cal Newport','https://i.ytimg.com/vi/3E7hkPZ-HTk/hqdefault.jpg',834,'video',(select id from categories where slug='productivity'),'English','no_music','A calm, convincing argument for protecting your attention.',false, now() - interval '5 days'),
('https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab','PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab','Essence of linear algebra','3Blue1Brown','https://i.ytimg.com/vi/fNk_zzaMoSs/hqdefault.jpg',11000,'playlist',(select id from categories where slug='study'),'English','minimal_music','The series that makes linear algebra feel obvious. Perfect for weekend study.',true, now() - interval '9 days'),
('https://www.youtube.com/playlist?list=PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi','PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi','Neural networks','3Blue1Brown','https://i.ytimg.com/vi/aircAruvnKk/hqdefault.jpg',9000,'playlist',(select id from categories where slug='data-science'),'English','minimal_music','The full deep learning series — from intuition to backpropagation to transformers.',false, now() - interval '2 days');

insert into public.tags (name) values ('ai'),('math'),('deep learning'),('leadership'),('focus'),('life');
insert into public.content_tags (content_id, tag_id)
select c.id, t.id from public.content c join public.tags t on
 (c.youtube_id in ('aircAruvnKk','PLZHQObOWTQDNU6R1_67000Dx_ZCJB-3pi') and t.name in ('ai','math','deep learning')) or
 (c.youtube_id in ('kCc8FmEb1nY','zjkBMFhNj_g') and t.name in ('ai','deep learning')) or
 (c.youtube_id = 'PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab' and t.name = 'math') or
 (c.youtube_id = 'u4ZoJKF_VuA' and t.name = 'leadership') or
 (c.youtube_id = '3E7hkPZ-HTk' and t.name = 'focus') or
 (c.youtube_id = 'UF8uR6Z6KLc' and t.name = 'life');