begin;
-- Community identity is deliberately separate from private support profiles.
create table public.community_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(char_length(trim(display_name)) between 1 and 60),
 bio text not null default '' check(char_length(bio)<=300),
 avatar_path text check(avatar_path is null or avatar_path like id::text || '/avatar-%.jpg'),
 interests text not null default '' check(char_length(interests)<=160),
 role_intent text not null default 'mother' check(role_intent in ('mother','mentor','trainer'))
);
create table public.community_blocks (
 blocker_id uuid not null references auth.users(id) on delete cascade,
 blocked_id uuid not null references auth.users(id) on delete cascade,
 primary key(blocker_id,blocked_id), check(blocker_id<>blocked_id)
);
create index community_blocks_reverse on public.community_blocks(blocked_id,blocker_id);
-- The definer helper only answers visibility for the caller, never arbitrary pairs.
create function private.community_visible(other uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and not exists(select 1 from public.community_blocks b where
 (b.blocker_id=auth.uid() and b.blocked_id=other) or (b.blocked_id=auth.uid() and b.blocker_id=other))
$$;
revoke all on function private.community_visible(uuid) from public,anon;
grant usage on schema private to authenticated;
grant execute on function private.community_visible(uuid) to authenticated;
create table public.community_posts (
 id uuid primary key default gen_random_uuid(),
 author_id uuid not null references public.community_profiles(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 2000),
 image_path text check(image_path is null or image_path like author_id::text || '/post-%.jpg'),
 image_alt text not null default '' check(char_length(image_alt)<=200),
 comments_enabled boolean not null default true,
 hidden boolean not null default false,
 created_at timestamptz not null default now()
);
create index community_posts_feed on public.community_posts(created_at desc,id desc) where not hidden;
create index community_posts_author on public.community_posts(author_id,created_at desc);
create table public.community_comments (
 id uuid primary key default gen_random_uuid(),
 post_id uuid not null references public.community_posts(id) on delete cascade,
 author_id uuid not null references public.community_profiles(id) on delete cascade,
 body text not null check(char_length(trim(body)) between 1 and 1000),
 hidden boolean not null default false,
 created_at timestamptz not null default now()
);
create index community_comments_post on public.community_comments(post_id,created_at,id);
create index community_comments_author on public.community_comments(author_id,created_at);
create table public.community_likes (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(post_id,user_id)
);
create index community_likes_user on public.community_likes(user_id);
create table public.community_saves (
 post_id uuid not null references public.community_posts(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 primary key(post_id,user_id)
);
create index community_saves_user on public.community_saves(user_id);
create table public.community_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id) on delete cascade,
 post_id uuid references public.community_posts(id) on delete set null,
 comment_id uuid references public.community_comments(id) on delete set null,
 reason text not null check(char_length(trim(reason)) between 5 and 1000),
 excerpt text not null default '',
 resolved boolean not null default false,
 created_at timestamptz not null default now()
);
create index community_reports_queue on public.community_reports(resolved,created_at);
create index community_reports_author on public.community_reports(reporter_id,created_at);
create index community_reports_post on public.community_reports(post_id);
create index community_reports_comment on public.community_reports(comment_id);
-- Insert timestamps cannot be forged; update identities and moderation fields are immutable to authors.
create function private.community_write_guard() returns trigger language plpgsql security invoker set search_path='' as $$
declare staff boolean; n integer;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select exists(select 1 from public.staff_members where user_id=auth.uid() and active) into staff;
 if TG_OP='UPDATE' then
   if new.id<>old.id or new.author_id<>old.author_id or new.created_at<>old.created_at then raise exception 'Identity cannot change' using errcode='42501'; end if;
   if new.hidden<>old.hidden and not staff then raise exception 'Staff approval required' using errcode='42501'; end if;
   if new.author_id<>auth.uid() and (to_jsonb(new)-'hidden')<>(to_jsonb(old)-'hidden') then raise exception 'Only the author can edit content' using errcode='42501'; end if;
   if TG_TABLE_NAME='community_comments' then
    if new.post_id<>old.post_id then raise exception 'Post cannot change' using errcode='42501'; end if;
   end if;
 else
   new.created_at:=now(); new.hidden:=false;
   perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || TG_TABLE_NAME,0));
   execute format('select count(*) from public.%I where author_id=$1 and created_at>now()-interval ''1 hour''',TG_TABLE_NAME) into n using auth.uid();
   if n >= (case when TG_TABLE_NAME='community_posts' then 10 else 60 end) then raise exception 'Please pause before posting again' using errcode='P0001'; end if;
 end if;
 return new;
