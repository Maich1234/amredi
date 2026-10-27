# Verification and remaining limits

## Current hosted backend (2026-10-27)

Amredi is active under Wabunifu on the Maich account connection, project jeenyvbqxzwhojlwlnvr. All five migrations are applied, and migration filenames are aligned with hosted history.

- Hosted SQL tests pass for profile isolation, application ownership/deduplication, staff-only matching, idempotent matching retries, report excerpt capture/review, audit integrity and closed-assignment write denial.
- Tests use temporary synthetic identities in a transaction that is rolled back. They exercise real PostgreSQL RLS and triggers, not the Auth email/JWT issuance flow.
- Public Data API smoke check returned HTTP 401 for anonymous programme reads, as required.
- Security advisor: no findings.
- Performance advisor: missing foreign-key indexes and repeated SELECT-policy warnings resolved. Remaining unused-index notices are informational on this new database; indexes are retained for intended access patterns.
- Every public application table has RLS enabled.
- Typed Supabase client uses types generated from the hosted schema. Public configuration is shipped with the app; no server key is included.

## Local checks

Lint, strict TypeScript, complete isolated PGlite permission tests, web export and Android Hermes bundle export pass. A bundle export is not an installable APK or a device test.

The local SQL suite additionally checks sender/date spoofing, request/milestone duplication, message throttling, staff revocation, assignment privacy, valid application/milestone transitions, report-review transitions, excerpt spoofing denial, client-immutable audit records and anonymous RPC denial.

## Remaining release work

- Email delivery/SMTP, recovery-code email template, Auth password policy and actual sign-in/recovery tests on Android.
- Installable APK, physical-device accessibility/performance and browser visual QA. Browser QA previously failed because Chromium was unavailable and its download returned invalid archives.
- Launcher assets now use the extracted original Amredi mark; the splash and final high-resolution artwork still need production polish.
- Five high dependency findings remain in Expo CLI dependencies (node-forge and bundled Zod included), documented by npm audit and the GitHub audit gate. No unsafe forced SDK downgrade was applied.
- Donor/payment flows, Amina, formal safeguarding/consent, organisation-scoped partner access, notifications, attendance and account deletion/retention are not complete.

## Optimized Android build preparation

Standalone release APK profiles, R8/resource shrinking, compressed embedded Hermes bytecode and ARM phone ABI selection are configured and validated by isolated native prebuild. Lint/typecheck and production Android export pass. See docs/android-testing.md for measurements and the pending explicit Expo EAS upload authorization. No APK has been produced yet.
