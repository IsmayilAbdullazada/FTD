# Dashboard Guides and platform wording

## Behavior

- Dashboard → Guides stays in the moderator dashboard instead of navigating to the Navbar Guides page. Both compose the same library; dashboard counts include webpage resources and uploaded/pasted guides and update after mutations.
- Add guide supports PDF/text upload, direct writing/pasting and webpage links. Webpage publication requires title, summary, audience and a valid source, without mandatory protocol content.
- Approved, active guides and published links appear in care partner Navbar Guides for the matching audience. Drafts and unpublished uploads remain hidden. Unpublish preserves uploaded guides for later publication; Delete removes records permanently.
- View guide omits the old step-by-step care panel. Text documents remain readable, without a redundant overview when it repeats the full text. Source-less text guides do not show a stray `0` or a fictitious PDF link. Care Companion citations for text guides open their in-app reader.
- Test Assistant Guidance is rendered only for `CLINICIAN_MODERATOR`. Care partners and CS Admins do not see this section in Guides. Admin diagnostics remain separate.
- Application-owned clinic and affiliation wording uses `src/shared/lib/siteContent.ts`. Sign-in and contact use Frontotemporal Dementia (FTD) and Young-Onset Dementias Clinic; the affiliation is Division of Geriatric Psychiatry, Neuropsychiatry. Privacy describes educational support, without a clinical care coordination claim. The chatbot label uses Peer Support. Care partner terminology is consistent in application UI; original source documents and user-authored text are preserved.

## Validation

- 61 frontend tests, including an App-level dashboard navigation regression and guide reader, link publication, direct text entry and tester-role regressions.
- Retrieval-only chatbot responses show the requested guide-page introduction once; generated answers and source links are preserved.
- Eight App workflows pass with delayed lazy-module loading.
- All 69 backend tests pass on PostgreSQL 16; the library/citation integration test also passes on PostgreSQL 18.
- TypeScript, ESLint, Prettier, release-tooling checks and production frontend/backend builds.
- Real local Chromium at 1440 × 900 and touch-enabled 390 × 844: publish PDF, pasted text and webpage from Dashboard; open each as a care partner through Navbar Guides; download the protected PDF; unpublish, republish and delete; verify role-specific tester visibility and clinic/privacy/chatbot copy. Both themes are checked. Browser testing uses an isolated PostgreSQL database and synthetic accounts, not production.
- Automated axe scans cover the dashboard and guide reading/writing dialogs in both themes and viewport sizes. Screenshots are visually reviewed. Browser evidence is in `/workspace/artifacts/dashboard-guide-wording/` in the task workspace, outside production assets. This does not certify physical-device or Safari behavior.

## Deployment

Deploy matching frontend and backend builds. There is no new migration or environment variable for this change. Previously required migrations, including 014, must already be applied before API startup. No production deployment was performed during validation.
