# Deploy a reviewed release by SSH

Use Node 24, PostgreSQL 16/18, nginx with a valid TLS certificate, an application service account, and a trusted SMTP relay. This procedure transfers locally built artifacts; the server does not need the frontend source or TypeScript tools.

## Build locally

Run the repository checks and test suites against an isolated database first. Commit the reviewed changes, then:

```bash
npm ci
npm run release:package -- /tmp/ftd-release.tgz
scp /tmp/ftd-release.tgz deploy@your-server:/tmp/ftd-release.tgz
```

The archive contains `html/`, `app/dist/`, standalone backend package manifests, bundled resources, example configuration/service files, `release.json`, and `SHA256SUMS`. Private environment files, runtime uploads and local dependencies are excluded. Packaging rejects an uncommitted tree; `--allow-dirty` is only for testing the packaging command, and marks the archive accordingly. Do not deploy a dirty artifact.

The frontend build explicitly copies only fonts, bundled resources and the website logo. Locally uploaded PDFs are excluded, even when they exist under `public/uploads`.

## Prepare the server once

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
