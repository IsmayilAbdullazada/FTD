# Hopkins Care Partner Connect

A React application with a clinician-moderated PostgreSQL API for FTD and Alzheimer's care partners.

## Local development

Use Node.js 22.21+ (Node.js 24 recommended), npm, and PostgreSQL 16.

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

| Role | Access | Seed login |
| --- | --- | --- |
| `CARE_PARTNER` | Approved discussions in their condition/cohorts, own pending questions, resources and private clinician messages | `sarah.smith@example.com` or `marcus.vance@example.com` |
| `CLINICIAN_MODERATOR` | Moderation, discussion policies, guides, cohorts, membership and invitations | `sgulyan1@jhmi.edu` |
| `SYSTEM_ADMIN` | Staff capabilities plus database administration | `cs-admin@cs.jhu.edu` |

Development seed accounts use password `Hopkins2026!`. These are demo credentials; do not seed them into a public production deployment. Production seeding is disabled unless explicitly enabled with `ALLOW_PRODUCTION_SEED=true`.

## Environment configuration

Backend configuration is loaded from `config/ftdcare.env` or process environment variables. Keep secrets outside Git. See `config/ftdcare.env.example`.

| Variables | Configuration |
| --- | --- |
| `JWT_SECRET` | Required, at least 32 random characters |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PostgreSQL connection; production password must be at least 12 characters |
| `DB_SSL` | `true` for databases requiring verified TLS; otherwise `false` |
| `DB_POOL_MAX` | Pool size, default `20` |
| `NODE_ENV`, `PORT` | `development`/`test`/`production`; API port defaults to `3000` |
| `APP_URL`, `CORS_ORIGIN` | Public frontend URL and comma-separated allowed origins; production requires HTTPS |
| `TRUST_PROXY_HOPS` | Trusted proxy count; `1` for a single nginx proxy, `0` for direct access |
| `JWT_EXPIRES_IN`, `SESSION_COOKIE_MAX_AGE_MS` | Session lifetime, defaults `8h` and `28800000` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | Mail delivery configuration for invitations and recovery; defaults to port `587` |
| `ENABLE_DEV_PERSONAS`, `ENABLE_DATABASE_RESET`, `ALLOW_PRODUCTION_SEED` | Development/admin switches, default `false`; leave disabled in production |

Frontend API calls use the same origin with HttpOnly session cookies. Vite proxies `/api` to port 3000; `VITE_API_PROXY_TARGET` can override this locally. Mock API fallback requires both development mode and `VITE_ENABLE_API_FALLBACK=true`. The backend currently provides retrieval-based knowledge responses; an API key does not enable model generation.

## Database migrations and pagination

`npm run backend:migrate` applies numbered SQL files from `app/src/db/migrations` in filename order. Each migration runs once, records a SHA-256 checksum, and shares a transaction and advisory lock with the migration run. Editing a recorded migration fails the run; add a new numbered file for subsequent schema changes. The initial migration is idempotent so existing installations can adopt the migration history without deleting data. Back up production before schema updates.

Posts, moderation queue and private messages accept `page` and `pageSize`. Defaults are page 1 and 25 items (50 for messages), capped at 100. Responses include `pagination: { page, pageSize, total, totalPages }`. Posts retain `posts`/`total`; moderation retains `items`/`totalPending`; private chat returns `messages`. Messages page from newest history, with each page ordered chronologically. Existing frontend collection adapters traverse pages to preserve current client-side filtering and display behavior; incremental UI loading can be introduced separately.

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

Guide metadata and PDF URLs are stored in PostgreSQL. The current upload endpoint writes files under `public/uploads/guides`; mount persistent storage there when using uploads, and include it in backups. External PDF URLs can point to durable object storage. Database URL records alone do not persist the PDF bytes. `public/resources` contains the bundled seed resources.

## Validation

```bash
npm run lint
npm run build
npm --prefix app run build
npm run backend:test
```

Backend integration tests require a migrated, seeded, isolated PostgreSQL database configured in `config/ftdcare.test.env` (same variable names as the backend environment). They exercise authentication, authorization, moderation, frontend contracts and pagination and mutate test data. Never point them at production.

Frontend ownership rules and module layout are documented in `docs/frontend-refactoring.md`. Development fixtures live in `src/shared/dev/fixtures`; `clinicalStore.ts` remains their export entry point.
