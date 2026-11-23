# Platform update verification

This run checks the eight-task platform update against base `2068493`. All accounts, posts, messages, email addresses and documents used for testing are synthetic. No production records or public server configuration were changed. These results describe this branch, not a deployment certification.

## Recorded environment and results

Verification date: **2026-11-23**. Node 24; real PostgreSQL 16 and 18; Chromium at **1440×900** and **390×844** with touch emulation. Browser accounts obtained their passwords through the real recovery screens and a local STARTTLS SMTP relay. No shared seed password or external email delivery was used.

| Check                                     | Result                                                                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend typecheck, ESLint and formatting | Passed                                                                                                                                                           |
| Frontend behavioral suite                 | 47 tests passed across 21 files, including policy, guide, role notification, console, invitation, draft and focus regressions                                    |
| Backend integration suite                 | 66 tests passed on each of PostgreSQL 16 and 18                                                                                                                  |
| Desktop and mobile admin actions          | All **41 registered actions** passed via real browser forms at both sizes; 50 confirmations per viewport include reversible toggles and all moderation decisions |
| Browser invitation flow                   | Moderator sends invitation → captured email link → logged-out registration → guidelines acknowledgment → reload; passed at both sizes                            |
| Guide publication and access              | Moderator uploads July-2012.pdf and approves; FTD care partner sees and opens it; AD care partner does not see the FTD-only guide; passed at both sizes          |
| Console sections                          | Overview, Data edit with audit, masked CSV, Actions, both read-only Preview panes, Diagnostics and Audit; passed at both sizes                                   |
| Notification roles                        | Moderator pending submissions and admin system section; care-partner outcomes; passed at both sizes                                                              |
| Dependency audit                          | Root and standalone backend audits reported zero vulnerabilities                                                                                                 |

Local Apache/ModSecurity checks passed header forwarding, preview write rejection, guide PUT/PATCH/DELETE, authenticated/anonymous PDF access and PDF size/type enforcement. A tested, exact-route exclusion for false-positive rule 200004 was needed for July-2012.pdf; see the deployment runbook before adopting it. The stock proxy also returns HTML 500 for a deliberately missing multipart boundary; backend-direct malformed-body tests return 400. This proxy-specific error mapping remains an infrastructure observation, not a passing 4xx check. Historical results elsewhere in `docs/qa` describe earlier releases and must not be added to these counts.

## Safe setup and repeatable gates

Use an isolated migrated and seeded database; never point integration tests or seed commands at production. Copy `config/ftdcare.env.example` to the ignored `config/ftdcare.test.env`, configure that database, set `ENABLE_DATABASE_RESET=false`, and use only a local/test SMTP relay. Set `ENABLE_ADMIN_CONSOLE=true` in the browser test backend. Leave it false when testing the disabled-console guard.

```bash
npm ci
npm run typecheck
npm run lint:eslint
npm run format:check
npx vitest run
npm run test:release
(cd app && node --env-file=../config/ftdcare.test.env --import tsx src/db/migrate.ts)
(cd app && node --env-file=../config/ftdcare.test.env --import tsx src/db/seed.ts)
(cd app && node --env-file=../config/ftdcare.test.env --import tsx --test --test-concurrency=1 tests/*.test.ts)
npm run build
npm --prefix app run build
npm audit --audit-level=moderate
npm --prefix app audit --audit-level=moderate
```

The backend npm test command runs test files sequentially because they share an integration database; the registration regression still tests parallel registrations within its own test. Avoid running other CPU-heavy browser/container jobs during the final gate.

The route-inventory regression fails when a new Express endpoint has no entry in the [console coverage matrix](../admin-console.md). The action-registry integration regression also fails if a registered action has no preview/commit exercise. Tests cover stale or tampered previews, atomic rollback, idempotent retry, a revoked session waiting on a mutation lock, masked data, audited reveals, append-only audit records, role guards and preview write rejection.

## Manual browser script

Repeat the following at both viewport sizes, in light and dark themes where applicable. Use a fresh browser context for each account. Inspect errors in DevTools without copying cookies, passwords or preview tokens into tickets.

### 1. Recovery, invitation and policy acknowledgment

1. Recover a local care-partner, moderator and admin account using **Forgot password**. Open the captured single-use link, set a test password and sign in. Wrong credentials must display a login error without a session-expired warning.
2. As a moderator, choose **Invite Member**, supply a test-only inbox and a condition/primary regional group, and send. Open the emailed link while signed out. Registration must retain the invitation and show no session-expired warning.
3. Complete registration. A care partner without a current acknowledgment must see the Community Guidelines gate. Staff must skip it. Verify the unchecked button is disabled, policy details trap focus, Escape closes the nested details, and **Sign out** exits the gate.
4. Acknowledge, reload and sign in again: the gate must stay absent. Raising the policy version in an isolated fixture must require acknowledgment again. Posting/replying without it must return `428` / `GUIDELINES_ACK_REQUIRED`; staff are exempt.
5. Start a discussion draft, trigger the required-policy response, acknowledge and verify the title/details survive. Review the composer and reminder at 390 px. Do not delete production acknowledgments to simulate this.

