import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import assert from "node:assert/strict";
const pg = new PGlite();
await pg.exec(`create role anon; create role authenticated; create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant usage on schema auth,public to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;`);
await pg.exec(`create schema storage;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;
grant select,insert,update,delete on storage.objects to authenticated;
create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;
create function storage.extension(text) returns text language sql immutable as $$select reverse(split_part(reverse($1),'.',1))$$;`);
for (const migration of readdirSync(new URL("../migrations/", import.meta.url))
  .filter((n) => n.endsWith(".sql"))
  .sort())
  await pg.exec(
    readFileSync(
      new URL("../migrations/" + migration, import.meta.url),
      "utf8",
    ),
  );
const a = "00000000-0000-0000-0000-000000000001",
  b = "00000000-0000-0000-0000-000000000002";
const p = "00000000-0000-0000-0000-000000000010",
  draft = "00000000-0000-0000-0000-000000000011";
await pg.exec(`insert into auth.users values ('${a}'),('${b}');
insert into public.profiles values ('${a}','Member A','Learn a practical skill'),('${b}','Member B','Find a mentor');
insert into public.programmes(id,title,category,location,description,schedule,published) values
('${p}','Skills programme','Skills','Kisumu','Description','Weekdays',true),
('${draft}','Draft programme','Skills','Kisumu','Description','Weekdays',false);`);
async function asUser(id, sql) {
  await pg.exec("begin");
  try {
    await pg.exec(
      `set local role authenticated; select set_config('request.jwt.claim.sub','${id}',true);`,
    );
    const result = await pg.query(sql);
    await pg.exec("commit");
    return result.rows;
  } catch (error) {
    await pg.exec("rollback");
    throw error;
  }
}
assert.equal((await asUser(a, "select * from public.profiles")).length, 1);
assert.equal(
  (await asUser(a, `select * from public.profiles where id='${b}'`)).length,
  0,
);
assert.equal((await asUser(a, "select * from public.programmes")).length, 1);
await assert.rejects(
  asUser(
    a,
    `insert into public.profiles values ('${b}','Impersonated','Find a mentor')`,
  ),
);
assert.equal(
  (
    await asUser(
      a,
      `update public.profiles set display_name='Stolen' where id='${b}' returning id`,
    )
  ).length,
  0,
);
await asUser(
  a,
  `insert into public.applications(member_id,programme_id) values ('${a}','${p}')`,
);
await assert.rejects(
  asUser(
    a,
    `insert into public.applications(member_id,programme_id) values ('${a}','${p}')`,
  ),
);
await assert.rejects(
  asUser(
    a,
    `insert into public.applications(member_id,programme_id) values ('${b}','${p}')`,
  ),
);
await assert.rejects(
  asUser(
    b,
    `insert into public.applications(member_id,programme_id,status) values ('${b}','${p}','accepted')`,
  ),
);
await assert.rejects(
  asUser(
    b,
    `insert into public.applications(member_id,programme_id) values ('${b}','${draft}')`,
  ),
);
assert.equal((await asUser(b, "select * from public.applications")).length, 0);
assert.equal(
  (
    await asUser(
      a,
      `update public.applications set status='accepted' returning id`,
    )
  ).length,
  0,
);
assert.equal(
  (await asUser(a, `update public.programmes set published=true returning id`))
    .length,
  0,
);
await asUser(
  a,
  `insert into public.mentor_requests(member_id) values ('${a}')`,
);
await assert.rejects(
  asUser(a, `insert into public.mentor_requests(member_id) values ('${a}')`),
);
await assert.rejects(
  asUser(a, `insert into public.mentor_requests(member_id) values ('${b}')`),
);
assert.equal(
  (await asUser(b, "select * from public.mentor_requests")).length,
  0,
);
await pg.exec("begin;set local role anon;");
await assert.rejects(pg.query("select * from public.programmes"));
await pg.exec("rollback");

const mentor = "00000000-0000-0000-0000-000000000003",
  assignment = "00000000-0000-0000-0000-000000000020",
  chat = "00000000-0000-0000-0000-000000000030";
await pg.exec(`insert into auth.users values ('${mentor}');insert into public.mentors values ('${mentor}','Approved mentor','Skills support',true);
insert into public.mentorships(id,member_id,mentor_id) values ('${assignment}','${a}','${mentor}');insert into public.conversations(id,mentorship_id) values ('${chat}','${assignment}');`);
const insertMessage = (user, nonce) =>
  `insert into public.messages(conversation_id,sender_id,client_nonce,body) values ('${chat}','${user}','00000000-0000-0000-0000-${String(nonce).padStart(12, "0")}','Hello there')`;
