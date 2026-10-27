begin;
alter table public.mentorships add column request_id uuid unique references public.mentor_requests(id);
create policy staff_requests_read on public.mentor_requests for select to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
grant update(status) on public.mentor_requests to authenticated;
create policy staff_requests_update on public.mentor_requests for update to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)) with check (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
create policy staff_assignments_read on public.mentorships for select to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
grant insert(member_id,mentor_id,request_id),update(status) on public.mentorships to authenticated;
create policy staff_assignments_create on public.mentorships for insert to authenticated with check (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
 and exists(select 1 from public.mentors v where v.id=mentor_id and v.verified)
 and exists(select 1 from public.mentor_requests r where r.id=request_id and r.member_id=mentorships.member_id and r.status='pending')
);
create policy staff_assignments_close on public.mentorships for update to authenticated using (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
) with check (status='closed' and exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
grant insert(mentorship_id) on public.conversations to authenticated;
create policy staff_conversation_create on public.conversations for insert to authenticated with check (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
 and exists(select 1 from public.mentorships m where m.id=mentorship_id and m.status='active')
);
-- Functions remain invoker: all underlying RLS rules still apply.
create function public.match_mentor(p_request uuid,p_mentor uuid) returns uuid language plpgsql security invoker set search_path='' as $$
declare r public.mentor_requests; result uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.staff_members where user_id=auth.uid() and active) then raise exception 'Staff approval required.' using errcode='42501'; end if;
 select * into r from public.mentor_requests where id=p_request for update;
 if not found then raise exception 'Request unavailable.'; end if;
 if r.status='matched' then
 select id into result from public.mentorships where request_id=p_request and mentor_id=p_mentor and status='active';
 if result is not null then return result; end if;
 raise exception 'This request is already matched.';
 end if;
 if r.status<>'pending' then raise exception 'Only pending requests can be matched.'; end if;
 insert into public.mentorships(member_id,mentor_id,request_id) values(r.member_id,p_mentor,p_request) returning id into result;
 insert into public.conversations(mentorship_id) values(result);
 update public.mentor_requests set status='matched' where id=p_request;
 if not found then raise exception 'Staff approval or request changed.'; end if;
 return result;
end $$;
create function public.close_mentorship(p_mentorship uuid) returns void language plpgsql security invoker set search_path='' as $$
declare m public.mentorships;
begin
 if auth.uid() is null or not exists(select 1 from public.staff_members where user_id=auth.uid() and active) then raise exception 'Staff approval required.' using errcode='42501'; end if;
 select * into m from public.mentorships where id=p_mentorship for update;
 if not found then raise exception 'Mentorship unavailable.'; end if;
 if m.status='closed' then return; end if;
 update public.mentorships set status='closed' where id=m.id;
 if not found then raise exception 'Staff approval or mentorship changed.'; end if;
 update public.mentor_requests set status='closed' where id=m.request_id;
end $$;
revoke execute on function public.match_mentor(uuid,uuid),public.close_mentorship(uuid) from public,anon;
grant execute on function public.match_mentor(uuid,uuid),public.close_mentorship(uuid) to authenticated;
alter table public.message_reports
 add column review_state text not null default 'open' check(review_state in ('open','reviewed','resolved','dismissed')),
 add column outcome text not null default '' check(char_length(outcome)<=1000);
create index reports_review_queue on public.message_reports(review_state,created_at,id);
create policy staff_reports_read on public.message_reports for select to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
grant update(review_state,outcome) on public.message_reports to authenticated;
create policy staff_reports_review on public.message_reports for update to authenticated using (reporter_id<>(select auth.uid()) and exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)) with check (reporter_id<>(select auth.uid()) and exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
-- Capture only the reported message; staff never gain access to whole chats.
alter table public.message_reports add column message_excerpt text not null default '' check(char_length(message_excerpt)<=4000);
update public.message_reports r set message_excerpt=m.body from public.messages m where m.id=r.message_id;
create function public.capture_report_excerpt() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select body into new.message_excerpt from public.messages where id=new.message_id;
 if new.message_excerpt is null then raise exception 'Message unavailable.' using errcode='42501'; end if;
 return new;
end $$;
revoke execute on function public.capture_report_excerpt() from public,anon,authenticated;
create trigger capture_report_excerpt before insert on public.message_reports for each row execute function public.capture_report_excerpt();
create function public.report_transition() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.review_state<>old.review_state and not ((old.review_state='open' and new.review_state='reviewed') or (old.review_state='reviewed' and new.review_state in ('resolved','dismissed'))) then raise exception 'Review the report before resolving it.' using errcode='23514'; end if;
 if new.review_state in ('resolved','dismissed') and char_length(trim(new.outcome))<5 then raise exception 'Add a short outcome before closing the report.' using errcode='23514'; end if;
 if old.review_state in ('resolved','dismissed') and new is distinct from old then raise exception 'Closed reports cannot be edited.' using errcode='23514'; end if;
 return new;
end $$;
revoke execute on function public.report_transition() from public,anon,authenticated;
create trigger enforce_report_transition before update on public.message_reports for each row execute function public.report_transition();
create table public.audit_events (
 id bigint generated always as identity primary key,
 actor_id uuid references auth.users(id) on delete set null,
 source text not null check(source in ('staff','database_operator')),
 resource text not null,
 resource_id uuid not null,
 action text not null,
 before_state text,
 after_state text,
 created_at timestamptz not null default now()
);
create index audit_time on public.audit_events(created_at desc,id desc);
alter table public.audit_events enable row level security;
revoke all on public.audit_events from public,anon,authenticated;
grant select on public.audit_events to authenticated;
create policy staff_audit_read on public.audit_events for select to authenticated using (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
-- Narrow definer trigger permits append-only audit writes; callers cannot execute it.
create function private.audit_staff_change() returns trigger language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); before_row jsonb; after_row jsonb:=to_jsonb(new);
begin
 if actor is not null and not exists(select 1 from public.staff_members where user_id=actor and active) then raise exception 'Staff approval required for audited operation.' using errcode='42501'; end if;
 if tg_op='UPDATE' then before_row:=to_jsonb(old); if before_row=after_row then return new; end if; end if;
 insert into public.audit_events(actor_id,source,resource,resource_id,action,before_state,after_state)
 values(actor,case when actor is null then 'database_operator' else 'staff' end,tg_table_name,(after_row->>'id')::uuid,tg_op,
 coalesce(before_row->>'review_state',before_row->>'status',before_row->>'published'),coalesce(after_row->>'review_state',after_row->>'status',after_row->>'published'));
 return new;
end $$;
revoke execute on function private.audit_staff_change() from public,anon,authenticated;
create trigger audit_programmes after insert or update on public.programmes for each row execute function private.audit_staff_change();
create trigger audit_applications after update on public.applications for each row execute function private.audit_staff_change();
create trigger audit_mentorships after insert or update on public.mentorships for each row execute function private.audit_staff_change();
create trigger audit_mentor_requests after update on public.mentor_requests for each row execute function private.audit_staff_change();
create trigger audit_report_reviews after update on public.message_reports for each row execute function private.audit_staff_change();
commit;
