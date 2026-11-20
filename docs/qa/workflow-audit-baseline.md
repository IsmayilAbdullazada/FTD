> Historical baseline from source `0a6aefb`, retained for the complete workflow inventory. Its failures are superseded by [release verification](../release-readiness.md). Artifact/evidence links below refer to the original audit workspace.

# Browser workflow and interface audit

**Date:** 20 November 2026 · **Source:** `0a6aefb` · **Application changes:** none; this delivery records the audit and evidence.

The application is **not ready for an “everything works” sign-off**. The audit executed **250 browser checks: 218 passed and 32 failed**. The failures represent 16 scenarios reproduced at both desktop and mobile sizes, with several sharing one underlying defect. The compiled production frontend passed all six role/viewport smoke checks. Existing automated suites also passed: 20 frontend tests and 36 backend tests.

The most consequential defects are discarded care-resource PDF uploads, guide approval/draft changes that are ignored, missing private replies in the moderation queue, broken quick moderation of replies, and member lists disappearing after reassignment.

## Completed audit checklist

- [x] Inventory the checked-in screens, role-specific actions, dialogs, and backend capabilities with no UI.
- [x] Create a separate PostgreSQL database, fabricated accounts and records, and a local STARTTLS mail catcher.
- [x] Test account access and recovery from invitation/email entry through the final signed-in or signed-out state.
- [x] Test care-partner, clinician, and administrator UI surfaces; carry discussion and moderation journeys across users.
- [x] Exercise validation, audience boundaries, pending/approved/rejected states, private dialogue, navigation, failures, and pagination.
- [x] Repeat the workflow matrix in desktop and mobile Chromium, inspect screenshots and email templates, and check keyboard behavior.
- [x] Run 96 additional responsive checks and 36 axe accessibility scans; inspect seven modal types in both viewports.
- [x] Build frontend and backend, run their existing tests, type-check, lint, and smoke-test the built frontend for all three roles.
- [x] Recheck suspected failures, correct test selectors/timing issues, and retain final results and reproduction evidence.
- [x] Make read-only checks of the deployed public page and health endpoint.

The audit is complete for this source snapshot and the scope below. Failed checks remain failed; no application fixes or deployment changes are included. The release checks at the end are still required after fixes.

## Scope, method, and limits

The functional matrix contains **122 workflow/validation scenarios**, each executed at **1440 × 1000** and **390 × 844**, plus six production-build role/viewport smoke checks. Tests use real Chromium, the real React application, Express routes, PostgreSQL 16, and captured local SMTP. Browser actions submit forms and operate controls; SQL creates edge-case fixtures and verifies persistence. These are not API-only substitutes for the user journeys.

Additional layout checks cover widths 320, 360, 390, 768, 844, 1024, 1280, and 1440, including a landscape phone size. Mobile means Chromium viewport/touch emulation, not a physical phone, Safari, or a soft-keyboard test. The production smoke run serves Vite's compiled output against the isolated backend; it does not reproduce the production nginx configuration or production cookie/TLS settings.

The inventory covers the user capabilities found in this commit. It does not claim to exhaust every possible input, timing, browser, data-volume, or role combination. Administrator controls were checked across every main workspace; full cross-user moderation journeys primarily use the clinician role. No production account was used and no production records were created, changed, or deleted. Email delivery tests terminate at a local relay, so they do not verify real inbox placement, spam filtering, or Gmail/Outlook rendering.

Test scripts, detailed JSON results, screenshots, and command logs are available in the task workspace at `/workspace/artifacts/ftd-workflow-audit/`. The sanitized result manifest is workflow-results.json (original audit artifact: `qa/workflow-results.json`). Screenshots committed with this report contain mock data. Test credential and mail-catcher files are outside the repository.

## Functional defects and reproduction steps

### F01 — A care-resource PDF is silently discarded — high priority

In **Guides & Care Sheets → Add Guide**, supply required text and an audience, choose a valid PDF, leave the external URL empty, and publish. The resource is created, but has no PDF badge or document link. A care partner cannot open the selected document. Reproduced on both screen sizes (120).

`useKnowledgeResources.handleCreateGuide` checks whether a file was selected but never uploads it or includes `fileAttachmentUrl` in the create request. The resource API also accepts a resource with neither source field. Upload the PDF, persist its protected URL, and reject source-less resources at the API boundary. Evidence (original audit artifact: `qa/evidence/resource-without-pdf.png`). Sources: `src/features/knowledge/hooks/useKnowledgeResources.ts`, `app/src/modules/resources/resources.routes.ts`.

### F02 — Guide review does not change approval status — high priority

