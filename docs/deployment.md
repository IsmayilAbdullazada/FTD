# Deploy a reviewed release by SSH

Use Node 24, PostgreSQL 16/18, Apache/nginx with a valid TLS certificate, an application service account, and a trusted SMTP relay. This procedure transfers locally built artifacts; the server does not need the frontend source or TypeScript tools.

## Build locally

On WSL, prefer a checkout in the Linux filesystem (for example `~/projects/FTD`) instead of `/mnt/c/...`. Dependency installation and cold module loading can be substantially slower on a mounted Windows drive. The release checks still need to pass before transfer.

Run the repository checks and test suites against an isolated database first. Commit the reviewed changes, then:

```bash
npm ci
npm run release:package -- /tmp/ftd-release.tgz
scp /tmp/ftd-release.tgz deploy@your-server:/tmp/ftd-release.tgz
```

The archive contains `html/`, `app/dist/`, standalone backend package manifests, bundled resources, example configuration/service files, `release.json`, and `SHA256SUMS`. Private environment files, runtime uploads and local dependencies are excluded. Packaging rejects an uncommitted tree; `--allow-dirty` is only for testing the packaging command, and marks the archive accordingly. Do not deploy a dirty artifact.

The frontend build explicitly copies only fonts, bundled resources and the website logo. Locally uploaded PDFs are excluded, even when they exist under `public/uploads`.

## Existing rootless installation

The deployed Hopkins installation uses API port **3003**, PostgreSQL in rootless Podman and the user-level **`ftdcare-api.service`**. Keep that layout and the existing proxy order. You do not need sudo to install application artifacts or manage your own service. Apache/nginx policy, ownership outside your account and SELinux changes require the server administrator.

Keep `PORT=3003` in the private production environment file. Leave `ENABLE_DATABASE_RESET`, `ENABLE_DEV_PERSONAS`, `ENABLE_DEV_AUTH_PREVIEWS` and `ALLOW_PRODUCTION_SEED` false. **`ENABLE_ADMIN_CONSOLE=false` is the default**; set it true only when the optional console is intended to be available to CS Admins. Back up PostgreSQL and the persistent PDF directory before upgrading.

For a flat installation, unpack the verified archive to a staging directory, run `sha256sum --check SHA256SUMS`, then copy its `app/package.json`, `app/package-lock.json` and `app/dist/` into the deployed backend. Preserve `config/ftdcare.env` and all uploads. Install backend dependencies on the server; never transfer local `node_modules`. From the actual deployed `app/`:

```bash
npm ci --omit=dev --workspaces=false
npm run migrate:compiled
npm run preflight:compiled
```

These compiled commands need no `tsx`. If production is at migration 007, the runner applies **008–013**, including 010 guidelines, 011 system notifications, 012 append-only admin audit and 013 exact system-category terminology. Already-applied migration checksums must remain unchanged. Run migrations before starting the new API; deploy frontend and backend from the same reviewed commit. The API refuses a mismatched schema. The current migration runner does not support serving an old binary against a newer schema, so arrange a brief maintenance window for the upgrade.

Activate the matching frontend (`html/`) using an atomic release switch where possible. If the existing flat layout must be synchronized, retain old hashed assets while replacing the entry HTML and new assets; do not delete files still needed by open browser tabs. Avoid a parent-level `rsync --delete` that could erase configuration or uploads. Never synchronize the local upload directory to production.

```bash
systemctl --user restart ftdcare-api.service
systemctl --user status ftdcare-api.service --no-pager -l
curl --fail http://127.0.0.1:3003/api/v1/health
curl --fail https://hopkinscarepartners.eng.jhu.edu/api/v1/health
tail -n 100 ~/logs/api.log
```

A restart briefly interrupts API requests; nginx/Apache can continue serving static pages. An empty log after a successful request is normal: the API logs lifecycle events and failures, not every request. Correlate failures with `requestId`; an Apache HTML error without an application log may have been rejected before Node.

If your existing unit already works, preserve it. The optional `config/ftdcare-api.user.service.example` in the release is a user-service template: adapt the absolute Node path, working directory and environment path before placing it at `~/.config/systemd/user/ftdcare-api.service`. Create `~/logs` first, then `systemctl --user daemon-reload` and restart the service. It writes stdout/stderr to `~/logs/api.log`, avoiding journal-access requirements. Persistent user-service startup after logout/reboot depends on the host's linger policy; ask the administrator to confirm it.

After activation, follow the [platform-update QA script](qa/platform-update.md) with authorized test accounts. Refresh older open browser tabs, verify mail delivery and use the public hostname for cookies, PDF access and role-preview checks. No production data should be seeded for testing.

## Prepare the server once

The following alternative is for an administrator provisioning a new system-level service. Existing rootless deployments should use the section above.

