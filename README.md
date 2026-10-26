# Amredi

Are you ready to start afresh?

Expo mobile app and Supabase backend connecting young mothers in Kenya with education, practical skills and trusted support.

## Run

1. `npm --prefix apps/mobile ci`
2. Copy `apps/mobile/.env.example` to `apps/mobile/.env`; set the Supabase URL and publishable key.
3. Apply `supabase/migrations` to a dedicated Supabase project. Configure email confirmation and SMTP. Set password minimum to 10 or stronger in Auth.
4. `npm start`

Without environment settings the welcome screen works and authentication explains the missing connection. No fake programmes, mentors or successful submissions are shown.

## Checks

- `npm run typecheck`
- `npm run export:web`
- `npm --prefix apps/mobile run export:android`
- `npm ci && npm run test:database` — executes the migration and negative permission tests in an isolated PostgreSQL-compatible PGlite database. Hosted Supabase advisors and real Auth/device tests are still required before release.

## First slice

Welcome, email registration/sign-in/reset request, encrypted native session storage, profile/goal creation, published programme pagination, programme details, duplicate-safe applications, staff-assisted mentor requests, light/dark appearance, and honest messaging/Amina placeholders.

## Remaining release work

Mentor/partner/admin portals and role model; mentor assignment; private chat and moderation; milestones; M-Pesa ledger and reconciliation; Amina; Kiswahili; account deletion/export; password recovery deep-link completion; verified consent and safeguarding journeys for under-18 members; notifications; real device accessibility/performance tests. This is a development foundation, not a launch-ready service.

Programme publication is restricted to trusted database operators in this slice. Never put a service-role key, M-Pesa credential or AI key in an EXPO_PUBLIC variable.

See docs/build-plan.md for implementation and release gates.