end $$;
revoke all on function private.community_write_guard() from public,anon,authenticated;
create trigger community_post_guard before insert or update on public.community_posts for each row execute function private.community_write_guard();
create trigger community_comment_guard before insert or update on public.community_comments for each row execute function private.community_write_guard();
create function private.community_report_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if TG_OP='INSERT' then
  new.created_at:=now(); new.resolved:=false;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || 'reports',0));
  if (select count(*) from public.community_reports where reporter_id=auth.uid() and created_at>now()-interval '1 hour')>=20 then raise exception 'Please pause before reporting again'; end if;
  if new.comment_id is not null then
   select body into new.excerpt from public.community_comments where id=new.comment_id and post_id=new.post_id;
  else select body into new.excerpt from public.community_posts where id=new.post_id;
  end if;
  if new.excerpt is null then raise exception 'Content unavailable' using errcode='42501'; end if;
 else
  if (to_jsonb(new)-'resolved')<>(to_jsonb(old)-'resolved') then raise exception 'Report content cannot change' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function private.community_report_guard() from public,anon,authenticated;
create trigger community_report_guard before insert or update on public.community_reports for each row execute function private.community_report_guard();
alter table public.community_profiles enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;
alter table public.community_likes enable row level security;
alter table public.community_saves enable row level security;
alter table public.community_reports enable row level security;
revoke all on public.community_profiles,public.community_blocks,public.community_posts,public.community_comments,public.community_likes,public.community_saves,public.community_reports from anon,authenticated;
grant select,insert,update on public.community_profiles to authenticated;
grant select,insert,delete on public.community_blocks,public.community_likes,public.community_saves to authenticated;
grant select,insert,update,delete on public.community_posts,public.community_comments to authenticated;
grant select,insert,update on public.community_reports to authenticated;
create policy community_profile_read on public.community_profiles for select to authenticated using(private.community_visible(id));
create policy community_profile_insert on public.community_profiles for insert to authenticated with check(id=(select auth.uid()));
create policy community_profile_update on public.community_profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy block_read on public.community_blocks for select to authenticated using(blocker_id=(select auth.uid()));
create policy block_insert on public.community_blocks for insert to authenticated with check(blocker_id=(select auth.uid()));
create policy block_delete on public.community_blocks for delete to authenticated using(blocker_id=(select auth.uid()));
create policy post_read on public.community_posts for select to authenticated using((not hidden and private.community_visible(author_id)) or author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
create policy post_insert on public.community_posts for insert to authenticated with check(author_id=(select auth.uid()) and not hidden);
create policy post_update on public.community_posts for update to authenticated using(author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active)) with check(author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
create policy post_delete on public.community_posts for delete to authenticated using(author_id=(select auth.uid()));
create policy comment_read on public.community_comments for select to authenticated using((not hidden and private.community_visible(author_id) and exists(select 1 from public.community_posts where id=post_id and not hidden)) or author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
create policy comment_insert on public.community_comments for insert to authenticated with check(author_id=(select auth.uid()) and not hidden and exists(select 1 from public.community_posts where id=post_id and not hidden and comments_enabled and private.community_visible(author_id)));
create policy comment_update on public.community_comments for update to authenticated using(author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active)) with check(author_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
create policy comment_delete on public.community_comments for delete to authenticated using(author_id=(select auth.uid()));
create policy like_read on public.community_likes for select to authenticated using(private.community_visible(user_id) and exists(select 1 from public.community_posts where id=post_id and not hidden));
create policy like_insert on public.community_likes for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.community_posts where id=post_id and not hidden and private.community_visible(author_id)));
create policy like_delete on public.community_likes for delete to authenticated using(user_id=(select auth.uid()));
create policy save_read on public.community_saves for select to authenticated using(user_id=(select auth.uid()));
create policy save_insert on public.community_saves for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.community_posts where id=post_id and not hidden));
create policy save_delete on public.community_saves for delete to authenticated using(user_id=(select auth.uid()));
create policy report_read on public.community_reports for select to authenticated using(reporter_id=(select auth.uid()) or exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
create policy report_insert on public.community_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and not resolved);
create policy report_update on public.community_reports for update to authenticated using(exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active)) with check(exists(select 1 from public.staff_members where user_id=(select auth.uid()) and active));
-- Images never have public URLs. Read only images attached to accessible content.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('community','community',false,2097152,array['image/jpeg']);
create policy community_image_read on storage.objects for select to authenticated using(bucket_id='community' and (
 (storage.foldername(name))[1]=(select auth.uid())::text
 or exists(select 1 from public.community_profiles where avatar_path=name)
 or exists(select 1 from public.community_posts where image_path=name and not hidden)
));
create policy community_image_insert on storage.objects for insert to authenticated with check(bucket_id='community' and (storage.foldername(name))[1]=(select auth.uid())::text and storage.extension(name)='jpg');
create policy community_image_delete on storage.objects for delete to authenticated using(bucket_id='community' and (storage.foldername(name))[1]=(select auth.uid())::text);
commit;
