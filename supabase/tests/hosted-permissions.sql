-- Run only against a dedicated Amredi project. All fixture writes are rolled back.
begin;
select set_config('request.jwt.claim.sub','',true);
create temp table amredi_test_ids as select gen_random_uuid() as a,gen_random_uuid() as b,gen_random_uuid() as mentor,gen_random_uuid() as staff,gen_random_uuid() as programme;
grant select on amredi_test_ids to authenticated,anon;
insert into auth.users(id) select a from amredi_test_ids union all select b from amredi_test_ids union all select mentor from amredi_test_ids union all select staff from amredi_test_ids;
insert into public.profiles(id,display_name,goal) select a,'Hosted test member A','Find a mentor' from amredi_test_ids union all select b,'Hosted test member B','Learn a practical skill' from amredi_test_ids;
insert into public.staff_members(user_id) select staff from amredi_test_ids;
insert into public.mentors(id,display_name,bio,verified) select mentor,'Hosted test mentor','Temporary test fixture',true from amredi_test_ids;
insert into public.programmes(id,title,category,location,description,schedule,published) select programme,'Hosted test programme','Skills','Online','Temporary programme fixture','Weekdays',true from amredi_test_ids;
set local role authenticated;
select set_config('request.jwt.claim.sub',(select a::text from amredi_test_ids),true);
do $$ begin
 if (select count(*) from public.profiles)<>1 then raise exception 'Profile isolation failed'; end if;
 begin
 insert into public.applications(member_id,programme_id) select b,programme from amredi_test_ids;
 raise exception 'Cross-member application unexpectedly allowed';
 exception when insufficient_privilege then null; end;
 insert into public.applications(member_id,programme_id) select a,programme from amredi_test_ids;
 begin
 insert into public.applications(member_id,programme_id) select a,programme from amredi_test_ids;
 raise exception 'Duplicate application unexpectedly allowed';
 exception when unique_violation then null; end;
 insert into public.mentor_requests(member_id) select a from amredi_test_ids;
 begin
 perform public.match_mentor((select id from public.mentor_requests),(select mentor from amredi_test_ids));
 raise exception 'Member could grant own mentor assignment';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select staff::text from amredi_test_ids),true);
do $$ declare r uuid; m uuid; repeated uuid; begin
 select id into r from public.mentor_requests where member_id=(select a from amredi_test_ids);
 m:=public.match_mentor(r,(select mentor from amredi_test_ids));
 repeated:=public.match_mentor(r,(select mentor from amredi_test_ids));
 if m is distinct from repeated then raise exception 'Matching retry is not idempotent'; end if;
 if (select count(*) from public.messages)<>0 or (select count(*) from public.conversations)<>0 then raise exception 'Staff private chat access is too broad'; end if;
 begin
 insert into public.audit_events(source,resource,resource_id,action) values('staff','forged',gen_random_uuid(),'INSERT');
 raise exception 'Client could forge audit entry';
 exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from amredi_test_ids),true);
insert into public.messages(conversation_id,sender_id,client_nonce,body) select c.id,t.a,gen_random_uuid(),'Temporary hosted test message' from public.conversations c cross join amredi_test_ids t;
select set_config('request.jwt.claim.sub',(select mentor::text from amredi_test_ids),true);
insert into public.message_reports(reporter_id,message_id,reason) select t.mentor,m.id,'Temporary test report' from public.messages m cross join amredi_test_ids t;
select set_config('request.jwt.claim.sub',(select b::text from amredi_test_ids),true);
do $$ begin
 if exists(select 1 from public.messages) or exists(select 1 from public.message_reports) or exists(select 1 from public.audit_events) then raise exception 'Outsider data exposure'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select staff::text from amredi_test_ids),true);
do $$ declare r uuid; begin
 if exists(select 1 from public.messages) then raise exception 'Report review exposed private chat'; end if;
 select id into r from public.message_reports where message_excerpt='Temporary hosted test message';
 if r is null then raise exception 'Report excerpt capture failed'; end if;
 update public.message_reports set review_state='reviewed' where id=r;
 update public.message_reports set review_state='resolved',outcome='Temporary review completed' where id=r;
 perform public.close_mentorship((select id from public.mentorships where member_id=(select a from amredi_test_ids)));
 if not exists(select 1 from public.audit_events where actor_id=(select staff from amredi_test_ids)) then raise exception 'Staff action audit missing'; end if;
end $$;
select set_config('request.jwt.claim.sub',(select a::text from amredi_test_ids),true);
do $$ begin
 begin
 insert into public.messages(conversation_id,sender_id,client_nonce,body) select c.id,t.a,gen_random_uuid(),'Must not send to closed assignment' from public.conversations c cross join amredi_test_ids t;
 raise exception 'Closed assignment accepted message';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: hosted RLS isolation, application deduplication, atomic matching, private chat, report capture/review, audit integrity and closure; fixtures rolled back.' as verification;