Two directions fail: review an approved chatbot guide and click **Save as Draft** (93), or review a draft and click **Approve for chatbot** (136). The UI reports success, but the stored status stays unchanged. An approved guide remains eligible for retrieval after the user requested a draft; a draft approved through this dialog is still unavailable. The separate list's quick-approve button works.

The guide update schema accepts `status`, but the update SQL does not write it or apply approval metadata. Implement explicit, transactional transitions and use them from both entry points. Evidence (original audit artifact: `qa/evidence/guide-still-approved.png`). Source: `app/src/modules/guides/guides.routes.ts`.

### F03 — A private reply is missing from the moderator's queue view — high priority

A care partner submits a question; a clinician replies privately while keeping it pending; the author reads the note and replies. Both messages are stored and visible to the author. Reload the clinician queue and select that question: the conversation is absent (37).

The queue query/serializer does not return `moderatorPrivateNotes`. This is a queue-display defect, not a claim that the author cannot send messages. Return the authorized private conversation with queue items and preserve it after refresh. Evidence (original audit artifact: `qa/evidence/moderator-private-reply-missing.png`). Source: `app/src/modules/moderation/moderation.routes.ts`.

### F04 — Reassigning a member empties an unfiltered member list — high priority

Open **Members** with **All Groups**, search for a member, move them to a different regional group, and confirm. The move persists, but the list becomes empty and the user cannot make another move without recovering the view (51).

`handleConfirmReassign` calls `loadMembers('all')`; the API interprets it as an actual group ID. Normalize this sentinel to an omitted query parameter. Selecting a group card and clearing its filter was separately tested and works (137). Source: `src/features/community/hooks/useMemberManagement.ts`.

### F05 — Quick approve/reject fails for replies — high priority

Open staff notifications with a pending reply. Click **Approve** or **Reject** on its pending-submission card. The reply remains pending; failure is logged without useful action feedback (104, 105). Both handlers hardcode `entityType: 'POST'` when they must use the queue item's type. Quick actions on posts work (102, 103). Source: `src/features/notifications/components/NotificationsModal.tsx`.

### F06 — “Invite code or link” accepts only a code — medium priority

Issue a valid invitation and paste its complete URL into the registration field advertised as accepting a code or link. Continue shows an invalid/expired invitation instead of the registration form (124). Opening that URL directly works; pasting just its token also works and assigns the correct AD community (132).

Normalize full URLs to their token before lookup and before registration. Preserve useful validation for malformed links. Evidence (original audit artifact: `qa/evidence/invite-full-url-rejected.png`). Sources: `src/features/auth/hooks/useAuthScreens.ts`, `src/features/auth/api/authApi.ts`.

### F07 — Opening notifications does not refresh them — medium priority

Leave a signed-in page open, deliver a new notification, then open the notification center. The new item is absent until a full refresh or another action reloads bootstrap data (101). Fetch fresh notifications when opening the inbox; choose polling or another update mechanism only if the product needs it. Source: `src/app/hooks/useAppController.ts`.

### F08 — A notification does not navigate to its discussion — medium priority

Open an approval notification and click **Open Discussions**. The general feed opens rather than the relevant discussion (106). With several posts or a private moderation response, the user must find the affected record manually. Carry the associated post ID through the notification contract and navigate using it; synchronize the URL. Sources: `src/features/notifications/components/NotificationsModal.tsx`, `src/app/hooks/useAppController.ts`.

### F09 — Direct resource links do not open the resource — medium priority

Visit `/?tab=knowledge&resource=<valid-resource-id>`. The library renders but its requested guide inspector does not open (130). The app location parser does not read the resource parameter. Parse and apply the resource ID, including after sign-in and browser navigation. Source: `src/app/lib/appLocation.ts`.

### F10 — A care partner can render the staff workspace — medium priority

As a care partner, visit `/?tab=moderation`. The Dashboard and staff action buttons appear, although staff-only API calls are rejected (84). This is a frontend authorization/navigation defect; these checks did not demonstrate access to protected staff data. Guard staff routes before rendering and fall back to a permitted screen. Source: `src/app/App.tsx`.

### F11 — A failed feed request looks like an empty community — medium priority

Abort the feed's posts request and reload. The shell survives, but the UI presents an empty-feed state without explaining the failure or offering Retry (135). A later reload recovers. Model loading, empty, and error states separately. Evidence (original audit artifact: `qa/evidence/network-empty-state.png`). Source: `src/features/discussions/hooks/useCarePartnerFeed.ts`.

### F12 — Unknown and missing destinations lack a useful recovery state — medium priority

An unknown `tab` leaves the main content blank (100). A missing/deleted discussion link silently falls back to the feed with no explanation (131). Provide a permitted fallback for unknown tabs and a clear unavailable-discussion state with a return action. Sources: `src/app/App.tsx`, `src/features/discussions/hooks/useCarePartnerFeed.ts`.