The examples use `/var/www/ftdcare`; replace that path, the domain, deployment account and service account consistently. Existing flat `html/`, `app/`, `config/` installations can keep their layout, but versioned directories make artifact rollback safer.

```text
/var/www/ftdcare/
  releases/<commit>/   extracted archive and installed backend dependencies
  current -> releases/<commit>
  config/ftdcare.env   private production settings
/var/lib/ftdcare/guides/  persistent uploaded PDFs
```

Create the `ftdcare` service user/group, the release/config directories and the upload directory using your server administration process. Give that account read access to releases and the private environment file, and write access to the upload directory. Keep the environment file outside releases, mode `0640` owned by `root:ftdcare`; use traversable directories and readable static files for nginx. Set `NODE_ENV=production`, a unique random `JWT_SECRET`, PostgreSQL credentials, `APP_URL=https://your-domain`, matching HTTPS `CORS_ORIGIN`, and `GUIDE_UPLOAD_DIRECTORY=/var/lib/ftdcare/guides`. Configure `SMTP_HOST`, `SMTP_PORT` and `SMTP_FROM`; the relay must allow this server and use a trusted TLS certificate.

For an existing installation, copy existing uploaded PDFs to the persistent directory before switching its configured path. Preserve their filenames and database URLs. Back up PostgreSQL and uploads before upgrading. Do not run the development seed against production; existing staff should continue to use their provisioned accounts and recovery flow. A new installation needs institution-approved staff provisioning before enrollment opens.

Adapt `config/ftdcare.service.example`, including the actual `node` binary path, and install it as `/etc/systemd/system/ftdcare.service`. Its write permission is limited to the configured upload directory. Install/adapt `config/nginx.conf.example`: use your domain/certificates, root `/var/www/ftdcare/current/html`, and API port 3000. Keep port 3000 private to the proxy. Uploaded PDFs must be proxied through the API, never exposed by a static filesystem alias.

## Activate each release

The deploying administrator should extract the archive to a new directory named after `release.json.commit`, then verify and install as the application account. For example, with `RELEASE_DIR` set to that exact extracted directory:

```bash
cd "$RELEASE_DIR"
sha256sum --check SHA256SUMS
cd app
npm ci --omit=dev --workspaces=false
node --env-file=/var/www/ftdcare/config/ftdcare.env dist/db/migrate.js
node --env-file=/var/www/ftdcare/config/ftdcare.env dist/preflight.js
```

Preflight requires an explicit absolute `GUIDE_UPLOAD_DIRECTORY` and verifies matching migration checksums, writable upload storage and a trusted TLS connection to SMTP. It sends no email and cannot prove that a relay permits a particular sender/recipient or that mail reaches an inbox. Any failure exits nonzero: resolve it before switching releases. The API also refuses startup with missing, modified or newer migrations; it does not apply migrations automatically.

Before switching, retain old hashed frontend assets for already-open browsers by copying the prior `current/html/assets/` into the staged release's `html/assets/` without overwriting new files. Validate those assets as coming from the previous trusted release. Avoid overwriting/deleting a live bundle directory while copying files. Set the release owner/group and permissions so nginx can read static files and the service user can read backend files.

Atomically replace the `current` symlink, restart `ftdcare`, and wait for health. On the first service installation, run `systemctl daemon-reload` and enable the service. Reload nginx only after configuration changes and a successful `nginx -t`. A single-backend restart briefly interrupts API requests; uninterrupted handover requires a separate rolling/blue-green setup.

```bash
sudo systemctl restart ftdcare
sudo systemctl status ftdcare --no-pager
curl --fail https://your-domain/api/v1/health
```

From the source checkout, run `node scripts/check-deployment.mjs https://your-domain`. It requires HTTPS, verifies effective security policies and content types, validates API/database health, rejects SPA fallback for missing chunks, and checks that uploaded-PDF requests require login. Review `journalctl -u ftdcare` and nginx logs.

Test deployed login/logout, invitation → enrollment, recovery → login, submission → private conversation → moderation → approved reply, resource/PDF access, audience isolation, and notifications using test-only accounts on desktop and mobile. Send an authorized test email and verify real delivery. Confirm operational policy/support/retention expectations with the service owner before opening enrollment.

For rollback, preserve the failed release and logs, assess schema compatibility, then select the previous compatible release and restart. A release whose migrations do not match the database will deliberately refuse startup. Do not restore an old database casually: it would discard newer user data. Keep versioned artifacts and tested database/upload backups as separate recovery mechanisms.

## Apache with ModSecurity

