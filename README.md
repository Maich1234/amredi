# Amredi

Are you ready to start afresh?

Expo mobile app and Supabase backend connecting young mothers in Kenya with education, practical skills and trusted support.

## Run

1. `npm --prefix apps/mobile ci`
2. `npm start`

The mobile app includes public client configuration for the dedicated **Amredi** Supabase project in **Wabunifu**. To use a different project, copy apps/mobile/.env.example to .env and provide both URL and publishable key; incomplete overrides disable the connection instead of mixing projects. No server/management credentials are included.

All five migrations are applied to the hosted project. Configure email delivery, the recovery-code email template and Auth password policy before enabling email flows for pilot users. See docs/supabase-setup.md. Programmes and people are real database records; the app does not fabricate seed content.

## Checks

- `npm run typecheck`
- `npm run export:web`
- `npm --prefix apps/mobile run export:android`
- `npm ci && npm run test:database` — executes the migration and negative permission tests in an isolated PostgreSQL-compatible PGlite database. Hosted RLS tests and advisors have also been run; real Auth/email/device tests remain required.

## First slice

Welcome, email registration/sign-in/reset request, encrypted native session storage, profile/goal creation, published programme pagination, programme details, duplicate-safe applications, staff-assisted mentor requests, light/dark appearance, and an Amina placeholder. The second slice adds assigned mentor conversations, realtime message invalidation, paginated history, duplicate-safe sends, blocking, private reports, and in-app OTP password recovery. See docs/supabase-setup.md for the required recovery email template.

## Third slice

Approved mentor workspace, assigned member goals, shared milestones, and staff-only programme draft/publication and application-review tools. Final decisions require confirmation. Apply the third migration and grant staff approval through a trusted operator; details in docs/supabase-setup.md.

## Fourth slice

Staff mentor matching/closure, report-review queues, member report outcomes and database-generated audit history. Report review uses a captured excerpt rather than access to full private chats. Apply the fourth migration before using these routes.

## Remaining release work

Mentor/partner/admin portals and role model; mentor assignment; full moderation console and operational escalation; milestones; M-Pesa ledger and reconciliation; Amina; Kiswahili; account deletion/export; hosted OTP recovery verification; verified consent and safeguarding journeys for under-18 members; notifications; real device accessibility/performance tests. This is a development foundation, not a launch-ready service.

Programme publication is restricted to trusted database operators in this slice. Never put a service-role key, M-Pesa credential or AI key in an EXPO_PUBLIC variable.

See docs/build-plan.md for implementation and release gates.

## Android test APK

See docs/android-testing.md for the optimized standalone release profiles and current build status. JavaScript is bundled into release APKs; Supabase operations still need internet. Final APK size is measured only after a successful native build.