await asUser(a, insertMessage(a, 1));
await asUser(mentor, insertMessage(mentor, 2));
assert.equal((await asUser(a, "select * from public.messages")).length, 2);
assert.equal((await asUser(b, "select * from public.messages")).length, 0);
assert.equal((await asUser(b, "select * from public.conversations")).length, 0);
await assert.rejects(asUser(b, insertMessage(b, 3)));
await assert.rejects(asUser(a, insertMessage(mentor, 4)));
await assert.rejects(asUser(a, insertMessage(a, 1)));
await assert.rejects(
  asUser(
    a,
    `insert into public.messages(conversation_id,sender_id,client_nonce,body,created_at) values ('${chat}','${a}',gen_random_uuid(),'Spoof date',now()-interval '1 year')`,
  ),
);
await assert.rejects(asUser(a, `update public.mentors set verified=true`));
await assert.rejects(
  asUser(
    a,
    `insert into public.mentorships(member_id,mentor_id) values ('${b}','${a}')`,
  ),
);
await asUser(
  a,
  `update public.conversations set blocked_by='${a}' where id='${chat}'`,
);
await assert.rejects(asUser(mentor, insertMessage(mentor, 5)));
assert.equal(
  (
    await asUser(
      mentor,
      `update public.conversations set blocked_by=null where id='${chat}' returning id`,
    )
  ).length,
  0,
);
await asUser(
  a,
  `update public.conversations set blocked_by=null where id='${chat}'`,
);
await asUser(mentor, insertMessage(mentor, 6));
await assert.rejects(
  asUser(a, `update public.conversations set mentorship_id=gen_random_uuid()`),
);
const peerMessage = (
  await asUser(
    a,
    `select id from public.messages where sender_id='${mentor}' limit 1`,
  )
)[0].id;
await asUser(
  a,
  `insert into public.message_reports(reporter_id,message_id,reason) values ('${a}',${peerMessage},'Please review this message')`,
);
assert.equal(
  (await asUser(mentor, "select * from public.message_reports")).length,
  0,
);
await assert.rejects(
  asUser(
    b,
    `insert into public.message_reports(reporter_id,message_id,reason) values ('${b}',${peerMessage},'Not my conversation')`,
  ),
);
for (let i = 10; i < 39; i++) await asUser(a, insertMessage(a, i));
await assert.rejects(asUser(a, insertMessage(a, 39)));
await pg.exec(
  `update public.mentorships set status='closed' where id='${assignment}'`,
);
await assert.rejects(asUser(mentor, insertMessage(mentor, 40)));
assert.ok((await asUser(a, "select * from public.messages")).length > 0);
console.log(
  "PASS: assignment-only chat, spoofed sender/date rejection, blocking, private reports, duplicate nonces, message rate limit and closed assignments.",
);

