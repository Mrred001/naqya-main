-- Exercise actual authenticated/anonymous roles and roll back every fixture.
begin;
select set_config('test.chat.a',(select u.id::text from auth.users u where not exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') order by u.id limit 1),true);
select set_config('test.chat.b',(select u.id::text from auth.users u where u.id::text<>current_setting('test.chat.a') and not exists(select 1 from public.user_roles r where r.user_id=u.id and r.role='admin') order by u.id limit 1),true);
select set_config('test.chat.admin',(select user_id::text from public.user_roles where role='admin' limit 1),true);
select set_config('test.chat.nonce',gen_random_uuid()::text,true);
select set_config('request.jwt.claim.sub',current_setting('test.chat.a'),true);
set local role authenticated;
do $$
declare cid uuid;again uuid;n uuid:=current_setting('test.chat.nonce')::uuid;
begin
 cid:=public.send_support_message('QA chat fixture first',p_client_nonce=>n);
 perform set_config('test.chat.cid',cid::text,true);
 again:=public.send_support_message('QA chat fixture first',p_client_nonce=>n);
 assert again=cid,'One conversation per account';
 assert (select count(*)=1 from public.support_messages where conversation_id=cid and client_nonce=n),'Retry must not duplicate messages';
 assert (select sender_id=auth.uid() and sender_role='user' from public.support_messages where client_nonce=n),'Server assigns sender and role';
 begin
  perform public.send_support_message('different body',cid,n);raise exception 'Nonce reuse with different content accepted';
 exception when sqlstate '22023' then null;end;
 begin
  insert into public.support_messages(conversation_id,sender_role,body,client_nonce) values(cid,'admin','Forged',gen_random_uuid());raise exception 'Direct forged insert accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.send_support_message('   ',cid,gen_random_uuid());raise exception 'Empty message accepted';
 exception when sqlstate '22023' then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.chat.b'),true);
select set_config('request.jwt.claims','{"user_metadata":{"role":"admin"}}',true);
set local role authenticated;
do $$
declare cid uuid:=current_setting('test.chat.cid')::uuid;
begin
 assert not exists(select 1 from public.support_conversations where id=cid),'Different account cannot read conversation';
 assert not exists(select 1 from public.support_messages where conversation_id=cid),'Different account cannot read messages';
 begin
  perform public.send_support_message('Unauthorized cross-account reply',cid,gen_random_uuid());raise exception 'Different account wrote to conversation';
 exception when insufficient_privilege then null;end;
 begin
  perform public.mark_support_read(cid,now());raise exception 'Different account marked messages read';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.chat.admin'),true);
set local role authenticated;
do $$
declare cid uuid:=current_setting('test.chat.cid')::uuid;stamp timestamptz;
begin
 assert exists(select 1 from public.support_conversations where id=cid),'Admin can read inbox';
 assert exists(select 1 from public.support_messages where conversation_id=cid),'Admin can read user messages';
 select max(created_at) into stamp from public.support_messages where conversation_id=cid;
 perform public.mark_support_read(cid,stamp);
 assert (select admin_read_at>=latest_user_message_at from public.support_conversations where id=cid),'Admin read receipt clears unread';
 perform public.send_support_message('QA chat fixture admin reply',cid,gen_random_uuid());
 assert exists(select 1 from public.support_messages where conversation_id=cid and body='QA chat fixture admin reply' and sender_role='admin' and sender_id=auth.uid()),'Admin sends actual reply';
end $$;
reset role;
select set_config('request.jwt.claim.sub',current_setting('test.chat.a'),true);
set local role authenticated;
do $$
declare cid uuid:=current_setting('test.chat.cid')::uuid;old_stamp timestamptz;reply_stamp timestamptz;
begin
 assert exists(select 1 from public.support_messages where conversation_id=cid and sender_role='admin'),'Owner receives reply';
 assert (select user_read_at<latest_admin_message_at from public.support_conversations where id=cid),'New reply is unread';
 select created_at into old_stamp from public.support_messages where conversation_id=cid and client_nonce=current_setting('test.chat.nonce')::uuid;
 perform public.mark_support_read(cid,old_stamp);
 assert (select user_read_at<latest_admin_message_at from public.support_conversations where id=cid),'Read receipt must not mark later unseen replies';
 select max(created_at) into reply_stamp from public.support_messages where conversation_id=cid;
 perform public.mark_support_read(cid,reply_stamp);
 assert (select user_read_at>=latest_admin_message_at from public.support_conversations where id=cid),'Owner marks visible reply read';
 perform public.send_support_message('QA chat fixture follow-up',cid,gen_random_uuid());
 assert (select admin_read_at<latest_user_message_at from public.support_conversations where id=cid),'User follow-up is unread for admin';
end $$;
reset role;
select set_config('request.jwt.claims','{"is_anonymous":true}',true);
set local role authenticated;
do $$begin
 assert not exists(select 1 from public.support_conversations),'Anonymous-auth account cannot read chats';
 begin
  perform public.send_support_message('Anonymous-auth message',p_client_nonce=>gen_random_uuid());raise exception 'Anonymous-auth send accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{}',true);
set local role anon;
do $$begin
 begin
  perform 1 from public.support_messages;raise exception 'Anonymous read accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.send_support_message('Anonymous message',p_client_nonce=>gen_random_uuid());raise exception 'Anonymous send accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.submit_community_request('message','{"details":"Old one-way endpoint attempt"}',p_visitor=>gen_random_uuid());raise exception 'Legacy message submission accepted';
 exception when insufficient_privilege then null;end;
end $$;
reset role;
rollback;
select 'Chat ownership, two-way replies, unread state, retry deduplication, login enforcement and legacy endpoint checks passed; all fixtures rolled back' result;