## Interface and accessibility findings

### F13 — Dialog keyboard behavior is incomplete — medium priority

Escape did not close the policy modal (74), invitation, audit ledger, add-update, add-event, create-group, create-post, or notification overlay in the dedicated keyboard checks. `useDialogFocus` sets initial focus and restores it on unmount, but does not trap focus or implement Escape dismissal. Several custom overlays also omit dialog semantics or accessible close-button names.

Use a consistent accessible dialog primitive with a name, initial focus, focus containment, Escape behavior, focus restoration, and background inertness. Prevent dismissal during irreversible in-flight operations where appropriate; do not simply attach a global Escape handler to every nested dialog. See the [ARIA modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

### F14 — Automated accessibility checks identify concrete failures — medium priority

The 36 axe scans checked WCAG A/AA tags across anonymous, care-partner, clinician, and admin main screens in both viewports. Reported rule occurrences across scans were: `color-contrast` 16, `select-name` 10, `nested-interactive` 6, and `button-name` 2. These are repeated scan occurrences, not 34 independent defects.

Examples include the unnamed show-password button, unlabeled composer/member selectors, interactive controls nested inside clickable discussion cards, and low-contrast secondary text/calendar dates. Measured examples were approximately **2.56–2.63:1**, below the applicable **4.5:1** text requirement. Many management labels use 10–12 px text, which also merits a readability review for this audience. Automated scans do not establish full WCAG compliance. See [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

### F15 — Staff update filters overflow narrow phones — medium priority

At widths **320 and 360 px**, the staff Updates screen becomes **380 px** wide because its topic/condition filters cannot fit. The 390 px workflow viewport passes, which is why the smaller-width sweep matters. Stack or wrap the filter controls. The other 94 responsive checks did not detect document-level horizontal overflow. Evidence (original audit artifact: `qa/evidence/mobile-updates-overflow.png`).

The mobile PDF review toolbar also wraps a short filename into several fragments, while status text runs into **Check text**. It remains operable but looks cramped. Give the filename a predictable truncation area and move secondary metadata onto a separate row. The embedded PDF panel was not treated as verified mobile-native PDF rendering in headless Chromium. Evidence (original audit artifact: `qa/evidence/mobile-pdf-review.png`).

### F16 — Public HTML headers need deployment verification — high priority for deployment review

Read-only HTTPS requests to the deployed `/` and `/api/v1/health` both returned 200. The public HTML response did not include CSP, HSTS, `X-Content-Type-Options`, or `X-Frame-Options`; the API response did include them. Verify the effective response at the origin and configure security headers on frontend HTML and asset/error locations as appropriate. API middleware headers do not protect a document served separately by the web server. See the [OWASP HTTP Headers guidance](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html).

These requests traverse the managed Cloud network proxy, so the observation is not a diagnosis of a specific origin-server configuration line. Chromium initially could not trust that proxy's certificate; anonymous visual inspection was repeated with certificate validation bypassed. No credentials were sent. Do not interpret this as evidence that the site's public certificate is invalid.

## Workflows and wording that deserve product decisions

These are recommendations, not claims that one universal industry design is mandatory.

| Area                      | Current behavior                                                                                                                                                                               | Recommended practice for this application                                                                                                                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Quick rejection           | Every quick rejection uses the medication/dosing reason and tells the author to contact Dr. Seema's team, even for unrelated text.                                                             | Ask for an accurate reason and optional feedback, or remove the one-click reject shortcut.                                                                                                                                                                   |
| Clinical/privacy claims   | The footer calls its copy an “Official Compliance Statement,” names HIPAA compliance, and promises TLS 1.3/institutional safeguards. The resource library labels everything “Doctor approved.” | Link to institution-approved policies and make only claims verified for this deployment and content-approval process. An admin publishing a resource is not evidence of physician review.                                                                    |
| Two guide workflows       | “Add Guide” in the library and “Upload Guide” in the dashboard create different entities with different approval rules.                                                                        | Name them by purpose, such as “Care Library” and “Assistant Sources,” or define one source-of-truth workflow if that fits the product. Distinct stores can be valid, but their ownership and publication effects must be clear.                              |
| Assistant expectations    | The backend currently returns retrieval links/chunks with an empty answer; unmatched queries leave a bare create-discussion action. Staff wording still refers to “Dr. Seema's Assistant.”     | Describe it consistently as a guide finder if that is the intended behavior; give an explicit no-match explanation and deduplicate source citations by document/page. Do not imply a personal clinical response or synthesized answer that is not generated. |
| Notification destinations | Generic “Open Discussions” does not tell the user which action to take.                                                                                                                        | Use “View your discussion,” “Read private feedback,” or “Review this reply,” with the correct destination and permission checks.                                                                                                                             |
| Email volume              | Submission receipts, review outcomes, and conversation events can generate several emails per interaction; there is no notification-preference screen.                                         | Keep security emails mandatory and consider preferences/digests for optional community activity. Preserve generic email content that avoids unnecessary health details.                                                                                      |
| Profile menu              | “SWITCH TEST PERSONA” appears with the current-user entry even when development personas are disabled; logout is “Sign Out / Lock Session.”                                                    | Hide development-only controls and use “Sign out” unless a distinct lock/re-authentication capability exists.                                                                                                                                                |
| Guide counters            | The dashboard counts `isActive` drafts as “active,” while the guide list correctly separates drafts from approved/active sources.                                                              | Use the same approved-and-active predicate for the dashboard count and retrieval eligibility.                                                                                                                                                                |
| Review promise            | The composer promises review within 24 hours.                                                                                                                                                  | Keep this only if the clinical team has agreed on coverage, weekends, holidays, and escalation wording.                                                                                                                                                      |
| Event scheduling          | Event times use the browser's local date/time without a prominently stated timezone.                                                                                                           | State the scheduling timezone for a geographically distributed community, especially when staff travel.                                                                                                                                                      |
| Content maintenance       | Updates/events/resources have create/delete UI paths but no edit path; invitation revoke/expiry management has backend support without a management interface.                                 | Decide which maintenance actions staff need before launch; avoid deletion/recreation as the routine correction workflow.                                                                                                                                     |

Appropriate existing choices include invitation-only enrollment, database-backed neutral anonymous tags, moderated publication, generic activity emails without post/private-message content, single-use expiring password-reset links, and session revocation on logout/reset. A link-only reset is consistent with [OWASP recovery guidance](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html). A production decision still needs to consider the deployment and clinical team's requirements.

## Screen and capability inventory

| Area                       | User-facing capabilities covered                                                                                                                                                                                                                                                                                                                                       | Matrix references                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Account access             | Anonymous entry; invalid/unknown credentials; patient ID; show/hide password; remember me; direct/manual invitation; valid, invalid, consumed, expired and revoked invitations; FTD/AD assignment; forgot/reset validation; delivered reset link; consumed/expired reset; login; logout/session revocation; inactivity warning, stay signed in, sign out now, timeout. | 01–08, 30–34, 86, 109–110, 121–124, 129, 132–134, 141, 144  |
| Shared shell               | Role landing/navigation, browser back/forward, logo/main tabs, profile/My Posts, clinic telephone links, themes/persistence, notifications, policies, responsive layout, error boundary/reload. Telephone/email-app links were inspected, not used to place calls or launch a real mail client.                                                                        | 14–15, 20–22, 70–75, 81–85, 98–100, 117, production smoke   |
| Discussion authoring       | Composer validation/cancel; submit/success; ask another; similar discussion preview and resolution; assistant handoff with draft preserved; group/audience; pending edit and withdrawal from detail and feed.                                                                                                                                                          | 13, 35–36, 41, 43, 80, 95, 107–108, 125, 138, 140, 143      |
| Discussion reading/replies | Audience isolation; search/empty/recovery; group/status filtering; detail/back/deep links; helpful toggle; pending reply, approve/reject, nested replies, edit/cancel reply, collapse, open-reply policy, removal, close/reopen and closed-state reply prevention.                                                                                                     | 08–12, 38–42, 76–79, 95–99, 111–112, 126, 129, 131, 138–140 |
| Moderation                 | Empty/populated queue, selection, refresh/pagination, publication, redaction/manual public-text edits, audience/group changes, rejection, private keep-pending conversation, private-plus-publish, action ledger, notification quick actions.                                                                                                                          | 37–40, 42, 52, 95–97, 102–105, 116, 126                     |
| Community                  | Create group, browse groups, group-to-members navigation, member search, group filters, reassignment, condition filters represented by staff audience controls, pagination.                                                                                                                                                                                            | 50–51, 98, 113–114, 137                                     |
| Knowledge/resources        | Care-library search/categories/detail/source links; staff creation/deletion with URL or selected PDF; PDF browser popup; audience isolation; invalid PDF; PDF/text extraction; deliberate condition selection; draft/approve/pause/activate/review/edit/delete; retrieval test; citation links; inspector page/metadata controls.                                      | 16–17, 57–63, 90–94, 115, 118–120, 130, 136, 142            |
| Care Companion             | Introduction/open/close; disclaimer; request; no-match/discussion handoff; restart; citations/PDF navigation; condition filtering; composer preservation.                                                                                                                                                                                                              | 21, 80–81, 92, 108                                          |
| Clinic updates             | Empty/search/category/audience state; create, read detail/source URL, delete/cancel; recruiting clinical-trial variant.                                                                                                                                                                                                                                                | 18, 53–54, 127                                              |
| Events                     | Month navigation, today, date selection, selected-day form, creation, care visibility, deletion/cancel.                                                                                                                                                                                                                                                                | 19, 55–56, 128                                              |
| Notifications/email        | Submission/review/private/reply activity, local SMTP delivery, anonymous reset behavior, inbox/read persistence, freshness, quick moderation, destinations; captured HTML preview in light/dark browser color schemes. Backend notification tests cover further activity/recipient rules.                                                                              | 30, 33, 37–40, 75, 92, 101–106, 141                         |

No standalone private-message inbox or admin control-panel UI exists in this commit. `/chat/private`, admin APIs, invitation revocation, database operations, and some backend activity events therefore cannot have an end-to-end browser workflow invented for them. Backend integration tests exercise supported API behavior; the lack of a UI is recorded as a product-scope decision, not silently counted as a passing browser journey. There is also no account-settings, notification-preferences, or content-edit interface to test.

## Full executed browser matrix

Each numeric row corresponds to `D<number>` and `M<number>` in the result manifest. **FAIL means the scenario was executed and exposed the linked finding; it does not mean it was skipped.** Desktop and mobile show the final verified attempt after correcting selector, fixture, timing, and rate-limit interruptions. Matrix failure totals do not include the separate accessibility/layout scans.

| ID          | Scenario and final outcome                                                                           | Desktop | Mobile | Finding |
| ----------- | ---------------------------------------------------------------------------------------------------- | ------- | ------ | ------- |
| 001         | Anonymous landing; login form; no false session-expired message                                      | PASS    | PASS   |         |
| 002         | Wrong password stays on login and shows credential error                                             | PASS    | PASS   |         |
| 003         | Unknown account handled as invalid credentials                                                       | PASS    | PASS   |         |
| 004         | Invitation link with invalid token shows useful rejection                                            | PASS    | PASS   |         |
| 005         | Forgot-password form accepts unknown account without disclosing existence                            | PASS    | PASS   |         |
| 006         | Reset link with invalid token cannot change a password                                               | PASS    | PASS   |         |
| 007         | Care-partner signs in and feed renders                                                               | PASS    | PASS   |         |
| 008         | Feed audience: AD regional topic is hidden from FTD care partner                                     | PASS    | PASS   |         |
| 009         | Search matches and empty results recover after clearing                                              | PASS    | PASS   |         |
| 010         | Feed filters open, group selection works, and filters can close                                      | PASS    | PASS   |         |
| 011         | Discussion opens from feed; back restores feed                                                       | PASS    | PASS   |         |
| 012         | Helpful vote toggles and persists through reload                                                     | PASS    | PASS   |         |
| 013         | Compose: empty submit disabled, cancellation works                                                   | PASS    | PASS   |         |
| 014         | Shared clinic contacts open with phone links                                                         | PASS    | PASS   |         |
| 015         | Light/dark theme changes and persists after reload                                                   | PASS    | PASS   |         |
| 016         | Guides browse, text search, empty search and topic filtering                                         | PASS    | PASS   |         |
| 017         | Guide opens with content and PDF link                                                                | PASS    | PASS   |         |
| 018         | Updates search/filter empty result and recovery                                                      | PASS    | PASS   |         |
| 019         | Calendar month navigation, today and date selection                                                  | PASS    | PASS   |         |
| 020         | Care role hides staff creation and management controls                                               | PASS    | PASS   |         |
| 021         | Care Companion opens, disclaimer toggles, closes                                                     | PASS    | PASS   |         |
| 022         | Responsive shared pages have no document horizontal overflow                                         | PASS    | PASS   |         |
| 030         | Staff sends invitation; success URL and delivered email are usable                                   | PASS    | PASS   |         |
| 031         | New logged-out invitee registers, gets stored anonymous tag, remains signed in                       | PASS    | PASS   |         |
| 032         | Used invitation cannot register a second account                                                     | PASS    | PASS   |         |
| 033         | Recovery email → mismatched passwords validation → reset → new-password login                        | PASS    | PASS   |         |
| 034         | Consumed password-reset link is rejected                                                             | PASS    | PASS   |         |
| 035         | Care submits question and sees pending status in My Posts                                            | PASS    | PASS   |         |
| 036         | Author edits pending question and saves changes                                                      | PASS    | PASS   |         |
| 037         | Moderator private guidance reaches author; author replies back while post remains pending            | FAIL    | FAIL   | F03     |
| 038         | Moderator publishes question; author sees published discussion and email link                        | PASS    | PASS   |         |
| 039         | Care reply → moderation queue → publish → public discussion                                          | PASS    | PASS   |         |
| 040         | Moderator rejects a question with reason; rejection is persisted                                     | PASS    | PASS   |         |
| 041         | Care cancels pending submission through confirmation dialog                                          | PASS    | PASS   |         |
| 042         | Staff closes discussion; care cannot reply; staff reopens it                                         | PASS    | PASS   |         |
| 043         | Staff creates immediately published discussion with explicit group/audience                          | PASS    | PASS   |         |
| 050         | Staff creates regional group and sees it in Groups                                                   | PASS    | PASS   |         |
| 051         | Member search → move regional group → confirm → move back                                            | FAIL    | FAIL   | F04     |
| 052         | Staff opens audit ledger with moderation actions                                                     | PASS    | PASS   |         |
| 053         | Staff publishes update → care partner reads details and source link                                  | PASS    | PASS   |         |
| 054         | Update deletion confirmation can cancel, then deletes successfully                                   | PASS    | PASS   |         |
| 055         | Staff adds calendar event; care partner sees correct date and details                                | PASS    | PASS   |         |
| 056         | Calendar event deletion cancel and confirm                                                           | PASS    | PASS   |         |
| 057         | Staff publishes care guide; care partner reads its content                                           | PASS    | PASS   |         |
| 058         | Staff deletes published care resource with confirmation                                              | PASS    | PASS   |         |
| 059         | Staff uploads real PDF, reviews extracted pages, explicitly selects audience, saves draft            | PASS    | PASS   |         |
| 060         | Approve draft PDF for assistant                                                                      | PASS    | PASS   |         |
| 061         | Pause and reactivate approved guide                                                                  | PASS    | PASS   |         |
| 062         | Staff runs guide retrieval test query                                                                | PASS    | PASS   |         |
| 063         | Staff deletes uploaded chatbot guide through confirmation                                            | PASS    | PASS   |         |
| 070         | Footer: Privacy Policy opens and closes                                                              | PASS    | PASS   |         |
| 071         | Footer: Notice of Privacy Practices opens and closes                                                 | PASS    | PASS   |         |
| 072         | Footer: Non-Discrimination Policy opens and closes                                                   | PASS    | PASS   |         |
| 073         | Footer: Patient Rights opens and closes                                                              | PASS    | PASS   |         |
| 074         | Footer policy dialog closes on Escape and returns focus                                              | FAIL    | FAIL   | F13     |
| 075         | Notification click marks read in database and persists after reload                                  | PASS    | PASS   |         |
| 076         | Staff reply publishes immediately; care replies to that reply in correct thread                      | PASS    | PASS   |         |
| 077         | Care edits a pending nested reply                                                                    | PASS    | PASS   |         |
| 078         | Care cancels pending reply                                                                           | PASS    | PASS   |         |
| 079         | Open reply policy publishes care reply immediately; staff removes inappropriate reply                | PASS    | PASS   |         |
| 080         | Assistant question → honest no-match answer → create discussion with preserved draft                 | PASS    | PASS   |         |
| 081         | Assistant conversation can restart and close                                                         | PASS    | PASS   |         |
| 082         | Feed network failure preserves shell; reload recovers                                                | PASS    | PASS   |         |
| 083         | Navigation responds to browser Back and Forward                                                      | PASS    | PASS   |         |
| 084         | Care partner cannot open staff dashboard via crafted tab URL                                         | FAIL    | FAIL   | F10     |
| 085         | Profile menu opens; My Posts shows own submissions and status                                        | PASS    | PASS   |         |
| 086         | Inactivity warning → stay signed in → later timeout returns to login                                 | PASS    | PASS   |         |
| 090         | Upload/extract PDF and save draft for lifecycle tests                                                | PASS    | PASS   |         |
| 091         | Side-by-side review edits title without creating duplicate guide                                     | PASS    | PASS   |         |
| 092         | Care opens cited PDF in browser; AD care partner does not receive FTD-only guide                     | PASS    | PASS   |         |
| 093         | Moving an approved guide back to draft removes it from assistant use                                 | FAIL    | FAIL   | F02     |
| 094         | Delete lifecycle PDF guide after review                                                              | PASS    | PASS   |         |
| 095         | Moderator removes detected personal details, edits public text, changes audience/group and publishes | PASS    | PASS   |         |
| 096         | Private reply + publish is audited and private guidance stays hidden from other users                | PASS    | PASS   |         |
| 097         | Moderator rejects a pending reply; another care partner cannot see it                                | PASS    | PASS   |         |
| 098         | Administrator can enter each staff workspace and sees expected management controls                   | PASS    | PASS   |         |
| 099         | AD care partner sees AD regional discussion; FTD-only regional content remains hidden                | PASS    | PASS   |         |
| 100         | Unknown tab URL falls back to a useful screen                                                        | FAIL    | FAIL   | F12     |
| 101         | Opening notifications fetches notifications received while the app was already open                  | FAIL    | FAIL   | F07     |
| 102         | Moderator quick-approves a post through its notification queue card                                  | PASS    | PASS   |         |
| 103         | Moderator quick-rejects post from notifications                                                      | PASS    | PASS   |         |
| 104         | Moderator quick-approves a reply from notifications                                                  | FAIL    | FAIL   | F05     |
| 105         | Moderator quick-rejects a reply from notifications                                                   | FAIL    | FAIL   | F05     |
| 106         | Open notification takes user directly to its associated discussion                                   | FAIL    | FAIL   | F08     |
| 107         | Composer suggests existing discussion → preview → resolved without duplicate post                    | PASS    | PASS   |         |
| 108         | Opening assistant from composer preserves the current draft                                          | PASS    | PASS   |         |
| 109         | Expired invitation cannot register                                                                   | PASS    | PASS   |         |
| 110         | Revoked invitation cannot register                                                                   | PASS    | PASS   |         |
| 111         | Feed pagination next/previous, first-page boundary, and search across all pages                      | PASS    | PASS   |         |
| 112         | Staff discussion-list pagination                                                                     | PASS    | PASS   |         |
| 113         | Groups pagination advances and returns to first page                                                 | PASS    | PASS   |         |
| 114         | Members pagination and search reset to first matching page                                           | PASS    | PASS   |         |
| 115         | Guides pagination, search and reset                                                                  | PASS    | PASS   |         |
| 116         | Moderation queue pagination, refresh, and first-page boundary                                        | PASS    | PASS   |         |
| 117         | Real App render failure reaches error boundary; Reload page recovers                                 | PASS    | PASS   |         |
| 118         | Invalid PDF produces a recoverable error and cannot be approved                                      | PASS    | PASS   |         |
| 119         | Text guide import requires deliberate audience selection and can save a draft                        | PASS    | PASS   |         |
| 120         | Publish care resource with uploaded PDF; care partner can open its protected file                    | FAIL    | FAIL   | F01     |
| 121         | Empty login validation, show/hide password, and nonpersistent session cookie                         | PASS    | PASS   |         |
| 122         | Care partner can sign in with clinic patient ID                                                      | PASS    | PASS   |         |
| 123         | Remember me sets an expiring persistent cookie                                                       | PASS    | PASS   |         |
| 124         | Registration field advertised as code or link accepts a valid full invitation URL                    | FAIL    | FAIL   | F06     |
| 125         | Care edits and withdraws pending question directly from its feed card                                | PASS    | PASS   |         |
| 126         | Discussion-management tab closes and reopens a searched discussion                                   | PASS    | PASS   |         |
| 127         | Clinical-trial update includes recruiting status and source URL                                      | PASS    | PASS   |         |
| 128         | Calendar selection pre-fills the chosen event date; cancel leaves no record                          | PASS    | PASS   |         |
| 129         | Logged-out discussion email/deep link survives login and reload                                      | PASS    | PASS   |         |
| 130         | Direct resource URL opens the requested guide inspector                                              | FAIL    | FAIL   | F09     |
| 131         | Missing discussion link explains that the discussion is unavailable                                  | FAIL    | FAIL   | F12     |
| 132         | Pasting only invitation token works and registers an AD care partner                                 | PASS    | PASS   |         |
| 133         | Expired reset link rejects a password change                                                         | PASS    | PASS   |         |
| 134         | Sign out removes cookie and a second browser using the old session cannot access the app             | PASS    | PASS   |         |
| 135         | Feed network error is explained and offers recovery instead of an empty-state message                | FAIL    | FAIL   | F11     |
| 136         | Draft guide approved from review dialog actually becomes approved                                    | FAIL    | FAIL   | F02     |
| 137         | Group card opens its members; clearing group filter shows all members                                | PASS    | PASS   |         |
| 138         | Discussion-management reply policy toggles and persists                                              | PASS    | PASS   |         |
| 139         | Nested reply thread collapses and expands with correct accessibility state                           | PASS    | PASS   |         |
| 140         | User-supplied HTML-like text is displayed as text and never executed                                 | PASS    | PASS   |         |
| 141         | Invitation copy uses browser clipboard; mail-app link and send-another reset work                    | PASS    | PASS   |         |
| 142         | PDF reviewer inspects extracted page two, edits optional topic, and discards safely                  | PASS    | PASS   |         |
| 143         | After successful submission, Ask Another Question clears the previous draft                          | PASS    | PASS   |         |
| 144         | Session warning offers immediate Sign Out Now                                                        | PASS    | PASS   |         |
| P-care      | Compiled production frontend: care login and all permitted main screens                              | PASS    | PASS   |         |
| P-clinician | Compiled production frontend: clinician login and all permitted main screens                         | PASS    | PASS   |         |
| P-admin     | Compiled production frontend: admin login and all permitted main screens                             | PASS    | PASS   |         |

## Verification and deployment observations

| Check                                         | Result                            | What it establishes                                                                                                                                                                                |
| --------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                               | PASS                              | Vite production output builds. Main JS about 303.69 kB raw / 89.57 kB gzip; separate role/feature chunks remain.                                                                                   |
| `npm --prefix app run build`                  | PASS                              | Backend TypeScript and migration assets compile.                                                                                                                                                   |
| `npm run typecheck`                           | PASS                              | Frontend type-check succeeds.                                                                                                                                                                      |
| `npm run lint:eslint`                         | PASS                              | Configured frontend/backend lint checks succeed.                                                                                                                                                   |
| `npm test`                                    | 20/20 PASS                        | Existing frontend automated tests succeed.                                                                                                                                                         |
| Backend Node test suite                       | 36/36 PASS, none skipped          | Existing backend tests run against a separate migrated and seeded PostgreSQL 16 regression database, isolated from browser fixtures.                                                               |
| Built frontend, three roles × two viewports   | 6/6 PASS                          | Built asset loading, login, and all permitted main screens render; no unexpected page-error events observed. This is a smoke check, not a repeat of every mutation against the built bundle.       |
| Responsive sweep                              | 94/96 without horizontal overflow | Two staff Updates failures at 320/360 px; no blanket visual-compliance claim.                                                                                                                      |
| Accessibility                                 | Findings in 36 scans              | Concrete failures in F14; not a complete accessibility certification.                                                                                                                              |
| Captured activity email HTML                  | Light/dark previews inspected     | Browser previews of actual generated mail; no real mail-client or inbox-delivery certification.                                                                                                    |
| Deployed anonymous page                       | Desktop/mobile login visible      | No false session-expired warning, unexpected page-error events, third-party network requests, or document overflow in these anonymous views. Cloud proxy certificate handling is described in F16. |
| Deployed health                               | 200, database connected           | A point-in-time health observation, not an uptime/load assertion.                                                                                                                                  |
| Auth throttling during repeated test sign-ins | 429 with a useful warning         | The configured auth limiter is active. The test backend was restarted between large batches to reset in-memory limits; this is not a normal-use performance benchmark.                             |

The local SMTP relay captured invitations, recovery mail, and activity messages without sending any email outside the test environment. Database migrations were applied to the isolated databases. The existing migration/upgrade, reset concurrency, upload access/cleanup, stored-tag uniqueness, notification-recipient, and email-redaction tests also passed.

## Prioritized follow-up checklist

These are application/deployment fixes identified by the audit, **not completed changes**.

- [ ] Fix resource PDF upload/persistence and enforce a resource source at the API boundary (F01).
- [ ] Implement consistent guide status transitions, audit metadata, retrieval eligibility, and accurate success messages (F02).
- [ ] Return private conversations in the authorized moderation queue (F03).
- [ ] Normalize the unfiltered group value after member reassignment (F04).
- [ ] Pass correct entity types to quick moderation; ask for accurate rejection feedback (F05).
- [ ] Accept and normalize full invitation URLs in the manual form (F06).
- [ ] Refresh notifications on open and provide precise navigation targets (F07–F09).
- [ ] Guard staff views and add useful unknown/missing/error states (F10–F12).
- [ ] Standardize accessible dialogs, form names, interactive-card structure, and text contrast (F13–F14).
- [ ] Fix narrow-phone update filters and PDF review toolbar layout (F15).
- [ ] Verify effective frontend security headers at the deployed origin (F16).
- [ ] Confirm institutional policy/clinical claims, review expectations, email preferences, and the intended assistant/content workflows with the product owners.

## Release verification still required

- [ ] After fixes, rerun every failed browser scenario plus the affected passing journeys and automated suites.
- [ ] Run authenticated smoke tests on the deployed website using designated test accounts, including invitation email, password recovery, moderation, private replies, notifications, and protected PDFs.
- [ ] Verify actual SMTP delivery and templates in the email clients the team supports.
- [ ] Verify certificate chain, frontend/API security headers, secure cookies, proxy routing, and upload permissions at the deployment origin.
- [ ] Test physical iOS/Safari and Android browsers, real soft keyboards, zoom, and keyboard/screen-reader workflows.
- [ ] Decide a realistic shared-IP/staff concurrency target and run a controlled load test; the repeated audit requests are not such a test.

The audit did not publish, push, or modify the deployed application. Temporary audit services/databases are removed after evidence collection; repeat testing needs fresh isolated fixtures. The detailed scripts are task artifacts, not a newly installed CI browser suite. Promoting the important regression journeys into maintained automation should accompany their fixes.
