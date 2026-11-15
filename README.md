# Hopkins Care Partner Connect

A React application with a clinician-moderated PostgreSQL API for FTD and Alzheimer's care partners.

## Local development

Use Node.js 24, npm, and PostgreSQL 16 or 18.

```bash
npm ci
npm --prefix app ci
cp config/ftdcare.env.example config/ftdcare.env
# Create the PostgreSQL database/user and edit config/ftdcare.env.
npm run backend:migrate
npm run backend:seed
npm run dev
```

Open http://localhost:5173. The backend listens on port 3000; health is available at `/api/v1/health`. Use `localhost` consistently with the configured CORS origin.

## Roles and demonstration accounts

| Role                  | Access                                                                                                          | Seed login                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `CARE_PARTNER`        | Approved discussions in their condition/cohorts, own pending questions, resources and per-post private dialogue | `sarah.smith@example.com` or `marcus.vance@example.com` |
| `CLINICIAN_MODERATOR` | Moderation, discussion policies, guides, cohorts, membership and invitations                                    | `sgulyan1@jhmi.edu`                                     |
| `SYSTEM_ADMIN`        | Staff capabilities; database administration is API-only                                                         | `cs-admin@cs.jhu.edu`                                   |

Seed accounts have random, unrecoverable initial passwords. Configure SMTP and use account recovery to activate them. Historical accounts using the formerly public seed password are invalidated by corrective migration 004. Production seeding is disabled unless explicitly enabled with `ALLOW_PRODUCTION_SEED=true`.

## Environment configuration

Backend configuration is loaded from `config/ftdcare.env` or process environment variables. Keep secrets outside Git. See `config/ftdcare.env.example`.

| Variables                                                               | Configuration                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `JWT_SECRET`                                                            | Required, at least 32 random characters                                                                   |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`               | PostgreSQL connection; production password must be at least 12 characters                                 |
| `DB_SSL`                                                                | `true` for databases requiring verified TLS; otherwise `false`                                            |
| `GUIDE_UPLOAD_DIRECTORY`                                                | Optional absolute path for persistent uploaded PDF storage                                                |
| `DB_POOL_MAX`                                                           | Pool size, default `20`                                                                                   |
| `NODE_ENV`, `PORT`                                                      | `development`/`test`/`production`; API port defaults to `3000`                                            |
| `APP_URL`, `CORS_ORIGIN`                                                | Public frontend URL and comma-separated allowed origins; production requires HTTPS                        |
| `TRUST_PROXY_HOPS`                                                      | Trusted proxy count; `1` for a single nginx proxy, `0` for direct access                                  |
| `JWT_EXPIRES_IN`, `SESSION_COOKIE_MAX_AGE_MS`                           | Session lifetime, defaults `8h` and `28800000`                                                            |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`         | Mail delivery configuration for invitations and recovery; defaults to port `587`                          |
| `ENABLE_DEV_PERSONAS`, `ENABLE_DATABASE_RESET`, `ALLOW_PRODUCTION_SEED` | Default `false`; personas and database reset are rejected in production; seeding requires explicit opt-in |

Frontend API calls use the same origin with HttpOnly session cookies. Vite proxies `/api` to port 3000; `VITE_API_PROXY_TARGET` can override this locally. The backend currently provides retrieval-based knowledge responses; an API key does not enable model generation.

## Database migrations and pagination

`npm run backend:migrate` applies numbered SQL files from `app/src/db/migrations` in filename order. Each migration runs once, records a SHA-256 checksum, and shares a transaction and advisory lock with the migration run. Editing a recorded migration fails the run; add a new numbered file for subsequent schema changes. The initial migration is idempotent so existing installations can adopt the migration history without deleting data. Back up production before schema updates.

Posts, moderation queue and private messages accept `page` and `pageSize`. Defaults are page 1 and 25 items (50 for messages), capped at 100. Responses include `pagination: { page, pageSize, total, totalPages }`. Posts retain `posts`/`total`; moderation retains `items`/`totalPending`; private chat returns `messages`. Messages page from newest history, with each page ordered chronologically. Frontend collection adapters request only the selected page. Feed search, audience, ownership and reply-policy filters run on the server before pagination.

