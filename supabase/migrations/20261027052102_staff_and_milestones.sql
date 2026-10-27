begin;
alter table public.programmes add constraint programme_content_bounds check (
 char_length(trim(location)) between 1 and 200 and char_length(trim(description)) between 1 and 10000
 and char_length(trim(schedule)) between 1 and 500 and cost_kes<=10000000
);
create index messages_sender_recent on public.messages(sender_id,created_at desc);
create table public.staff_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default true
);
alter table public.staff_members enable row level security;
revoke all on public.staff_members from anon,authenticated;
grant select on public.staff_members to authenticated;
create policy own_staff_record on public.staff_members for select to authenticated using (user_id=(select auth.uid()));
-- Client accounts may inspect their own approval; only trusted operators may grant it.
create policy mentor_assigned_profile on public.profiles for select to authenticated using (
 exists(select 1 from public.mentorships m join public.mentors v on v.id=m.mentor_id
 where m.member_id=profiles.id and m.mentor_id=(select auth.uid()) and m.status='active' and v.verified)
);
create policy staff_profiles on public.profiles for select to authenticated using (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
grant insert(id,title,category,location,description,schedule,cost_kes,published),
 update(title,category,location,description,schedule,cost_kes,published) on public.programmes to authenticated;
create policy staff_programmes_read on public.programmes for select to authenticated using (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
create policy staff_programmes_create on public.programmes for insert to authenticated with check (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
create policy staff_programmes_edit on public.programmes for update to authenticated using (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
) with check (exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
grant update(status) on public.applications to authenticated;
create policy staff_applications_read on public.applications for select to authenticated using (
 exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
create policy staff_application_decision on public.applications for update to authenticated using (
 member_id<>(select auth.uid()) and exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
) with check (member_id<>(select auth.uid()) and exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active));
create function public.application_transition() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status<>old.status and not (
 (old.status='submitted' and new.status in ('under_review','accepted','declined')) or
 (old.status='under_review' and new.status in ('accepted','declined'))
 ) then raise exception 'Application transition not allowed.' using errcode='23514'; end if;
 return new;
end $$;
revoke execute on function public.application_transition() from public,anon,authenticated;
create trigger enforce_application_transition before update on public.applications for each row execute function public.application_transition();
create table public.milestones (
 id uuid primary key default gen_random_uuid(),
 mentorship_id uuid not null references public.mentorships(id),
 created_by uuid not null references auth.users(id),
 title text not null check (char_length(trim(title)) between 3 and 200),
 status text not null default 'proposed' check(status in ('proposed','agreed','completed')),
 created_at timestamptz not null default now()
);
create index milestone_mentorship on public.milestones(mentorship_id,created_at desc,id);
alter table public.milestones enable row level security;
revoke all on public.milestones from anon,authenticated;
grant select on public.milestones to authenticated;
grant insert(id,mentorship_id,created_by,title),update(status) on public.milestones to authenticated;
create policy participant_milestones on public.milestones for select to authenticated using (
 exists(select 1 from public.mentorships m where m.id=mentorship_id and (select auth.uid()) in (m.member_id,m.mentor_id))
);
create policy propose_milestone on public.milestones for insert to authenticated with check (
 created_by=(select auth.uid()) and exists(select 1 from public.mentorships m join public.mentors v on v.id=m.mentor_id
 where m.id=mentorship_id and m.status='active' and v.verified and (select auth.uid()) in (m.member_id,m.mentor_id))
);
create policy mentor_milestone_review on public.milestones for update to authenticated using (
 exists(select 1 from public.mentorships m join public.mentors v on v.id=m.mentor_id
 where m.id=mentorship_id and m.status='active' and v.verified and m.mentor_id=(select auth.uid()))
) with check (
 exists(select 1 from public.mentorships m join public.mentors v on v.id=m.mentor_id
 where m.id=mentorship_id and m.status='active' and v.verified and m.mentor_id=(select auth.uid()))
);
create function public.milestone_transition() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status<>old.status and not ((old.status='proposed' and new.status='agreed') or (old.status='agreed' and new.status='completed')) then
 raise exception 'Milestone must be agreed before completion.' using errcode='23514';
 end if;
 return new;
end $$;
revoke execute on function public.milestone_transition() from public,anon,authenticated;
create trigger enforce_milestone_transition before update on public.milestones for each row execute function public.milestone_transition();
commit;
