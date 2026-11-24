# Hopkins Care Partner Connect

A full-stack application for frontotemporal dementia (FTD) and Alzheimer's care communities. Care partners participate in condition- and cohort-scoped discussions, while clinicians moderate submissions, manage educational guides, and provide private replies.

The frontend uses React 19, TypeScript, Vite, and Tailwind CSS. The backend uses Express, TypeScript, PostgreSQL, Zod, and cookie-based authentication. Knowledge responses retrieve content from stored guides and discussions; the current implementation does not generate responses with an external language model.

## Contents

- [Getting started](#getting-started)
- [Project structure](#project-structure)
- [Configuration](#configuration)
- [Roles and account access](#roles-and-account-access)
- [Development commands](#development-commands)
- [Testing and CI](#testing-and-ci)
- [API conventions](#api-conventions)
- [Email notifications](#email-notifications)
- [Guides and community guidelines](#guides-and-community-guidelines)
- [CS Admin console](#cs-admin-console)
- [Database and file storage](#database-and-file-storage)
- [Production deployment](#production-deployment)
- [Operations and troubleshooting](#operations-and-troubleshooting)
- [Contributing](#contributing)

## Getting started

### Prerequisites

- Node.js **24**, as specified in [.nvmrc](.nvmrc), and npm.
- PostgreSQL **16 or 18**, with permission to create the `pgcrypto` extension in the application database.
- An SMTP relay with TLS that permits mail from your server for invitations and password recovery. The app can start without SMTP, but email-based account activation and recovery require working delivery.

Run commands from the repository root unless stated otherwise. Local development and deployment scripts assume a Unix-like shell. Clone the repository and enter it before proceeding:

```bash
git clone https://github.com/IsmayilAbdullazada/FTD.git
cd FTD
```

### Install and configure

```bash
npm ci
cp config/ftdcare.env.example config/ftdcare.env
```

Create the application database and role using your PostgreSQL administrator account. For example, with PostgreSQL administrator access configured for these tools:

```bash
createuser --pwprompt ftdcare_user
createdb --owner=ftdcare_user ftdcare_db
```

Edit `config/ftdcare.env` with the matching database credentials, SMTP settings, and a unique signing secret. Generate a secret with:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
```

Use the generated value for `JWT_SECRET`. Environment files containing credentials are ignored by Git.

### Initialize and run

```bash
npm run backend:migrate
npm run backend:seed
npm run dev
```

| Service               | Local address                       |
| --------------------- | ----------------------------------- |
| Frontend              | http://localhost:5173               |
| Backend API           | http://localhost:3000/api/v1        |
| Database health check | http://localhost:3000/api/v1/health |

Vite proxies `/api` and `/uploads/guides` to the backend. Use `localhost` consistently with `APP_URL` and `CORS_ORIGIN` so cookies and origin checks agree. Both development processes stop when you stop `npm run dev`.

Seeded accounts have random, unrecoverable initial passwords. There is no shared demo password. Follow [Roles and account access](#roles-and-account-access) to configure a local staff account before attempting to sign in.

## Project structure

```text
src/                         React frontend
  app/                       Application shell, providers, navigation, orchestration
  features/                  Domain-owned components, hooks, API adapters, and types
  shared/                    Reusable UI, HTTP transport, hooks, and pure helpers
  types/                     Cross-feature contracts
app/                         Backend package, with its own dependency lockfile
  src/
    config/                  Validated runtime configuration and database connection
    db/migrations/           Numbered SQL migrations
    middleware/              Authentication, origin protection, rate limits, errors
    modules/                 Domain routes, services, and queries
    services/                Mail delivery, recovery jobs, upload lifecycle
  tests/                     Backend integration and regression tests
config/                      Environment template and nginx configuration
public/                      Bundled resources, fonts, and static assets
scripts/                     Development process launcher
docs/                        Supporting architecture documentation
```

Feature code owns its domain behavior; `shared` contains infrastructure and components used across features. See the [frontend refactoring guide](docs/frontend-refactoring.md) for ownership boundaries. Frontend build output goes to `dist/`; compiled backend code and migrations go to `app/dist/`.

## Configuration

Backend npm scripts load `config/ftdcare.env` when present. Backend tests load `config/ftdcare.test.env` instead. Existing process environment variables take precedence over file values. The root `.env` is not the backend configuration file. Start with the [backend environment template](config/ftdcare.env.example); [env.ts](app/src/config/env.ts) defines defaults and validation.

| Variables                                      | Purpose / default                                                                                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_DRIVER`                                    | Defaults to `postgres`. `pglite` is explicit development-only storage; production rejects it. A PostgreSQL outage returns unhealthy and never switches databases. |
| `JWT_SECRET`                                   | Required signing secret, at least 32 characters; generate a unique random value per environment.                                                                  |
| `DB_HOST`, `DB_PORT`                           | PostgreSQL host and port; `127.0.0.1`, `5432`.                                                                                                                    |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD`            | Database name, role, and password; production requires a password of at least 12 characters.                                                                      |
| `DB_SSL`, `DB_POOL_MAX`                        | Verified database TLS (`false` by default) and pool size (`20`).                                                                                                  |
| `NODE_ENV`, `PORT`                             | Runtime mode (`development`) and API port (`3000`). Set `NODE_ENV=production` for deployments.                                                                    |
| `APP_URL`                                      | Frontend URL used in emailed links; `http://localhost:5173`.                                                                                                      |
| `CORS_ORIGIN`                                  | Comma-separated allowed frontend origins; `http://localhost:5173`. Production origins and `APP_URL` must use HTTPS.                                               |
| `TRUST_PROXY_HOPS`                             | Trusted reverse-proxy hops; `1` for one nginx proxy, `0` for direct access. Match the actual network topology.                                                    |
| `JWT_EXPIRES_IN`, `SESSION_COOKIE_MAX_AGE_MS`  | Token lifetime (`8h`) and persistent-cookie lifetime (`28800000`).                                                                                                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM`          | SMTP relay settings with no authentication; port `587` by default, implicit TLS on `465`, TLS required. The relay must permit your server to send.                |
| `GUIDE_UPLOAD_DIRECTORY`                       | Optional absolute persistent upload path; defaults to `public/uploads/guides`.                                                                                    |
| `ENABLE_DEV_PERSONAS`, `ENABLE_DATABASE_RESET` | Development-only switches; default `false`, rejected in production.                                                                                               |
| `ENABLE_DEV_AUTH_PREVIEWS`                     | Redacted development email previews; default `false`, rejected in production. Does not expose reset credentials.                                                  |
| `ENABLE_ADMIN_CONSOLE`                         | CS Admin console and its API; default `false`. Explicit opt-in in every environment, including production.                                                        |
| `ALLOW_PRODUCTION_SEED`                        | Explicit opt-in to run the seed script in production; default `false`.                                                                                            |

`VITE_API_PROXY_TARGET` configures the Vite development proxy and defaults to `http://127.0.0.1:3000`. Set it in the frontend process environment when changing the API port. Frontend `VITE_*` configuration can be exposed to the browser; never put secrets in it. `GEMINI_API_KEY` is optional legacy configuration and does not enable model generation.

## Roles and account access

| Role                  | Capabilities                                                                                                  | Seeded email addresses                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `CARE_PARTNER`        | Approved discussions in their condition/cohorts, own pending questions, resources, per-post private dialogue. | `sarah.smith@example.com`, `marcus.vance@example.com` |
| `CLINICIAN_MODERATOR` | Moderation, discussion policies, guides, cohorts, membership, invitations.                                    | `sgulyan1@jhmi.edu`                                   |
| `SYSTEM_ADMIN`        | Staff capabilities plus the guarded CS Admin console when explicitly enabled.                                 | `cs-admin@cs.jhu.edu`                                 |

Seeding creates sample accounts and content for development. It does not provide usable initial passwords or access to the listed inboxes. For local testing, assign an inbox you control to the seeded clinician using a PostgreSQL administrator connection to your development database:

```sql
UPDATE users SET email = 'you@your-domain.example' WHERE id = 'user-clinician-1';
```

Replace the example email before running this statement. Configure SMTP, then use **Forgot password** for that address. Open the single-use emailed reset link, choose a new password, and then sign in. No verification code is required. Rerunning the seed script restores seeded email addresses, so repeat this local override after reseeding. This is a development setup step; production account provisioning should use your approved administration process. Do not seed demonstration content into a real care community as an account-provisioning shortcut.

New care partners register through a staff-issued invitation. Password recovery sends one single-use link that expires after 20 minutes. Only a SHA-256 hash of its 32-byte random token is stored. New email links carry the token in a URL fragment so it is not sent to web-server access logs; the frontend removes it from the address bar after reading it. A successful reset revokes existing sessions and returns the user to sign-in; it does not sign them in automatically. Email-based recovery does not protect against mailbox compromise. Standalone private chat remains API-only for care partners; per-post private dialogue has a frontend interface. Administrative operations are available in the optional CS Admin console.

Care partners receive a public tag in the `User-123` format when their account is created. The tag is stored in `users.anonymous_handle`, with a database uniqueness constraint and database-side allocation; the browser does not choose it. Internal account IDs continue to identify sessions, permissions, posts, and messages. Public tags never encode a diagnosis. Staff can retain their name-based moderator handles.

Migration `009_short_anonymous_handles` preserves existing valid three-digit tags and assigns new neutral tags to long or disease-coded handles. Existing posts and account relationships keep their internal IDs. The initial range is `User-100` through `User-999` (900 unique tags); inactive accounts retain their tags. Registration reports a clear temporary-unavailability response if the range is full, so expand the namespace with a future migration before that limit is reached.

## Development commands

| Command                                            | Action                                                                                                           |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                      | Start frontend and backend together.                                                                             |
| `npm run dev:frontend` / `npm run dev:backend`     | Start either development process separately.                                                                     |
| `npm run backend:migrate` / `npm run backend:seed` | Apply migrations / load development seed data.                                                                   |
| `npm run typecheck`                                | Check frontend and Vite configuration types.                                                                     |
| `npm run lint:eslint`                              | Check frontend and backend source, including React hook rules.                                                   |
| `npm run format:check` / `npm run format`          | Check / apply Prettier formatting.                                                                               |
| `npm test` / `npm run backend:test`                | Run frontend / backend tests.                                                                                    |
| `npm run build`                                    | Build the frontend into `dist/` and backend into `app/dist/`.                                                    |
| `npm --prefix app run build`                       | Compile the backend and copy SQL migrations into `app/dist/`.                                                    |
| `npm start`                                        | Start the compiled API; does not serve the frontend.                                                             |
| `npm run preview`                                  | Preview the frontend build on port 4173; start the API separately and allow the preview origin in `CORS_ORIGIN`. |

Vite preview inherits the configured API/upload proxies. When testing emailed links against preview, also point `APP_URL` at the preview origin.

The root package uses an npm workspace for `app`. Run `npm ci` at the repository root to install both packages reproducibly. The backend lockfile also supports deploying `app/` independently: run `npm ci --omit=dev --workspaces=false` inside the copied backend folder. When backend dependencies change, update both lockfiles and verify both installation modes.

## Testing and CI

Run `npm run verify` for the complete local frontend/release-tooling gate, and run backend integration tests against an isolated migrated/seeded database. `npm run test:list` lists discovered frontend files; the platform update adds policy, guide visibility, notification-role, console and draft-preservation regressions. See [platform update verification](docs/qa/platform-update.md) for the recorded counts and browser evidence. `npm run build` now typechecks before producing output. Authentication tests assert expected failures without printing simulated error logs. Build timing and funding messages are informational. See [current deployment verification](docs/qa/deployment-verification.md) for dependency, install-script and packaged-browser checks.

These checks do not require PostgreSQL:

```bash
npm run typecheck
npm run lint:eslint
npm run format:check
npm test
npm run build
```

Backend tests mutate data and require a separate, migrated, seeded database. Create a test database, copy `config/ftdcare.env.example` to `config/ftdcare.test.env`, and set `NODE_ENV=test` and the test database credentials there. Use a different database from development and production. Leave `SMTP_HOST` unset or use an isolated test mail service; do not use the production relay for tests. Backend tests also require the OpenSSL CLI to generate temporary certificates for their local SMTP relay.

Load the test configuration explicitly when initializing that database:

```bash
(
  cd app
  node --env-file=../config/ftdcare.test.env --import tsx src/db/migrate.ts
  node --env-file=../config/ftdcare.test.env --import tsx src/db/seed.ts
)
npm run backend:test
```

Frontend tests use Vitest, Testing Library, and jsdom, including `<App/>` invitation and login regressions. `npm run test:app-loading` repeats the App workflows with deliberately slow workspace imports that exceed the normal per-test timeout; CI runs this guard to catch cold-loading races. Backend tests use Node's test runner and real PostgreSQL, covering authorization, sessions, moderation, messages, recovery, uploads, indexes, and legacy-password upgrades. A local SMTP relay test verifies actual STARTTLS delivery without authentication or sending messages outside the test process. Browser smoke checks and delivery through your deployed SMTP relay are separate from these automated suites.

[GitHub Actions](.github/workflows/ci.yml) runs checks against PostgreSQL 16 and 18, applies migrations twice, seeds the test database, runs both test suites, builds both packages and the Docker image, and audits dependencies. CI has read-only repository permissions; moderate, high and critical audit findings fail the workflow.

Run dependency checks locally with:

```bash
npm audit --audit-level=high
npm --prefix app audit --audit-level=high
```

Dependency findings change over time. Run the commands above for current results; the dated platform verification records the checks for this release.

## API conventions

- API routes use `/api/v1`; `GET /api/v1/health` checks database connectivity and returns `503` when unavailable.
- Browser requests include HttpOnly session cookies. Production cookies use `Secure`; cookie-authenticated mutations require an allowed origin. Authorization uses server-side identity and role checks.
- Logout increments the account's session version, revoking all its existing sessions.
- Validation errors return `400`, authorization failures `401`/`403`, unique conflicts `409`, oversized bodies `413`, and unexpected failures `500`. Central error responses include a request ID; responses also expose `X-Request-ID` for log correlation.
- Authenticated API traffic is limited per user to 1,200 requests per 15 minutes. Auth routes use a separate 60-request per-IP limit. Health checks are exempt. Limiter state is process-local; multiple API processes require a shared store for a consistent deployment-wide limit.

Posts, moderation queues, and private messages accept `page` and `pageSize`. Defaults are page 1 and 25 items (50 for messages), capped at 100. Responses include `pagination: { page, pageSize, total, totalPages }` alongside `posts`, `items`, or `messages`. Message pages select newest history and order each page chronologically. Frontend collection adapters request the selected page; feed filters run on the server before pagination.

## Email notifications

Primary account and community actions create in-app notifications and durable email jobs in the same database transaction. Activity emails use a shared, readable HTML and plain-text template, with a clear subject and a link back to the application. HTML messages use transparent page/text backgrounds and light/dark color rules to blend into mail clients without a fixed white card. Discussion titles, post/reply text, private messages, moderation feedback, names, and condition labels are excluded from activity emails; those details stay behind sign-in.

| Event                                                                                        | Who is notified                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New or edited discussion/reply awaiting moderation                                           | The submitting care partner receives a receipt; active moderators receive a review alert. CS Admins do not.                                                                                                                                      |
| Approval, decline, or clinical redirection                                                   | The author receives the outcome. Detailed moderation feedback remains in their signed-in notification inbox.                                                                                                                                     |
| Published reply or nested response                                                           | The discussion owner and parent-reply author, once the discussion and ancestor replies are approved and accessible. The same person receives one reply alert if they own both.                                                                   |
| Moderator edits or removes content, closes/reopens a discussion, or changes reply moderation | The affected content owner. Bulk-approved replies also produce approval and reply alerts.                                                                                                                                                        |
| Private discussion replies and direct messages                                               | The recipient or existing care-team participants; a first private follow-up alerts active moderators if no moderator has joined the thread yet. Private message text stays inside the application. Standalone direct messaging remains API-only. |
| Primary community group reassignment                                                         | The affected member, when the group actually changes.                                                                                                                                                                                            |
| New draft guide / guide approval                                                             | Active moderators review drafts; the uploader receives an approval update. CS Admins receive a system publication alert when a guide is approved or unpublished.                                                                                 |
| Completed invitation registration                                                            | The new member receives a welcome message, the inviter receives an acceptance update, and CS Admins receive a system account-activity alert.                                                                                                     |
| Password reset completed                                                                     | The account owner receives a password-change security alert after existing sessions are revoked.                                                                                                                                                 |

CS Admin system alerts cover permanent email failures, staff account security events, destructive actions by another admin, guide publication changes and new care partner registration. Moderation alerts and their email jobs are addressed only to moderators; the admin notification inbox has a separate system section. Migration `011` marks historical unread admin moderation alerts as read without deleting them.

Alerts go to the people involved, rather than every account. Self-alerts and duplicate reply recipients are suppressed; submission receipts and password-change alerts intentionally go to the account owner. Routine browsing and upvotes do not generate emails. Existing historical notifications are not bulk-emailed when the feature is enabled.

The API checks the activity queue every five seconds, claiming up to 20 jobs and sending at most four concurrently. Jobs survive restarts and have up to five delivery attempts, with delays of one, two, four, and eight minutes after failures. SMTP failure does not undo the original action. Delivery rechecks active accounts, staff permissions, and reply visibility; stale or inaccessible reply alerts are skipped. Event/recipient keys prevent duplicate jobs, and a stable email Message-ID is reused on retry. SMTP delivery is at least once: a process crash after SMTP acceptance but before recording success can cause a duplicate email.

Configure `SMTP_HOST`, `SMTP_PORT`, and `SMTP_FROM` and keep the API process running. Queue status is stored in `notification_email_jobs`; `attempts`, `completed_at`, `skipped_at`, and the sanitized `last_error` distinguish delivery outcomes. Check jobs with five attempts and no completion when monitoring mail failures. `email_outbox` records delivery status and recipient metadata without retaining message bodies.

Apply pending migrations before starting the updated API, including `008_activity_email_notifications` for the delivery queue and `009_short_anonymous_handles` for public tags. Deploy the matching frontend so email links open the notification inbox and registration uses server-assigned tags. Review the [activity definitions](app/src/services/activityDefinitions.ts) when changing notification wording or adding an event.

## Guides and community guidelines

The **Guides** page combines linked resources and uploaded guides at read time; records are not copied between tables. Staff use **Add guide** to upload PDF/text or link to a webpage. Approved, active guides appear to care partners with the matching condition across all community groups; **All care partners (FTD and AD)** covers both conditions. Drafts and unpublished guides are visible only to staff. Unpublishing also removes a guide from Care Companion retrieval. Moderator upload forms use plain language; extracted text, chunks and retrieval scores are restricted to CS Admin tools.

Care partners acknowledge the current Community Guidelines once per version before posting or replying. Staff are exempt. The backend responds with `428` and `GUIDELINES_ACK_REQUIRED` if acknowledgment is missing; the frontend opens the gate while preserving a discussion draft. Raising the policy version requires a new acknowledgment. Policy records are read-only in the console. The current policy wording mentions FTD and young-onset dementias; it still needs the policy owner's review for the app's AD audience.

## CS Admin console

Set `ENABLE_ADMIN_CONSOLE=true` deliberately to enable **Account menu → CS Admin console** (`?tab=admin`) for active `SYSTEM_ADMIN` accounts. Leave it off when administrative browser access is not needed. The backend enforces the same role and feature flag.

The console includes Overview, generated Data forms, typed Actions, read-only role Preview, Care Companion Diagnostics and an append-only Audit log. Sensitive text is masked by default and reveals require an audited reason. Changes require a preview, written reason and table-name confirmation; destructive changes also require a recent password check. There is no SQL console or password editor, and database reset remains blocked in production. See the [admin runbook and endpoint matrix](docs/admin-console.md) and [desktop/mobile QA script](docs/qa/platform-update.md).

## Database and file storage

Migrations live in [app/src/db/migrations](app/src/db/migrations). The runner applies numbered SQL files in filename order under one transaction and advisory lock, recording SHA-256 checksums. Applied files must not be edited; add a new numbered migration. The baseline supports existing installations, and later migrations include corrective account changes, foreign-key indexes, and durable recovery jobs.

Run migrations as a deployment step before starting the new API version. Migration `007_link_only_password_recovery` removes the old code hashes and invalidates outstanding link-and-code resets; affected users must request a fresh link. Deploy its matching frontend and backend together. Back up the database first. There is no automated down-migration command; plan rollback using a compatible application version or a tested database restore.

Guide metadata and PDF URLs live in PostgreSQL; uploaded PDF bytes live on disk. Persist and back up `GUIDE_UPLOAD_DIRECTORY` along with the database. A URL in PostgreSQL does not preserve its target file. Bundled seed PDFs live in `public/resources`; external PDF URLs require their own durable storage and access policy.

Uploaded PDFs must be served through `/uploads/guides/` on the authenticated API. Staff can access drafts; care partners can access active, approved guides for their condition and condition-appropriate resource attachments. Do not expose the upload directory through a public filesystem alias. At API startup and hourly, generated uploads older than 24 hours are removed if no guide or resource references them.

## Production deployment

For locally built artifacts transferred over SSH, follow [the deployment runbook](docs/deployment.md). `npm run release:package -- /tmp/ftd-release.tgz` builds a complete versioned archive with checksums, excludes runtime uploads/secrets, and includes a systemd template. Run `npm run preflight:compiled` inside the deployed backend after migrations and before switching the release. The API refuses startup if migration versions/checksums do not match.

See [release verification and SSH transfer](docs/release-readiness.md) for the audited fixes, repeatable checks, and deployment gates. Deploy one reviewed source revision, preserve environment files and persistent uploads, back up PostgreSQL, and apply only unapplied migrations.

### nginx and a supervised API process

For the existing rootless deployment behind Apache and nginx, follow the [user-service deployment steps](docs/deployment.md#existing-rootless-installation). The API uses `PORT=3003` there; local development and the generic nginx template default to 3000. Preserve the production override and actual proxy topology.

The deployment runbook covers complete artifact packaging, backend-only production dependency installation, migrations and preflight, a user-level `ftdcare-api.service`, readable file logs, backup/rollback and public-origin checks. Infrastructure changes to Apache/nginx remain the server administrator's responsibility. Both proxies must permit `PUT`, `PATCH`, `DELETE` and pass `X-Preview-Token` for read-only role preview; keep ModSecurity enabled.

The API process also runs recovery, activity email delivery and upload-cleanup jobs, so it must remain supervised for those jobs to execute.

### Docker application image

```bash
docker build -t ftdcare:local .
docker run --rm --env-file /secure/ftdcare.env ftdcare:local node app/dist/db/migrate.js
```

The image runs the API as the non-root `node` user and includes compiled migrations. It includes the compiled frontend, served by Express when nginx is not serving static files. With the recommended nginx deployment, deploy `dist/` to its document root as above. Configure `DB_HOST` to a database address reachable from the container; `127.0.0.1` inside the container refers to that container.

Create a persistent host upload directory writable by the container user (UID 1000 in the supplied base image), then start the API:

```bash
docker run -d --name ftdcare-api --restart unless-stopped \
  --env-file /secure/ftdcare.env \
  -p 127.0.0.1:3000:3000 \
  --mount type=bind,src=/var/lib/ftdcare/guides,dst=/var/lib/ftdcare/guides \
  -e GUIDE_UPLOAD_DIRECTORY=/var/lib/ftdcare/guides \
  ftdcare:local
```

Use the same database/network settings for migration and API containers. Runtime maintenance commands use compiled JavaScript, since development dependencies are removed: `node app/dist/db/migrate.js` and, only when intentionally loading seed data, `node app/dist/db/seed.js`. Production seeding remains disabled by default.

For Apache/ModSecurity deployments, see the [multipart PDF upload checks](docs/qa/multipart-uploads.md) and the [deployment runbook](docs/deployment.md#apache-with-modsecurity).

## Operations and troubleshooting

| Symptom / task                                         | What to check                                                                                                                                                                                                                                |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database health returns `503`                          | Database availability, credentials, TLS configuration, network access, and applied migrations.                                                                                                                                               |
| Login fails after initial seeding                      | Seed passwords cannot be recovered. Configure SMTP and use recovery for an inbox you control.                                                                                                                                                |
| Login works but subsequent requests return `401`/`403` | Frontend origin, HTTPS, cookie settings, reverse-proxy topology, and consistent hostnames.                                                                                                                                                   |
| Invitations or resets do not arrive                    | SMTP host/port, relay permission for the server, required TLS, sender configuration, delivery status, and the running API worker. Recovery polls every five seconds and makes up to five delivery attempts, one minute apart after failures. |
| Guide PDFs disappear after a restart                   | Persistent upload mount, write permissions, and whether the guide/resource URL still references the file. Unsaved orphan uploads expire.                                                                                                     |
| Request fails unexpectedly                             | Correlate `X-Request-ID` or the response's `requestId` with structured API logs.                                                                                                                                                             |
| Preparing a release or restore                         | Back up PostgreSQL and uploaded files together; verify the restore procedure and migration compatibility.                                                                                                                                    |

Backend logs include request IDs, route templates, sanitized error messages, codes, and stack locations without serializing request bodies or cookies. Email bodies and reset credentials are not retained in the outbox. Monitor API health and mail delivery; a healthy database alone does not establish that SMTP or every user flow works.

## Contributing

Keep changes within their owning feature or backend domain and preserve UI and API behavior unless the change explicitly requires otherwise. Add behavioral regression coverage for fixes, run the checks above, and describe validation and migration requirements in the pull request. Use synthetic data in fixtures and keep real patient data out of tests, issues, screenshots, and logs. Do not commit environment credentials, uploaded PDFs, or temporary migration probes.