### 2. One Guides library

1. As a moderator, open **Guides → Add guide → Upload PDF or text**. Upload `public/resources/July-2012.pdf`, select FTD and add a recognizable test title. Expect **Reading your PDF…**, then **PDF ready**. A valid PDF without readable text must show the blocking plain-language error and leave no stored upload.
2. Save a draft: staff see its draft badge, care partners do not. Edit metadata and approve. The helper text must explain that approved guides appear in Guides. Moderators must not see extraction statistics, pages, word/chunk counts, scores or a technical inspector.
3. In an FTD care-partner context, find the guide and open its protected PDF (200). An AD care partner must not see or download that FTD guide. A signed-out uploaded-PDF request returns 401. Repeat with **All care partners (FTD and AD)** and confirm both audiences can see it, regardless of region/group.
4. Unpublish and confirm the guide disappears from the library and Care Companion retrieval; republish and check again. Delete the disposable guide. A legacy resource with the same approved guide PDF must not create a duplicate card.
5. **Link to a webpage** must create a linked resource. Verify its edit/delete actions use the resource API, while uploaded-guide actions use the guide API. Legacy resource PDF attachments remain supported.
6. As a CS Admin, verify technical document tools and **Diagnostics** are available; a moderator/care-partner API response must omit extracted pages, chunk/word counts and retrieval scores. Source/page citations remain available where needed.

### 3. Navigation, notifications and wording

1. Open the desktop account dropdown and mobile account menu. **My Posts** works and has no “Track your posts” secondary text.
2. Submit/edit a care-partner question or reply. The author gets a receipt; moderators get review notifications and queued email jobs; admins do not get moderation fan-out. Publish a reply/nested reply and verify the relevant author receives the outcome only after approval.
3. A moderator sees **Pending Submissions** in notifications. An admin sees **System notifications**, without the pending-queue block. Trigger guide publication, staff recovery/security, new registration, permanent delivery failure and another admin's destructive action in the isolated fixtures; check recipient roles and jobs. Failed-email alert delivery must not recursively generate alerts.
4. Verify private replies target the thread's involved moderator rather than admins. Keep clinical/private text out of email bodies.
5. Check labels, forms, footer, emails and Care Companion for natural “care partner” wording. Preserve user-authored text and source PDFs. The old message identifier and category are explicit one-release compatibility exceptions, documented below.

### 4. Console Data and safety

1. With the feature flag false, the admin tab/API must be unavailable. With it true, only an active CS Admin sees **CS Admin console**. Try the URL/API as a moderator and care partner; access must fail on the server.
2. In **Data**, inspect every registered table, search with mixed case, use a column filter, sort and paginate. Primary/actor IDs and timestamps are read-only; hashes/tokens never appear. Inspect foreign-key choices and enum/nullable controls. Existing event dates must display correctly and retain their value if unchanged.
3. Open a private-content row. It is masked until a reasoned **Reveal**; inspect the matching audit entry. Export CSV and verify clinical text stays masked and formula-like cells are quoted defensively.
4. Change disposable resource metadata with a reason of at least ten characters. Review the before/after and relationship impact, type the table name and confirm with a recent password check. Verify the stored change and append-only audit entry. Close nested dialogs by Escape and confirm keyboard focus returns to the original trigger.
5. Try invalid/self/last-admin role changes, a stale proposal, a modified confirmation token, more than 200 rows and a failing multi-row operation. Expect rejection/rollback. Retry an already successful confirmation: no repeated change or duplicate success audit.
6. Confirm protected/security/derived/consent tables are read-only. Never surface or enable production database reset.

### 5. Every typed action

Use disposable records and the **Actions** form, not a direct API script, for each group below. Each action requires a written reason, preview and typed table confirmation. Record the audit result. The automated browser run completed all 41 registry entries and the additional toggle/decision variants at both sizes.

| Group                       | Actions / variants                                                                                                                |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Discussions                 | Create, edit, delete; close and reopen; enable/disable reply moderation; toggle an upvote twice                                   |
| Replies and moderation      | Create/edit/delete reply; approve/reject/clinically redirect a pending post; approve/reject a pending reply                       |
| Private conversation        | Send a private post reply with its explicit publication choice; send a private message to the selected care partner               |
| Community                   | Create group; reassign the primary group and retain exactly one primary membership                                                |
| Accounts                    | Create account with recovery email; deactivate/reactivate; sign out everywhere; change role and restore it; send recovery link    |
| Invitations                 | Create, replace/resend, revoke; replacement revokes the previous token                                                            |
| Guides                      | Create draft, edit, approve, rebuild index, unpublish/republish, delete                                                           |
| Linked content              | Create/edit/delete resource; create/delete clinic update; create/delete event                                                     |
| Notifications / maintenance | Mark own notification read; retry failed email; purge expired invitations; purge expired resets; delete aged unreferenced uploads |

