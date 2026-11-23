# PDF uploads through Apache and ModSecurity

PDFs use `multipart/form-data` with exactly one `file` part. The staff Guides upload form and legacy resource PDF attachments use this transport.
The browser sets the multipart boundary; do not set `Content-Type` manually.

The API requires an authenticated staff account and a valid request origin before
parsing the body. It accepts PDFs up to 12 MiB, verifies the PDF signature and
parses the document before storing it under a random filename in the private
upload directory. Malformed uploads return 400, oversized files return 413 and
old JSON clients return 415 with an instruction to refresh. PDF access remains
authenticated; unreferenced uploads retain the existing cleanup policy.

For uploaded guides, the save request sends the protected PDF reference and
metadata. The server reads the registered upload belonging to that staff member
to populate text and pages. Subsequent metadata changes preserve the stored
text. This avoids sending extracted document prose back through JSON request
inspection. Text/Markdown uploads retain their existing JSON content workflow.
There is no new database migration.

## Automated regression tests

Use an isolated PostgreSQL database configured as described in the README:

```bash
npm test -- src/features/knowledge/api/guideApi.test.ts
npm --prefix app test
```

The multipart integration tests cover actual PDF extraction, file registration,
protected reads, draft creation from the registered PDF, metadata updates,
approval indexing, missing/foreign upload references, malformed multipart,
multiple files, unexpected fields, invalid PDFs, size limits, concurrent uploads,
and rejection of unauthorized requests before waiting for their bodies.

## Apache reproduction

Use an isolated production-mode backend, HTTPS, seeded test-only staff accounts
and a writable persistent upload directory. Never seed the production database.
A local verification used the official `owasp/modsecurity-crs:apache` container,
with ModSecurity enabled and the complete CRS. The method policy allows the
application's REST methods (the stock GET/HEAD/POST/OPTIONS policy blocks guide
updates with rule 911100); attack rules and anomaly thresholds remain unchanged. Relevant container
settings were:

```text
BACKEND=http://127.0.0.1:3148
PORT=9088
SSL_PORT=9448
SERVER_NAME=localhost
PROXY_ERROR_OVERRIDE=off
MODSEC_RULE_ENGINE=on
ALLOWED_METHODS=GET HEAD POST OPTIONS PUT PATCH DELETE
MODSEC_REQ_BODY_NOFILES_LIMIT=131072
MODSEC_REQ_BODY_LIMIT=13107200
MODSEC_UPLOAD_KEEP_FILES=Off
MODSEC_AUDIT_LOG_PARTS=AHZ
```

Set the backend `APP_URL` and `CORS_ORIGIN` to the proxy's HTTPS origin. Mount a
locally trusted test certificate as required by the image. Pin the image digest
for repeatable checks; this verification used
`sha256:5c91b947fb9fa68e26c54b7542dc9255dce8c2c09218e4766d41126ad694862f`
(Apache 2.4.71, ModSecurity 2.9.15, CRS 4.30.0).

Verify in a real browser at desktop and mobile viewport sizes:

1. Sign in as test staff. In Guides, select Add guide → Upload PDF or text and upload
   `public/resources/Managing-Aggressive-Behavior.pdf` (574,559 bytes).
2. Check Network: extraction returns 200, uses multipart with a boundary, and
   returns two pages and 943 words. Select the condition, save as draft, and
   reopen the PDF preview, then approve it. Save returns 201, approval returns 200,
   and the protected PDF returns 200.
3. In the care resource library, select Add Guide, complete its metadata, attach
   the same PDF and publish. Publication returns 201; open the protected PDF.
4. Repeat these screens with a 390 × 844 viewport and touch emulation. This does
   not certify Safari or a physical phone's native PDF viewer.
5. Submit a file of 12 MiB + 1 byte as multipart. Expect the backend's JSON 413
   response. The proxy total-body limit must leave room for multipart overhead.
6. For the comparison only, submit the same PDF as base64 JSON to the extraction
   URL. Expect Apache 413 and the error log entry `Request body no files data
length is larger than the configured limit (131072)`. This proves the old
   transport problem without reducing request inspection protections.

The original stock-CRS run also rejected extracted text resent in the draft save
with RCE rules 932230/932235/932250 matching ordinary document prose. Saving a PDF
reference instead addresses that request without disabling those rules.

These isolated checks do not establish the active configuration of the public
server. After deploying both packages together, repeat the browser upload checks
on the deployed origin and inspect its Apache/ModSecurity logs. Keep WAF rules
enabled; other site-specific rules and manually entered text may need separate,
narrowly reviewed tuning based on the actual rule ID and request field.

## Verification result (2026-11-22)

The isolated Apache run reproduced the legacy JSON 413 at the unchanged 128 KiB
non-file limit. Six Chromium checks passed: legacy rejection; desktop and mobile
Assistant Guide upload/save/reopen/approval; desktop and mobile care resource PDF
publication/access; and over-limit multipart rejection. No browser page errors
were observed. Automated checks passed: 33 frontend tests, 51 backend tests on
PostgreSQL 16, four release-tooling tests, typechecking, ESLint, formatting and
production builds. Both dependency audits reported zero known vulnerabilities.
The backend suite used two concurrent test files to fit the isolated test host;
a first unrestricted run hit a database connection timeout during parallel
registration while other build/browser checks were running.

## Platform-update follow-up

The current release has one Guides page, a plain moderator form and CS Admin diagnostics. Extraction statistics in the historical reproduction above describe the admin response; moderators receive plain upload readiness and no pages/word/chunk details. See [platform verification](platform-update.md) for current desktop/mobile evidence.

The follow-up stock-proxy test found a separate **200004 unmatched-boundary false positive** for July-2012.pdf, while the larger Managing-Aggressive-Behavior.pdf passed. A reviewed POST/exact-route exception for only that rule allowed both files and retained other validation/access limits in local tests. The [deployment runbook](../deployment.md#confirmed-local-multipart-false-positive-rule-200004) documents the evidence, narrow example and remaining proxy malformed-body error mapping. Confirm the live audit rule before applying any exception.
