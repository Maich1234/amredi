-- First vertical slice: member profiles, approved programmes and requests.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check (char_length(trim(display_name)) between 1 and 60),
 goal text not null check (goal in ('Return to education','Learn a practical skill','Build my livelihood','Find a mentor'))
);
create table public.programmes (
 id uuid primary key default gen_random_uuid(),
 title text not null check (char_length(title) between 1 and 140),
 category text not null check (category in ('Skills','Education','Livelihood')),
 location text not null,
 description text not null,
 schedule text not null,
 cost_kes integer not null default 0 check (cost_kes >= 0),
 published boolean not null default false,
 created_at timestamptz not null default now()
);
create table public.applications (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 programme_id uuid not null references public.programmes(id),
 status text not null default 'submitted' check (status in ('submitted','under_review','accepted','declined','withdrawn')),
 created_at timestamptz not null default now(),
 unique(member_id,programme_id)
);
create table public.mentor_requests (
 id uuid primary key default gen_random_uuid(),
 member_id uuid not null references public.profiles(id) on delete cascade,
 status text not null default 'pending' check (status in ('pending','matched','closed')),
 created_at timestamptz not null default now()
);
create unique index one_open_mentor_request on public.mentor_requests(member_id) where status in ('pending','matched');
create index programmes_discovery on public.programmes(category,created_at desc,id) where published;
create index applications_member_date on public.applications(member_id,created_at desc);
create index applications_programme on public.applications(programme_id);
create index mentor_member_date on public.mentor_requests(member_id,created_at desc);
alter table public.profiles enable row level security;
alter table public.programmes enable row level security;
alter table public.applications enable row level security;
alter table public.mentor_requests enable row level security;
revoke all on public.profiles,public.programmes,public.applications,public.mentor_requests from anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant select on public.programmes to authenticated;
grant select,insert on public.applications,public.mentor_requests to authenticated;
create policy own_profile_read on public.profiles for select to authenticated using ((select auth.uid())=id);
create policy own_profile_create on public.profiles for insert to authenticated with check ((select auth.uid())=id);
create policy own_profile_edit on public.profiles for update to authenticated using ((select auth.uid())=id) with check ((select auth.uid())=id);
create policy published_programmes on public.programmes for select to authenticated using (published);
create policy own_applications on public.applications for select to authenticated using ((select auth.uid())=member_id);
create policy apply_to_published on public.applications for insert to authenticated with check (
 (select auth.uid())=member_id and status='submitted'
 and exists (select 1 from public.programmes p where p.id=programme_id and p.published)
);
create policy own_mentor_requests on public.mentor_requests for select to authenticated using ((select auth.uid())=member_id);
create policy request_mentor on public.mentor_requests for insert to authenticated with check ((select auth.uid())=member_id and status='pending');
-- Programme publication and status transitions currently require a trusted operator.
-- No client can assign roles, publish programmes, or accept their own application.
commit;
