# Connect a dedicated Amredi Supabase project

The connected account had no project named Amredi at implementation time. Existing unrelated projects were not modified.

1. Create/select a dedicated project. Apply both versioned migrations in order. Run Supabase security/performance advisors before release.
2. Add project URL and **publishable** key to apps/mobile/.env (see .env.example). Never add service-role or management credentials to mobile configuration.
3. Enable email confirmation, configure SMTP and set password minimum to at least 10 characters. Configure rate limits appropriate to pilot traffic.
4. In Auth → Email Templates → Reset Password include `{{ .Token }}` in the email body, with instructions to enter the code in Amredi. Recovery uses verifyOtp(email, token, type: recovery), followed by updateUser(password). It does not rely on an external browser redirect. Keep expiry short and test expired/reused codes. Do not log codes or session tokens.
5. Ensure public.messages is enabled in the supabase_realtime publication. The second migration adds it if the publication already exists. RLS still determines event visibility. Block/assignment status is refetched when the chat is focused; the server checks every send even if UI status is stale.
6. Use two test members plus a verified mentor account to repeat the permission tests through actual Auth/API sessions on Android.

## Operator workflow before the staff portal exists

Use the trusted Supabase SQL editor to create a verified mentor record using their existing auth user UUID, then an active mentorship linking the member profile to that mentor, and a conversation referencing that mentorship. Do this only after checking verification and consent. Update the matching mentor_request status to matched. Do not expose an administrative key to a client or use user-editable metadata for permissions.

Review message_reports through the trusted operator interface and document resolution. Reports currently have a private intake table; automated escalation, response-time commitments and a full moderation console remain outstanding. The pilot cannot promise active moderation until this process is staffed.

Closed mentorships retain participant-readable history but cannot receive messages. Either participant may block messaging; only the person who blocked can unblock. A trusted operator can intervene. Deletion/retention policy still needs to be implemented before launch.

## Remaining deployment verification

Verify OTP emails and expiry, signout/recovery, realtime reconnect, offline retry/deduplication, blocking from both accounts, report visibility, invalid API requests and hosted database advisors. Local SQL tests emulate auth.uid(); they do not validate the hosted project's authentication settings.

## Staff and mentor workspaces

Apply the third migration before opening the new workspace routes. The trusted operator grants staff access by adding an existing Auth UUID to public.staff_members with active=true; revoke immediately by setting active=false. No client may create or update these approvals.

Approved users open **You → Open my workspace**. Mentors see active assigned profiles and their goals; staff see programme drafts and applications. Staff can create/edit/publish a programme and move applications submitted → under_review → accepted/declined. Final decisions require a confirmation in the app; terminal decisions cannot be reversed in the client. Staff cannot decide their own application.

Milestones are proposed by either participant in an active verified mentorship, then agreed and completed by the assigned mentor. Closed mentorships retain readable milestones but cannot add or change them. A revoked mentor loses active-profile and milestone-write access on the next database request. Staff approval does not automatically grant private chat/milestone access.

Before production: add staff audit trails, organisation-specific permissions, application-decision notifications, operational moderation, archival/deletion flows and hosted tests. This first staff workspace runs in the Expo app/web export; a separate organisation portal has not been built.
