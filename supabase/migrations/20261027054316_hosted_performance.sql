begin;
create index audit_actor on public.audit_events(actor_id);
create index conversations_blocker on public.conversations(blocked_by);
create index milestones_creator on public.milestones(created_by);
-- Preserve the same access predicates while evaluating one SELECT policy per table.
drop policy own_applications on public.applications;
drop policy staff_applications_read on public.applications;
create policy application_read on public.applications for select to authenticated using (
 member_id=(select auth.uid()) or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
drop policy own_mentor_requests on public.mentor_requests;
drop policy staff_requests_read on public.mentor_requests;
create policy request_read on public.mentor_requests for select to authenticated using (
 member_id=(select auth.uid()) or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
drop policy assigned_members on public.mentorships;
drop policy staff_assignments_read on public.mentorships;
create policy mentorship_read on public.mentorships for select to authenticated using (
 (select auth.uid()) in (member_id,mentor_id) or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
drop policy own_reports on public.message_reports;
drop policy staff_reports_read on public.message_reports;
create policy report_read on public.message_reports for select to authenticated using (
 reporter_id=(select auth.uid()) or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
drop policy own_profile_read on public.profiles;
drop policy staff_profiles on public.profiles;
drop policy mentor_assigned_profile on public.profiles;
create policy profile_read on public.profiles for select to authenticated using (
 id=(select auth.uid()) or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
 or exists(select 1 from public.mentorships m join public.mentors v on v.id=m.mentor_id
 where m.member_id=profiles.id and m.mentor_id=(select auth.uid()) and m.status='active' and v.verified)
);
drop policy published_programmes on public.programmes;
drop policy staff_programmes_read on public.programmes;
create policy programme_read on public.programmes for select to authenticated using (
 published or exists(select 1 from public.staff_members s where s.user_id=(select auth.uid()) and s.active)
);
commit;
