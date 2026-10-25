create table public.support_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null unique references auth.users(id) on delete cascade,
 display_name text not null,
 created_at timestamptz not null default now(),
 last_message_at timestamptz not null default now(),
 latest_user_message_at timestamptz,
 latest_admin_message_at timestamptz,
 user_read_at timestamptz,
 admin_read_at timestamptz
);
create table public.support_messages (
 id uuid primary key default gen_random_uuid(),
 conversation_id uuid not null references public.support_conversations(id) on delete cascade,
 sender_id uuid references auth.users(id) on delete set null,
 sender_role text not null check(sender_role in ('user','admin')),
 body text not null check(char_length(btrim(body)) between 1 and 3000),
 client_nonce uuid not null,
 created_at timestamptz not null default now(),
 unique(conversation_id,client_nonce)
);
create index support_conversations_latest on public.support_conversations(last_message_at desc);
create index support_messages_history on public.support_messages(conversation_id,created_at desc,id desc);
create index support_messages_sender_time on public.support_messages(sender_id,created_at);
alter table public.support_conversations enable row level security;
alter table public.support_messages enable row level security;
revoke all on public.support_conversations,public.support_messages from public,anon,authenticated;
grant select on public.support_conversations,public.support_messages to authenticated;
create policy "Participants read their own conversation" on public.support_conversations for select to authenticated
using((user_id=(select auth.uid()) or exists(select 1 from public.user_roles where user_id=(select auth.uid()) and role='admin')) and coalesce((select auth.jwt()->>'is_anonymous'),'false')<>'true');
create policy "Participants read their own messages" on public.support_messages for select to authenticated
using(exists(select 1 from public.support_conversations c where c.id=conversation_id));

-- The authenticated write endpoint assigns the sender and role, checks ownership,
-- serializes each conversation, and makes network retries idempotent.
create function public.send_support_message(p_body text,p_conversation uuid default null,p_client_nonce uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); is_admin boolean; cid uuid; existing public.support_messages; content text:=btrim(p_body); display text;
begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Sign in to chat' using errcode='42501';end if;
 if content is null or char_length(content) not between 1 and 3000 or p_client_nonce is null then raise exception 'Message must have 1 to 3000 characters' using errcode='22023';end if;
 is_admin:=exists(select 1 from public.user_roles where user_id=uid and role='admin');
 if p_conversation is null then
  if is_admin then raise exception 'Choose a conversation in the admin inbox' using errcode='22023';end if;
  select username into display from public.profiles where id=uid;
  insert into public.support_conversations(user_id,display_name) values(uid,coalesce(nullif(display,''),'Student '||left(uid::text,8))) on conflict(user_id) do nothing;
  select id into cid from public.support_conversations where user_id=uid for update;
 else
  select id into cid from public.support_conversations where id=p_conversation and (user_id=uid or is_admin) for update;
  if cid is null then raise exception 'Conversation unavailable' using errcode='42501';end if;
 end if;
 select * into existing from public.support_messages where conversation_id=cid and client_nonce=p_client_nonce;
 if existing.id is not null then
  if existing.sender_id is distinct from uid or existing.body<>content then raise exception 'Invalid message retry' using errcode='22023';end if;
  return cid;
 end if;
 if (select count(*) from public.support_messages where sender_id=uid and created_at>now()-interval '1 minute')>=20 then raise exception 'Too many messages. Try again shortly' using errcode='P0001';end if;
 insert into public.support_messages(conversation_id,sender_id,sender_role,body,client_nonce) values(cid,uid,case when is_admin then 'admin' else 'user' end,content,p_client_nonce);
 update public.support_conversations set last_message_at=clock_timestamp(),
  latest_user_message_at=case when not is_admin then clock_timestamp() else latest_user_message_at end,
  latest_admin_message_at=case when is_admin then clock_timestamp() else latest_admin_message_at end,
  user_read_at=case when not is_admin then clock_timestamp() else user_read_at end,
  admin_read_at=case when is_admin then clock_timestamp() else admin_read_at end where id=cid;
 return cid;
end $$;
revoke all on function public.send_support_message(text,uuid,uuid) from public,anon;
grant execute on function public.send_support_message(text,uuid,uuid) to authenticated;

-- Mark only the messages the browser actually loaded, never unseen later replies.
create function public.mark_support_read(p_conversation uuid,p_through timestamptz)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); is_admin boolean; last_visible timestamptz;
begin
 if uid is null or coalesce(auth.jwt()->>'is_anonymous','false')='true' then raise exception 'Sign in to chat' using errcode='42501';end if;
 is_admin:=exists(select 1 from public.user_roles where user_id=uid and role='admin');
 perform 1 from public.support_conversations where id=p_conversation and (user_id=uid or is_admin) for update;
 if not found then raise exception 'Conversation unavailable' using errcode='42501';end if;
 select max(created_at) into last_visible from public.support_messages where conversation_id=p_conversation and created_at<=p_through;
 if last_visible is null then return;end if;
 update public.support_conversations set
  admin_read_at=case when is_admin then greatest(admin_read_at,last_visible) else admin_read_at end,
  user_read_at=case when not is_admin then greatest(user_read_at,last_visible) else user_read_at end where id=p_conversation;
end $$;
revoke all on function public.mark_support_read(uuid,timestamptz) from public,anon;
grant execute on function public.mark_support_read(uuid,timestamptz) to authenticated;

-- Keep historical messages in the curator archive, but stop the old one-way API.
do $$
declare definition text;
begin
 definition:=pg_get_functiondef('public.submit_community_request(text,jsonb,text[],uuid)'::regprocedure);
 definition:=replace(definition,E'begin\n',E'begin\n if p_kind=''message'' then raise exception ''Please sign in and use the chat'' using errcode=''42501'';end if;\n');
 execute definition;
end $$;
