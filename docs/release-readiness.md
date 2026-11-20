# Release verification

This change addresses the browser audit of `0a6aefb` and the follow-up review of `7815e61`. The [historical workflow inventory](qa/workflow-audit-baseline.md) records the original scope and failures. The final verification results in this directory supersede that baseline; passing local checks is not a claim that the public deployment has been updated.

## Previous workflow verification (commit `8335b8d`)

For the subsequent deployment-hardening changes and their current validation, see [deployment verification](qa/deployment-verification.md). The figures below describe the prior full workflow run.

### Verification scope and evidence

The recorded browser run covers all 250 original audit checks plus 16 additional checks: **266 checks passed** in desktop/mobile Chromium. It uses fabricated accounts and isolated databases, the real application, and a local STARTTLS mail catcher. This includes ten checks of the production Docker image behind HTTPS nginx: all three roles, secure cookie attributes, submission/publication, and logout with session-cookie replay rejection.

- **31 frontend tests** and **38 backend tests** passed; backend coverage also passed on PostgreSQL 18 as well as 16, including legacy-password upgrade checks.
- Clean workspace installation, clean standalone backend installation/startup/compiled migrations, full production build, typecheck, lint, formatting, and Docker build passed.
- All **96 responsive layout checks** passed. The final main-screen accessibility run contains **72 light/dark scans with no detected violations**. All **40 open-dialog accessibility scans** passed with no detected violations, and all **14 dialog Escape checks** passed. Focus-containment and restoration are also covered by focused browser/unit checks.
- The HTTPS nginx checker passed for HTML, a generated JavaScript asset, and API health. A separate failure probe verifies PostgreSQL outages return HTTP 503 without creating a replacement embedded database.
- The dependency audit found no production vulnerabilities and no high/critical vulnerabilities in the full tree. Seven moderate advisories existed in development-only lint dependencies at that commit; the follow-up dependency update resolves them (see current deployment verification). This is a dated audit result, not a guarantee about future advisories.

See [the sanitized check manifest](qa/release-verification.json). Detailed scripts, logs and mock screenshots are retained in the task workspace under `/workspace/artifacts/ftd-release-verification/`. Tests that encountered stale selectors, duplicate mock fixtures, rate-limit windows or the workspace restart were corrected/rerun; the manifest records final verified results. High-volume automation used independent simulated client IPs for auth tests and restarted only the isolated test server between batches; application rate limits were not weakened.

This run does not establish real inbox delivery/rendering, Safari/iOS or physical-device behavior, production load capacity, clinical/legal approval, or the effective configuration of the public server. Those remain deployment gates below.

## Remediation checklist

| Finding                                          | Resolution                                                                                                                                                                                                    |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01: resource PDF discarded                      | Upload the PDF, persist its protected URL, and reject resource creation without a webpage or PDF source.                                                                                                      |
| F02: guide status ignored                        | Preserve the upstream transactional status/approval changes and verify draft/approve/pause/edit transitions.                                                                                                  |
| F03: queue private conversation missing          | Preserve upstream authorized private-thread serialization; verify both directions across users and refresh.                                                                                                   |
| F04: all-groups reassignment                     | Preserve upstream filter normalization; only care partners appear in the member-management list.                                                                                                              |
| F05: notification moderation                     | Preserve reply entity types and error feedback; require an explicit rejection reason/confirmation with in-flight protection.                                                                                  |
| F06: pasted invitation links                     | Normalize full links and raw codes before lookup and registration.                                                                                                                                            |
| F07–F09: notification freshness and destinations | Refresh on opening; preserve upstream contextual navigation; support resource URLs through login, reload, and browser navigation.                                                                             |
| F10–F12: permissions and recovery                | Guard staff rendering, normalize unknown tabs, show unavailable-discussion feedback, and expose feed errors with retry.                                                                                       |
| F13: dialog keyboard behavior                    | Share focus containment, background inertness, scroll locking, topmost Escape handling, and focus restoration.                                                                                                |
| F14: accessibility                               | Remove nested interactive feed cards, name form controls, and correct the audited contrast failures.                                                                                                          |
| F15: small-screen layout                         | Preserve upstream wrapping update filters; wrap PDF toolbars and truncate filenames without discarding their full accessible text.                                                                            |
| F16: effective security headers                  | Keep nginx header inheritance, protect direct production Express responses, and provide a read-only deployment checker. Public-origin verification remains a deployment gate.                                 |
| R1–R4: release packaging                         | Repair workspace/standalone dependency locks, package PGlite with the backend, forbid production embedded storage and automatic fallback, restore Node 24 pinning, and build the complete Docker application. |