Authenticated API requests are limited per user (1,200 requests per 15 minutes); auth routes retain a separate IP limit (60 per 15 minutes). Health checks are exempt. Limits are currently process-local, so deployments with multiple API processes should use a shared limiter store. Logout revokes all sessions for the account by incrementing its session version.

## Production deployment with nginx

1. Provision PostgreSQL, an application service account, a domain, nginx and a valid TLS certificate. Place the checkout at `/var/www/ftdcare/app` and set production environment values above.
2. Install and build (build tools require development dependencies at build time):

   ```bash
   npm ci
   npm --prefix app ci
   npm run build
   npm --prefix app run build
   npm run backend:migrate
   sudo mkdir -p /var/www/ftdcare/html
   sudo rsync -a --delete dist/ /var/www/ftdcare/html/
   ```

3. Run `npm --prefix app start` under a process supervisor such as systemd. Set its working directory to `/var/www/ftdcare/app`, run as the application service account, enable restart on failure, and expose port 3000 only through the local proxy/firewall. Production secrets must be readable only by that service account.
4. Copy `config/nginx.conf` into `/etc/nginx/sites-available/ftdcare`, set the domain and certificate paths, and enable it in `sites-enabled`. Its static root is `/var/www/ftdcare/html` and its API upstream is `127.0.0.1:3000`. The config includes the PDF-upload proxy and request size needed for extraction.
5. Validate and reload:

   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   curl --fail https://your-domain.com/api/v1/health
   ```

Guide metadata and PDF URLs are stored in PostgreSQL. The upload endpoint writes files under `public/uploads/guides`, or the absolute path set by `GUIDE_UPLOAD_DIRECTORY`. Mount persistent storage there and include it in backups. Serve `/uploads/guides/` through the authenticated API, never a public filesystem alias. Draft uploads require staff access; care partners can read only active, approved guides and resources for their condition. The API removes unreferenced generated uploads older than 24 hours at startup and hourly. External PDF URLs can point to durable object storage. Database URL records alone do not persist the PDF bytes. `public/resources` contains the bundled seed resources.

## Validation

```bash
npm run typecheck
npm run build
npm --prefix app run build
npm run backend:test
```

Backend integration tests require a migrated, seeded, isolated PostgreSQL database configured in `config/ftdcare.test.env` (same variable names as the backend environment). They exercise authentication, authorization, moderation, frontend contracts and pagination and mutate test data. Never point them at production.

Development API fallbacks have been removed. Email bodies are not retained in the outbox. Password-reset requests enqueue the same durable job for every email and return before account lookup or SMTP. The API worker polls every five seconds and retries failed delivery up to five times, one minute apart. SMTP requires TLS; configure a working SMTP service before enabling account recovery. Reset links and codes are delivered separately. `ENABLE_DEV_AUTH_PREVIEWS` defaults to false and is forbidden in production.

Quality checks: `npm test`, `npm run lint:eslint`, and `npm run format:check`. CI also provisions isolated PostgreSQL 16 and 18 services, migrates twice, seeds random initial credentials, runs integration tests, and builds the Docker image. Frontend diagnostics log event names only in development; backend logs include request IDs, route templates, sanitized error messages, error codes and stack locations without serializing request bodies, cookies or database error details.

The full dependency audit currently reports a moderate `minimatch` denial-of-service advisory through the development-only `typescript-eslint` dependency chain, with no upstream fix reported. Production dependencies have no reported vulnerabilities. CI scans both production and development dependencies and fails on high or critical findings.

Standalone `/api/v1/chat/private` and admin database endpoints are API-only; there are no standalone messaging or database-admin screens. Per-post private dialogue is available in the discussion interface.

Password recovery verifies access to one email inbox. Separate link and code emails are not independent factors and do not protect against mailbox compromise.

For Docker deployments, pass production environment variables and run `docker run --rm --env-file /secure/ftdcare.env IMAGE node app/dist/db/migrate.js` before starting the API. The compiled seed command is `node app/dist/db/seed.js`; production seeding remains disabled by default. These commands do not require tsx or development dependencies.
