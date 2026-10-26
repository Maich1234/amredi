# Verification and limits

- TypeScript strict check passed.
- PostgreSQL-compatible PGlite executed the migration and passed negative/positive permission tests (see supabase/tests/access.mjs). This does not replace a hosted Supabase test or its advisors.
- Expo web export passed.
- Expo Android JavaScript/Hermes bundle export passed. This is not an APK or a device test.
- Root development dependencies audit: zero advisories at check time.
- Mobile audit: five high findings in Expo CLI's dependency tree, including node-forge 1.4.0 (GHSA-86w9-cpqp-85rv) and bundled Zod 3.25.76 (GHSA-mrhx-c7xc-m3w5). App validation uses Zod 4.6.7. No safe upstream forge version was available from the registry. Do not force a downgrade to an incompatible Expo SDK or replace CLI's Zod with a breaking major version. CI's audit step intentionally blocks a clean security gate until upstream remediation or a documented reviewed mitigation.
- No live project credentials were used. Auth emails, programme application submission against hosted Supabase, recovery, Realtime and physical-device behaviour remain unverified.
- Initial splash/icon assets remain Expo placeholders; welcome uses an extracted original Amredi logo from the provided deck.
- Browser visual QA could not run: Chromium is absent and its download returned invalid archives. Visual review and real-device interaction remain outstanding; export success is not presented as visual validation.

## Second slice

Both migrations pass isolated SQL tests, including assignment-only messages, sender/date spoofing denial, private reports, block/unblock ownership, duplicate nonce rejection, server-side rate limiting and closed-assignment denial. No hosted Supabase project named Amredi was available; no unrelated project was changed. OTP recovery and realtime require hosted/device verification.