const staff = "00000000-0000-0000-0000-000000000004";
await pg.exec(
  `insert into auth.users values ('${staff}');insert into public.staff_members values ('${staff}',true);update public.mentorships set status='active' where id='${assignment}'`,
);
assert.equal((await asUser(a, "select * from public.staff_members")).length, 0);
await assert.rejects(
  asUser(a, `insert into public.staff_members(user_id) values ('${a}')`),
);
assert.equal(
  (await asUser(mentor, `select * from public.profiles where id='${a}'`))
    .length,
  1,
);
assert.equal(
  (await asUser(mentor, `select * from public.profiles where id='${b}'`))
    .length,
  0,
);
assert.equal((await asUser(staff, "select * from public.profiles")).length, 2);
await assert.rejects(
  asUser(
    a,
    `insert into public.programmes(title,category,location,description,schedule) values ('Unauthorised','Skills','Online','Description','Weekdays')`,
  ),
);
await asUser(
  staff,
  `insert into public.programmes(title,category,location,description,schedule) values ('Staff draft','Skills','Online','Description','Weekdays')`,
);
assert.equal(
  (await asUser(staff, "select * from public.programmes")).length,
  3,
);
assert.equal(
  (await asUser(a, `select * from public.programmes where title='Staff draft'`))
    .length,
  0,
);
await asUser(
  staff,
  `update public.programmes set published=true where title='Staff draft'`,
);
assert.equal(
  (await asUser(a, `select * from public.programmes where title='Staff draft'`))
    .length,
  1,
);
await asUser(staff, `update public.applications set status='under_review'`);
await asUser(staff, `update public.applications set status='accepted'`);
await assert.rejects(
  asUser(staff, `update public.applications set status='submitted'`),
);
await assert.rejects(
  asUser(staff, `update public.applications set member_id='${b}'`),
);
const milestone = "00000000-0000-0000-0000-000000000050";
await asUser(
  a,
  `insert into public.milestones(id,mentorship_id,created_by,title) values ('${milestone}','${assignment}','${a}','Attend the first session')`,
);
await assert.rejects(
  asUser(
    a,
    `insert into public.milestones(id,mentorship_id,created_by,title) values ('${milestone}','${assignment}','${a}','Attend the first session')`,
  ),
);
assert.equal((await asUser(b, "select * from public.milestones")).length, 0);
assert.equal(
  (await asUser(staff, "select * from public.milestones")).length,
  0,
);
await assert.rejects(
  asUser(
    b,
    `insert into public.milestones(mentorship_id,created_by,title) values ('${assignment}','${b}','Not my mentorship')`,
  ),
);
await assert.rejects(
  asUser(
    a,
    `insert into public.milestones(mentorship_id,created_by,title,status) values ('${assignment}','${a}','Spoof completion','completed')`,
  ),
);
assert.equal(
  (
    await asUser(
      a,
      `update public.milestones set status='completed' returning id`,
    )
  ).length,
  0,
);
await assert.rejects(
  asUser(mentor, `update public.milestones set status='completed'`),
);
await asUser(mentor, `update public.milestones set status='agreed'`);
await asUser(mentor, `update public.milestones set status='completed'`);
await assert.rejects(
  asUser(mentor, `update public.milestones set status='proposed'`),
);
await pg.exec(
  `update public.mentorships set status='closed' where id='${assignment}'`,
);
await assert.rejects(
  asUser(
    a,
    `insert into public.milestones(mentorship_id,created_by,title) values ('${assignment}','${a}','Closed assignment')`,
  ),
);
assert.equal(
  (await asUser(mentor, `select * from public.profiles where id='${a}'`))
    .length,
  0,
);
await pg.exec(
  `update public.staff_members set active=false where user_id='${staff}'`,
);
assert.equal((await asUser(staff, "select * from public.profiles")).length, 0);
await assert.rejects(
  asUser(
    staff,
    `insert into public.programmes(title,category,location,description,schedule) values ('Revoked','Skills','Online','Description','Weekdays')`,
  ),
);
console.log(
  "PASS: staff revocation, draft publication, application transitions, assigned-profile privacy, mentor-agreed milestones and duplicate milestone IDs.",
);

await pg.exec(
  `update public.staff_members set active=true where user_id='${staff}'`,
);
const requestA = (await asUser(a, "select id from public.mentor_requests"))[0]
  .id;
await assert.rejects(
  asUser(a, `select public.match_mentor('${requestA}','${mentor}')`),
);
const matched = (
  await asUser(
    staff,
    `select public.match_mentor('${requestA}','${mentor}') as id`,
  )
)[0].id;
const repeated = (
  await asUser(
    staff,
    `select public.match_mentor('${requestA}','${mentor}') as id`,
  )
)[0].id;
assert.equal(matched, repeated);
assert.equal(
  (
    await asUser(
      a,
      `select * from public.conversations where mentorship_id='${matched}'`,
    )
  ).length,
  1,
);
assert.equal(
  (
    await asUser(
      a,
      `select status from public.mentor_requests where id='${requestA}'`,
    )
  )[0].status,
  "matched",
);
await assert.rejects(
  asUser(
    staff,
    `insert into public.mentorships(member_id,mentor_id) values ('${b}','${mentor}')`,
  ),
);
await asUser(
  b,
  `insert into public.mentor_requests(member_id) values ('${b}')`,
);
const requestB = (await asUser(b, "select id from public.mentor_requests"))[0]
  .id;
