# Amredi community release

The community rebuild was reconstructed after workspace maintenance removed its unpublished local commit. The live Supabase community migration was recovered unchanged from migration history (20261027201916).

## Implemented

- Optional community photo, name, bio and interests, separate from private support profiles.
- Mother, mentor and trainer intent selection; no self-granted approval or privileged access.
- Paginated Home feed, own posts, saved posts and member profile feeds.
- Text/photo posts, compressed photo selection, accessible descriptions, edit/delete posts, likes, comments and delete own comments.
- Private reports with server-captured text, staff moderation, hide content and resolve reports.
- Bilateral blocking, unblock management and private image access.
- Existing support and mentorship flows preserved; applications linked from You.
- Bundled fonts, consistent navigation icons and horizontal Explore filters.
- Hosted registration confirmation redirect and restored confirmation page source.

## Validation

Run npm run typecheck, npm run lint and npm run test:database from the repository root. Run npm run export:android from apps/mobile for the production Hermes export. Test fixtures use an isolated PGlite database; no real user accounts are created.

Previous local validation passed. Checks are rerun after reconstruction before publication. Browser/device QA and a new APK remain outstanding. The hosted fixture transaction previously returned an expired request-state error and is not counted as passed.

## Limits and next work

Signed image links last 120 seconds; already-issued links cannot be revoked instantly by blocking. Image MIME/size policies are enforced, but server-side decoding/scanning is not implemented. Supabase Auth leaked-password protection was disabled at the last advisor check.

Threaded replies, following, notifications/preferences, formal trainer approval/classes, donor web payments and age-appropriate onboarding remain planned. No donations readiness is claimed.