### 6. Preview, diagnostics and accessibility

1. In **Preview**, choose **Care partner view**, search a real test account by email/tag/name, supply an approved reason and start. The iframe must show that selected account and a read-only banner. Repeat with **Moderator view**.
2. Verify all non-GET requests carrying the preview header return `403 PREVIEW_READ_ONLY`, including auth writes. Private notes/messages and emails are masked; browsing must not mark messages read or acknowledge policies. Expired/revoked/mismatched tokens fail closed. Removing the header at a test proxy must never render the admin account as the selected user.
3. Run a **Diagnostics** query and inspect citations, chunks, actual retrieval scores, guide statistics and orphan-upload status. Rebuilding uses the guarded mutation flow. These technical tools must stay outside moderator/care-partner views.
4. Keyboard-check every changed dialog: accessible name, focus containment, inert background, Escape and focus restoration. Scrollable text/data panels must be keyboard-focusable. Check light/dark contrast, visible focus, at least 44 px action targets and no page-level horizontal overflow at 390 px. A wide database table may scroll inside its named region.

## Deployment and remaining verification

Back up PostgreSQL and uploaded files. Deploy matching frontend/backend artifacts, install standalone backend production dependencies, apply pending migrations through **013**, run compiled preflight, then restart the existing user service. The Hopkins server uses port 3003 and `systemctl --user restart ftdcare-api.service`; the generic local default remains 3000. Do not run seed/reset against production.

Keep the console off unless deliberately enabled. Apache/nginx must permit the API's `PUT`, `PATCH` and `DELETE` methods and pass `X-Preview-Token` unchanged without logging it. Keep ModSecurity enabled. Check protected PDFs and both preview roles through the public HTTPS hostname; direct localhost success cannot prove the live proxy configuration.

Production mail delivery/rendering, public-server WAF/SELinux configuration, physical phones, Safari/iOS, production load and institutional clinical/privacy approval are not established by this isolated Chromium run. The guideline wording still mentions FTD/young-onset dementias although AD is supported; policy meaning was preserved for owner review.

Terminology report counts in the isolated database were **0** for each of `resources`, `clinic_updates`, `calendar_events`, `cohorts` and `app_settings`. Production was not queried. Migration 013 changes only the exact known category key. The deprecated `caregiverId` API alias and legacy category normalizer remain for one release; the read-only terminology report necessarily includes the old search term. These are intentional exceptions to the requested zero-occurrence grep, not visible UI wording. No user-generated text or extracted source document was rewritten.

## Screenshots

All evidence uses synthetic local accounts. The [verification manifest](evidence/platform-update/verification.json) lists the selected evidence. The PR includes desktop/mobile screenshots of the guidelines gate, Guides, notifications, console Data/Diagnostics and both preview roles under `evidence/platform-update/`.

| Screen                         | Desktop                                                                                                                                          | Mobile                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Guidelines                     | [Top](evidence/platform-update/desktop-final-guidelines-top.png) / [acknowledgment](evidence/platform-update/desktop-final-guidelines-agree.png) | [Top](evidence/platform-update/mobile-final-guidelines-top.png) / [acknowledgment](evidence/platform-update/mobile-final-guidelines-agree.png) |
| Plain upload form              | [View](evidence/platform-update/desktop-final-guide-upload.png)                                                                                  | [View](evidence/platform-update/mobile-final-guide-upload.png)                                                                                 |
| Care-partner guide             | [View](evidence/platform-update/desktop-final-care-guide.png)                                                                                    | [View](evidence/platform-update/mobile-final-care-guide.png)                                                                                   |
| Moderator notifications        | [View](evidence/platform-update/desktop-final-notifications-moderator.png)                                                                       | [View](evidence/platform-update/mobile-final-notifications-moderator.png)                                                                      |
| Admin notifications            | [View](evidence/platform-update/desktop-final-notifications-admin.png)                                                                           | [View](evidence/platform-update/mobile-final-notifications-admin.png)                                                                          |
| Admin Data                     | [View](evidence/platform-update/desktop-final-data-editor.png)                                                                                   | [View](evidence/platform-update/mobile-final-data-editor.png)                                                                                  |
| Admin Diagnostics              | [View](evidence/platform-update/desktop-final-diagnostics.png)                                                                                   | [View](evidence/platform-update/mobile-final-diagnostics.png)                                                                                  |
| Read-only care partner preview | [View](evidence/platform-update/desktop-admin-preview-care.png)                                                                                  | [View](evidence/platform-update/mobile-admin-preview-care.png)                                                                                 |
| Read-only moderator preview    | [View](evidence/platform-update/desktop-admin-preview-moderator.png)                                                                             | [View](evidence/platform-update/mobile-admin-preview-moderator.png)                                                                            |
| Admin dark theme               | [View](evidence/platform-update/desktop-final-admin-dark.png)                                                                                    | [View](evidence/platform-update/mobile-final-admin-dark.png)                                                                                   |