const unverified = "00000000-0000-0000-0000-000000000005";
await pg.exec(
  `insert into auth.users values ('${unverified}');insert into public.mentors values ('${unverified}','Unverified mentor','Not approved',false)`,
);
await assert.rejects(
  asUser(staff, `select public.match_mentor('${requestB}','${unverified}')`),
);
assert.equal(
  (await asUser(b, "select status from public.mentor_requests"))[0].status,
  "pending",
);
assert.equal((await asUser(b, "select * from public.mentorships")).length, 0);
await assert.rejects(
  asUser(
    staff,
    `insert into public.mentorships(member_id,mentor_id,request_id) values ('${a}','${mentor}','${requestB}')`,
  ),
);
await assert.rejects(asUser(a, `select public.close_mentorship('${matched}')`));
await asUser(staff, `select public.close_mentorship('${matched}')`);
await asUser(staff, `select public.close_mentorship('${matched}')`);
assert.equal(
  (
    await asUser(
      a,
      `select status from public.mentor_requests where id='${requestA}'`,
    )
  )[0].status,
  "closed",
);
await assert.rejects(
  asUser(staff, `select public.match_mentor('${requestA}','${mentor}')`),
);
assert.equal((await asUser(staff, "select * from public.messages")).length, 0);
assert.equal(
  (await asUser(staff, "select * from public.conversations")).length,
  0,
);
const report = (await asUser(staff, "select * from public.message_reports"))[0];
assert.equal(report.message_excerpt, "Hello there");
assert.equal(
  (
    await asUser(
      a,
      `update public.message_reports set review_state='reviewed' returning id`,
    )
  ).length,
  0,
);
await assert.rejects(
  asUser(
    a,
    `insert into public.message_reports(reporter_id,message_id,reason,message_excerpt) values ('${a}',${peerMessage},'Forged context','Forged excerpt')`,
  ),
);
await assert.rejects(
  asUser(
    staff,
    `update public.message_reports set review_state='resolved',outcome='Checked and resolved' where id='${report.id}'`,
  ),
);
await asUser(
  staff,
  `update public.message_reports set review_state='reviewed' where id='${report.id}'`,
);
await assert.rejects(
  asUser(
    staff,
    `update public.message_reports set review_state='resolved',outcome='' where id='${report.id}'`,
  ),
);
await asUser(
  staff,
  `update public.message_reports set review_state='resolved',outcome='Reviewed and action recorded' where id='${report.id}'`,
);
await assert.rejects(
  asUser(
    staff,
    `update public.message_reports set outcome='Rewrite a closed report' where id='${report.id}'`,
  ),
);
assert.equal(
  (
    await asUser(
      a,
      `select outcome from public.message_reports where id='${report.id}'`,
    )
  )[0].outcome,
  "Reviewed and action recorded",
);
assert.equal((await asUser(a, "select * from public.audit_events")).length, 0);
const events = await asUser(
  staff,
  `select * from public.audit_events where actor_id='${staff}'`,
);
assert.ok(
  events.some((e) => e.resource === "mentorships" && e.resource_id === matched),
);
assert.ok(
  events.some(
    (e) =>
      e.resource === "message_reports" &&
      e.resource_id === report.id &&
      e.after_state === "resolved",
  ),
);
assert.ok(events.every((e) => !("message_excerpt" in e) && !("reason" in e)));
await assert.rejects(
  asUser(
    staff,
    `insert into public.audit_events(source,resource,resource_id,action) values ('staff','forged',gen_random_uuid(),'INSERT')`,
  ),
);
await assert.rejects(
  asUser(staff, `update public.audit_events set action='FORGED'`),
);
await assert.rejects(asUser(staff, "select private.audit_staff_change()"));
await pg.exec(`insert into public.staff_members(user_id) values ('${a}')`);
assert.equal(
  (
    await asUser(
      a,
      `update public.message_reports set review_state='reviewed' where id='${report.id}' returning id`,
    )
  ).length,
  0,
);
await pg.exec(`delete from public.staff_members where user_id='${a}'`);
await pg.exec("begin; set local role anon");
await assert.rejects(
  pg.query(`select public.match_mentor('${requestB}','${mentor}')`),
);
await pg.exec("rollback");
await pg.exec(
  `update public.staff_members set active=false where user_id='${staff}'`,
);
assert.equal(
  (await asUser(staff, "select * from public.audit_events")).length,
  0,
);
await assert.rejects(
  asUser(staff, `select public.match_mentor('${requestB}','${mentor}')`),
);
console.log(
  "PASS: atomic/idempotent matching, unverified mentor rejection, closure, excerpt-only moderation, report transitions, immutable audit history and revocation.",
);