Additional improvements make the assistant's retrieval-only results explicit, deduplicate citations, replace unsupported “doctor approved”/review-time promises, display the scheduling timezone, and consistently group calendar events by local date. Clinical policy wording, optional email preferences/digests, staff content-edit tools, and an invitation-management screen remain product decisions rather than claims of delivered functionality.

## Repeatable repository checks

Use Node 24 and an isolated PostgreSQL database. Set the database, JWT secret and local origin values in your shell or private test environment file; never run the seed or destructive integration tests against production.

```bash
npm ci
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
npm run backend:migrate
npm run backend:migrate
npm run backend:seed
npm run backend:test
npm audit --omit=dev
npm audit --audit-level=high
```

For backend-only deployment, copy `app/package.json`, `app/package-lock.json` and `app/dist/` into a clean staging folder and run `npm ci --omit=dev --workspaces=false` there. Verify compiled migrations and startup from that folder. No root dependencies or `tsx` should be required at runtime.

```bash
docker build -t ftdcare:release .
```

On networks that intercept TLS, provide the organization's trusted CA bundle using `--secret id=npm_ca,src=/secure/ca-bundle.pem`. The optional build secret is not copied into the image. Never disable certificate validation.

`DB_DRIVER` defaults to `postgres`. Development may explicitly choose `pglite` with a separate `PGLITE_DATA_DIR`; production refuses that driver. PostgreSQL connection failure must produce an unhealthy HTTP 503, never an apparently healthy replacement database.

## Local build transferred by SSH

Follow [the detailed artifact/SSH deployment runbook](deployment.md) for the current packaging and preflight commands.

Build and test one reviewed revision locally. Keep its commit ID with the release artifacts. Your existing layout is supported:

```text
/var/www/<domain>/
  html/                 frontend dist contents
  app/                  backend package manifests, node_modules/, dist/
  config/ftdcare.env     private production configuration
  public/resources/     bundled PDFs
  public/uploads/       persistent uploads, unless stored elsewhere
```

1. Back up PostgreSQL and uploaded documents. Save the previous frontend and backend artifacts for rollback.
2. Transfer the built frontend, compiled backend (including SQL migrations), backend package manifests, and bundled resources to a new staging/release directory. Exclude local `node_modules`, private environment files, test data, and uploads.
3. On the server, install backend production dependencies inside that staging `app/` with `npm ci --omit=dev --workspaces=false`. Run compiled migrations against the configured production database. In your existing directory layout, `npm run migrate:compiled` reads `../config/ftdcare.env`; a separate release directory needs an explicit `node --env-file=/secure/path/ftdcare.env dist/db/migrate.js` command.
4. Activate the frontend and backend from the same release. Prefer an atomic release-directory/symlink switch so clients cannot request a mixture of bundles while copying. If synchronizing `dist/` directly into `html/`, use `rsync -a --chmod=D755,F644 --delete dist/ html/` and retain prior hashed assets through any client/cache transition. Never use `--delete` against a parent directory containing configuration or uploads.
5. Restart the supervised backend; a single-process restart briefly interrupts API requests. Existing frontend pages remain served by nginx. A rolling/blue-green deployment is needed for an API handover without this interruption. Reload nginx only when its configuration changes, after `nginx -t` succeeds.
6. Complete the public-origin checks below. Roll back artifacts if checks fail; restore a database backup only with a considered data-recovery plan, because restoring discards newer writes. Migrations are not automatically reversible.

## Deployment gates

```bash
node scripts/check-deployment.mjs https://your-domain.example
```

This read-only check verifies successful HTML, a generated JavaScript asset, API health, and the presence of CSP, HSTS, MIME-sniffing protection and frame protection on all three responses. Inspect effective policy values and nginx logs as well. Ensure port 3000 is private to the proxy and the upload directory has no public filesystem alias.

Use test-only deployed accounts for each role to verify login/logout, invitation email → registration, password recovery → new-password login, care submission → staff private reply → author response → moderation → approved public reply, member reassignment, resource/PDF access and audience isolation, guide draft/approval, updates/events, and contextual notifications. Repeat on desktop and mobile, including keyboard navigation. Confirm SMTP delivery and actual Gmail/Outlook rendering; a local mail catcher cannot establish inbox placement.

Release approval also requires the institution's operational/privacy owner to confirm policy copy, support contacts, clinical review coverage, retention/backups, real mail delivery and deployment monitoring. Safari/iOS, physical-device behavior, production load and origin configuration require checks in those environments; local Chromium results do not establish them.
