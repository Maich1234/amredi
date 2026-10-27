begin;
-- Verification and assignment are controlled by trusted operators, never user metadata.
create table public.mentors (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(trim(display_name)) between 1 and 60),
 bio text not null check (char_length(bio) <= 2000),
 verified boolean not null default false
);
create table public.mentorships (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 mentor_id uuid not null references public.mentors(id),
 status text not null default 'active' check (status in ('active','closed')),
 created_at timestamptz not null default now(),
 check (member_id<>mentor_id)
);
create unique index one_active_mentor on public.mentorships(member_id) where status='active';
create index mentorship_mentor on public.mentorships(mentor_id);
create table public.conversations (
 id uuid primary key default gen_random_uuid(),
 mentorship_id uuid not null unique references public.mentorships(id),
 blocked_by uuid references auth.users(id)
);
create table public.messages (
 id bigint generated always as identity primary key,
 conversation_id uuid not null references public.conversations(id),
 sender_id uuid not null references auth.users(id),
 client_nonce uuid not null,
 body text not null check (char_length(trim(body)) between 1 and 4000),
 created_at timestamptz not null default now(),
 unique(sender_id,client_nonce)
);
create index messages_conversation_page on public.messages(conversation_id,id desc);
create table public.message_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id),
 message_id bigint not null references public.messages(id),
 reason text not null check (char_length(trim(reason)) between 5 and 1000),
 created_at timestamptz not null default now(),
 unique(reporter_id,message_id)
);
create index reports_message on public.message_reports(message_id);
create index reports_reporter on public.message_reports(reporter_id);
alter table public.mentors enable row level security;
alter table public.mentorships enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.message_reports enable row level security;
revoke all on public.mentors,public.mentorships,public.conversations,public.messages,public.message_reports from anon,authenticated;
grant select on public.mentors,public.mentorships,public.conversations,public.messages,public.message_reports to authenticated;
grant update(blocked_by) on public.conversations to authenticated;
grant insert(conversation_id,sender_id,client_nonce,body) on public.messages to authenticated;
grant insert(reporter_id,message_id,reason) on public.message_reports to authenticated;
grant usage,select on sequence public.messages_id_seq to authenticated;
create policy verified_mentors on public.mentors for select to authenticated using (verified or id=(select auth.uid()));
create policy assigned_members on public.mentorships for select to authenticated using ((select auth.uid()) in (member_id,mentor_id));
create policy participant_conversations on public.conversations for select to authenticated using (
 exists(select 1 from public.mentorships m where m.id=mentorship_id and (select auth.uid()) in (m.member_id,m.mentor_id))
);
create policy participant_block on public.conversations for update to authenticated using (
 (blocked_by is null or blocked_by=(select auth.uid())) and
 exists(select 1 from public.mentorships m where m.id=mentorship_id and (select auth.uid()) in (m.member_id,m.mentor_id))
) with check (
 (blocked_by is null or blocked_by=(select auth.uid())) and
 exists(select 1 from public.mentorships m where m.id=mentorship_id and (select auth.uid()) in (m.member_id,m.mentor_id))
);
create policy participant_messages on public.messages for select to authenticated using (
 exists(select 1 from public.conversations c where c.id=conversation_id)
);
create policy send_to_active_assignment on public.messages for insert to authenticated with check (
 sender_id=(select auth.uid()) and exists(
 select 1 from public.conversations c join public.mentorships m on m.id=c.mentorship_id
 join public.mentors mentor on mentor.id=m.mentor_id
 where c.id=conversation_id and c.blocked_by is null and m.status='active' and mentor.verified
 and (select auth.uid()) in (m.member_id,m.mentor_id))
);
create policy own_reports on public.message_reports for select to authenticated using (reporter_id=(select auth.uid()));
create policy report_visible_messages on public.message_reports for insert to authenticated with check (
 reporter_id=(select auth.uid()) and exists(select 1 from public.messages msg where msg.id=message_id and msg.sender_id<>(select auth.uid()))
);
-- Invoker trigger: checks the sender's visible records and serializes concurrent sends.
create function public.limit_message_rate() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text,0));
 if (select count(*) from public.messages where sender_id=new.sender_id and created_at>now()-interval '1 minute')>=30 then
 raise exception 'Please wait before sending more messages.' using errcode='P0001';
 end if;
 return new;
end; $$;
revoke execute on function public.limit_message_rate() from public,anon,authenticated;
create trigger message_rate before insert on public.messages for each row execute function public.limit_message_rate();
-- Enable messages only when the hosted Realtime publication exists.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
 alter publication supabase_realtime add table public.messages;
 end if;
end $$;
commit;