console.log(
  "PASS: migration executes; profile isolation, publication, application ownership/status/duplicates, mentor isolation/duplicates and anonymous denial verified.",
);

await asUser(
  a,
  `insert into public.community_profiles(id,display_name) values ('${a}','Community A')`,
);
await asUser(
  b,
  `insert into public.community_profiles(id,display_name,role_intent) values ('${b}','Community B','trainer')`,
);
const post = (
  await asUser(
    a,
    `insert into public.community_posts(author_id,body) values ('${a}','A small win today') returning id`,
  )
)[0].id;
await asUser(
  a,
  `update public.community_posts set body='An edited small win' where id='${post}'`,
);
await assert.rejects(
  asUser(a, `update public.community_posts set hidden=true where id='${post}'`),
);
await assert.rejects(
  asUser(
    a,
    `update public.community_posts set author_id='${b}' where id='${post}'`,
  ),
);
assert.equal(
  (
    await asUser(
      b,
      `update public.community_posts set body='Stolen' where id='${post}' returning id`,
    )
  ).length,
  0,
);
await asUser(b, `insert into public.community_likes values ('${post}','${b}')`);
await assert.rejects(
  asUser(b, `insert into public.community_likes values ('${post}','${b}')`),
);
await asUser(
  b,
  `insert into public.community_comments(post_id,author_id,body) values ('${post}','${b}','Well done')`,
);
await asUser(
  a,
  `update public.community_posts set comments_enabled=false where id='${post}'`,
);
await assert.rejects(
  asUser(
    b,
    `insert into public.community_comments(post_id,author_id,body) values ('${post}','${b}','Disabled')`,
  ),
);
await asUser(
  b,
  `insert into public.community_reports(reporter_id,post_id,reason,excerpt) values ('${b}','${post}','Please review','Forged excerpt')`,
);
assert.equal(
  (await asUser(b, `select excerpt from public.community_reports`))[0].excerpt,
  "An edited small win",
);
assert.equal(
  (await asUser(a, "select * from public.community_reports")).length,
  0,
);
await asUser(
  a,
  `insert into storage.objects(bucket_id,name) values ('community','${a}/avatar-test.jpg')`,
);
assert.equal((await asUser(b, "select * from storage.objects")).length, 0);
await asUser(
  a,
  `update public.community_profiles set avatar_path='${a}/avatar-test.jpg' where id='${a}'`,
);
assert.equal((await asUser(b, "select * from storage.objects")).length, 1);
await assert.rejects(
  asUser(
    b,
    `insert into storage.objects(bucket_id,name) values ('community','${a}/avatar-forged.jpg')`,
  ),
);
await asUser(a, `insert into public.community_blocks values ('${a}','${b}')`);
assert.equal(
  (await asUser(b, "select * from public.community_posts")).length,
  0,
);
assert.equal((await asUser(b, "select * from storage.objects")).length, 0);
assert.equal(
  (await asUser(a, `select * from public.community_profiles where id='${b}'`))
    .length,
  0,
);
await assert.rejects(
  asUser(
    b,
    `insert into public.community_comments(post_id,author_id,body) values ('${post}','${b}','Blocked')`,
  ),
);
await asUser(a, `delete from public.community_blocks where blocked_id='${b}'`);
await pg.exec(
  `update public.staff_members set active=true where user_id='${staff}'`,
);
await asUser(
  staff,
  `update public.community_posts set hidden=true where id='${post}'`,
);
assert.equal(
  (await asUser(b, "select * from public.community_posts")).length,
  0,
);
await assert.rejects(
  asUser(
    staff,
    `update public.community_posts set body='Staff rewrite' where id='${post}'`,
  ),
);
await asUser(staff, `update public.community_reports set resolved=true`);
for (let i = 0; i < 9; i++)
  await asUser(
    a,
    `insert into public.community_posts(author_id,body) values ('${a}','Rate test')`,
  );
await assert.rejects(
  asUser(
    a,
    `insert into public.community_posts(author_id,body) values ('${a}','Too many')`,
  ),
);
await pg.exec("begin; set local role anon");
await assert.rejects(pg.query("select * from public.community_posts"));
await pg.exec("rollback");
console.log(
  "PASS: community ownership, edit protection, moderation, private reports, rate limits, unique likes, disabled comments, bilateral blocking and image isolation.",
);
await pg.close();