If Apache fronts this application, proxy both `/api/` and `/uploads/guides/` to
the backend and keep uploaded files outside public static aliases. Allow a total
request body of at least 13,107,200 bytes (12.5 MiB) on the PDF upload route; the
backend enforces the smaller 12 MiB file limit. Check the effective Apache
`LimitRequestBody`, `SecRequestBodyLimit`, and any upstream proxy limits. Retain
ModSecurity's normal non-file body limit and request inspection rules. Configure
the API method policy to permit `GET HEAD POST OPTIONS PUT PATCH DELETE`; the
stock CRS policy blocks `PUT`/`PATCH`/`DELETE` with rule 911100. Scope this policy
to the application API where your server supports per-location settings, and
keep unrelated hosts and locations under their existing policies.

Pass the custom **`X-Preview-Token`** request header unchanged through every proxy to Node; do not log its value. Same-origin preview uses the normal HttpOnly admin cookie plus this in-memory signed header. If the header is stripped, the frontend fails closed on the target-account check. Verify a read-only iframe loads the selected account, all preview writes return `403 PREVIEW_READ_ONLY`, and CS Admin data is not rendered in a target pane. The console sends typed fields, never arbitrary SQL. Ordinary prose can still trigger WAF rules: inspect the specific audit event and apply narrowly reviewed exclusions if needed, rather than disabling inspection.

Deploy the frontend and backend from this same release and install backend
production dependencies with `npm ci --omit=dev --workspaces=false`. PDF extraction
now requires multipart instead of base64 JSON, so already-open older browser
tabs must refresh. No database migration is added for this transport change.
Restart the backend and follow the [Apache PDF verification steps](qa/multipart-uploads.md)
with a staff test account. Do not raise global WAF limits or disable ModSecurity
just to accommodate PDF data encoded as JSON.

### When Apache and nginx are both in the request path

Keep your existing proxy order. For a chain such as browser → Apache → nginx →
Node, both proxies must forward `/api/` and `/uploads/guides/` correctly, and both
must permit the upload request size. The nginx template's `client_max_body_size
18m` already exceeds the 12 MiB file limit; Apache's effective total-body limits
must also allow multipart overhead. Keep the upload directory private.

Set `TRUST_PROXY_HOPS` to the verified number of trusted proxies between the
client and Node (`2` for the exact two-proxy chain above, `1` if only one actually
proxies API traffic). Do not infer this value just from installed services. Block
direct access to Node and inner proxy listeners so clients cannot bypass that
chain or supply trusted forwarding headers themselves.

The TLS-terminating proxy must set the original HTTPS scheme and client address;
the inner proxy must preserve those trusted values. If Apache terminates HTTPS
and forwards to nginx over HTTP, blindly using nginx's `$scheme` as
`X-Forwarded-Proto` changes it to `http`. Adapt the template for that topology
using only headers from the trusted outer proxy. Keep `APP_URL` and `CORS_ORIGIN`
set to the public HTTPS origin. Verify secure login cookies and PDF requests
through the public origin, rather than testing only the inner proxy.

Validate each changed configuration (`nginx -t` and `apachectl configtest`, or
your distribution's equivalent) before reloading that service. Inspect both
proxies' logs when an upload fails: an upstream rejection may never reach Node.

### Confirmed local multipart false positive (rule 200004)

The 2026-11-23 local test reproduced a content-dependent rejection: a real Chromium multipart upload of `July-2012.pdf` (414,263 PDF bytes) was blocked with `Multipart parser detected a possible unmatched boundary` (**200004**), while `Managing-Aggressive-Behavior.pdf` (574,559 bytes) passed. Size alone did not explain the failure. This is local evidence; confirm the actual production audit line before changing its WAF policy.

If the administrator confirms this exact false positive, the following example removes only rule 200004 for POSTs to the PDF endpoint. Install it through the host's reviewed ModSecurity configuration, choose an unused rule ID and validate/reload Apache. Keep ModSecurity, CRS, body limits, strict multipart validation, authentication and the backend PDF parser enabled. Do not remove rule 200004 globally or disable request-body inspection.

```apache
SecRule REQUEST_URI "@streq /api/v1/chatbot/extract-pdf" "id:1001001,phase:1,pass,nolog,chain"
    SecRule REQUEST_METHOD "@streq POST" "ctl:ruleRemoveById=200004"
```

With that exact local scope, both PDFs passed desktop/mobile browser upload checks; rule 200004 still rejected the same payload on another path. Anonymous upload returned 401, invalid PDF content returned 400 and an oversized PDF returned 413. A deliberately missing multipart boundary was rejected by the stock proxy with HTML 500 before Node; backend-direct malformed uploads return JSON 400. That separate proxy error mapping was not changed in the application.

Preserve backend JSON error responses where possible (`ProxyErrorOverride Off` for the application proxy). Never include cookies, preview tokens, request bodies or uploaded clinical documents when sharing WAF logs; share the timestamp, request ID, route, rule ID and sanitized message instead.
