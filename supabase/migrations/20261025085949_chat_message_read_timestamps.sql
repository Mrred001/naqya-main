create or replace function public.send_support_message(p_body text,p_conversation uuid default null,p_client_nonce uuid default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); is_admin boolean; cid uuid; existing public.support_messages; content text:=btrim(p_body); display text; sent_at timestamptz;
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
 insert into public.support_messages(conversation_id,sender_id,sender_role,body,client_nonce,created_at) values(cid,uid,case when is_admin then 'admin' else 'user' end,content,p_client_nonce,clock_timestamp()) returning created_at into sent_at;
 update public.support_conversations set last_message_at=sent_at,
  latest_user_message_at=case when not is_admin then sent_at else latest_user_message_at end,
  latest_admin_message_at=case when is_admin then sent_at else latest_admin_message_at end,
  user_read_at=case when not is_admin then sent_at else user_read_at end,
  admin_read_at=case when is_admin then sent_at else admin_read_at end where id=cid;
 return cid;
end $$;
