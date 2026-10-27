# Product and implementation contract

## Sources

- Original deck: https://docs.google.com/presentation/d/1Xy4M-nMwo087tjQrAnoDmlXLtSizJ1o7mUsiaVDnOWk/edit
- Original concept: https://docs.google.com/document/d/1mvrfFradNiaxCYoLprK3fBXao8YbK2KmkmQw7WjlqSE/edit

## Brand

Pink mother-and-child logo beside AMREDI. The welcome logo is cropped from the original deck thumbnail; obtain a high-resolution original before replacing Expo launcher placeholders. No invented redraw has been substituted. UI uses warm neutrals, deep plum text, restrained rose actions, 24px page gutters and spacious cards. System fonts keep the first build lean; final typography awaits device review.

## Journey and states

Welcome → verified account → preferred name and goal → discover published programme → review schedule/cost/location → apply → view status. Support allows one open mentor request. No sensitive personal narrative is required. Every fetch exposes pending, error/retry and empty states. Mutations never display success before server acknowledgement. Unique constraints make application retries safe.

## Architecture

apps/mobile: Expo SDK-compatible dependencies, Router, strict TypeScript, Reanimated/Gesture Handler, TanStack Query and Zod.
supabase/migrations: versioned schema, constraints, indexes and RLS.
A separate staff web portal and shared generated contracts will be added when its functionality is implemented; empty folders are not represented as completed applications.

Native sessions use SecureStore. Web preview sessions stay in memory. Query data stays in memory and is cleared on signout; no sensitive offline cache yet. Refresh runs only while the app is active. Default mutation retries are off. Programme fetches are paginated and lists virtualised. Motion follows reduced-motion settings.

## Next stages

1. Real Supabase project setup, SMTP, OTP recovery verification and two-user device tests.
2. Mentor workspace and staff programme/application tools are implemented in Expo. Mentor matching, report-review queues and staff audit records are also implemented. Next: organisation-scoped memberships and hosted verification.
3. Assignment-scoped chat, blocking/report intake and shared milestones are implemented. Report review and member outcomes are implemented. Next: operational staffing/escalation, retention and attendance tracking.
4. Donation ledger and authenticated M-Pesa initiation, verified callbacks and idempotent reconciliation.
5. Amina navigation support with approved resources and evaluated boundaries.
6. Kiswahili, deletion/export, guardian/consent path appropriate to pilot age range, notification privacy, branded launch assets.

## Release gates

No cross-member record access; no self-assigned privileges; no fabricated success; no duplicate financial effects. Verify keyboard/back navigation, text scaling, screen readers, contrast, dark/light and reduced motion. Measure release cold start, dropped frames, memory and download size on a modest Android phone. Do not claim a 50–60MB APK until a real release artifact is measured.

## Tooling references reviewed

Expo Router installation: https://docs.expo.dev/router/installation/
Supabase React Native Auth: https://supabase.com/docs/guides/auth/quickstarts/react-native
Supabase changelog: https://supabase.com/changelog.md (TLS cipher removal relevant to older clients; no legacy TLS implementation added)
Reanimated accessibility: https://docs.swmansion.com/react-native-reanimated/docs/guides/accessibility/
