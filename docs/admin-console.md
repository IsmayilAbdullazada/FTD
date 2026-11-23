# CS Admin console

The console is available at `?tab=admin` only to active `SYSTEM_ADMIN` accounts
when `ENABLE_ADMIN_CONSOLE=true`. It is disabled by default, including in
production. Set the flag deliberately after reviewing access and retention with
the service owner. The database-reset endpoint remains disabled in production
and is never offered by this console.

## Sections

- **Overview:** deployment/database status and effective configuration.
- **Data:** introspected columns, checks and relationships; search, exact column
  filters, sorting, 50-row default pagination, row inspection, generated forms,
  audited reveals and masked CSV export of the current page (up to 200 rows).
- **Actions:** typed domain operations, including moderation, account/session
  management, recovery, invitations, membership, publication and maintenance.
- **Preview:** moderator or care partner account search and an isolated read-only
  iframe. The ordinary cookie retains the admin identity. A signed 30-minute
  token is held in memory, bound to the admin's session version and target, and
  passed via an origin/source-checked message handshake and `X-Preview-Token`.
- **Diagnostics:** Care Companion retrieval, citations, chunks and scores,
  per-guide word/chunk statistics, index rebuilding and aged upload checks.
- **Audit log:** append-only records of changes, reveals and preview starts.

## Change controls

Every console mutation requires a preview, a written reason of at least ten
characters and a typed table-name confirmation. Signed previews expire after ten
minutes and bind the exact proposal and selected-record snapshots; changed rows
require a new preview. A confirmation is single-operation and idempotent: retrying a successfully committed confirmation returns its existing audit ID rather than repeating the change. Session identity is rechecked after acquiring the mutation lock. Bulk changes are limited to 200 selected rows. Relationship
previews show direct foreign-key counts and delete actions; dependent tables can
have further cascades. Updates/deletes and privileged account actions require a
password check no more than ten minutes old. Proof is server-side and tied to the
admin's session version. Console traffic and password attempts are rate limited.

Domain operations reuse the existing route handlers in the same database
transaction as the console audit entry. Request identity always comes from the
admin's authenticated session. Role/activation changes revoke sessions and may
not demote/deactivate the current admin or remove the last active CS Admin.
New accounts receive an unrecoverable random initial password and use the normal
emailed recovery flow; the console never sets or displays passwords. Deleting a
model with `is_active` deactivates it where its domain rules permit.

Password/token hashes are excluded from the registry and every data response.
Clinical text is masked until a per-row audited reveal and remains redacted in
audit snapshots. CSV cells are masked and protected against spreadsheet formula
interpretation. Internal authentication counters and reauthentication state in
`app_settings` are excluded. Security, migration, derived-index and consent
records are read-only; audit records and upload registry maintenance also use
dedicated operations rather than generic editing. Primary keys, audit timestamps,
actor identity and derived fields cannot be overwritten by a generated form.

Preview blocks all non-GET requests on the server, including authentication
writes, and runs authenticated GET handlers inside a PostgreSQL read-only
transaction. It masks private messages, notes and email fields. It does not mark
messages read, acknowledge guidelines or revoke the admin cookie. Tokens never
appear in URLs or browser storage. Closing/reloading the pane discards its local
state; a reload requires the parent to supply its still-valid token again.

SMTP acceptance and filesystem deletion cannot be rolled back with PostgreSQL.
Recovery is queued; existing invitation delivery retains its domain behavior.
Upload cleanup records an intent audit before touching files, then removes only the approved aged file names and writes a completion/result audit with the registry change. A retry is limited to that original approved set; it cannot expand to newer files. Filesystem effects remain a separate, explicitly recorded phase.
Retain institutional database/upload backups and verify operational SMTP delivery.

## Endpoint coverage matrix

The matrix below records the console or existing signed-in workflow for each
API endpoint. `app/tests/admin-route-coverage.test.ts` inventories Express mounts
and route declarations and fails if an endpoint has no matrix entry. New routes
must be reviewed and mapped rather than receiving a default raw-request action.

| Endpoint                                           | Console / workflow                                                                      |
| -------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `DELETE /api/v1/chatbot/guides/:id`                | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `DELETE /api/v1/events/:id`                        | Data / Actions → calendar events                                                        |
| `DELETE /api/v1/posts/:id`                         | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `DELETE /api/v1/posts/:postId/comments/:commentId` | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `DELETE /api/v1/resources/:id`                     | Data / Actions → resources; existing shared Guides page                                 |
| `DELETE /api/v1/updates/:id`                       | Data / Actions → clinic updates                                                         |
| `GET /api/v1/admin/audit`                          | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/data/:table`                    | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/data/:table/choices`            | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/data/:table/export`             | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/data/:table/row`                | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/database-status`                | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/diagnostics`                    | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/preview-users`                  | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/admin/registry`                       | CS Admin console (corresponding section; reset remains disabled)                        |
| `GET /api/v1/auth/emails/preview/:id`              | Data → read-only, redacted email outbox                                                 |
| `GET /api/v1/auth/emails/recent`                   | Data → read-only, redacted email outbox                                                 |
| `GET /api/v1/auth/invitations/:token`              | Actions → invitations; Data → invitations                                               |
| `GET /api/v1/chat/private`                         | Actions → send private message; Data → masked messages                                  |
| `GET /api/v1/chatbot/guides`                       | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `GET /api/v1/cohorts`                              | Data → groups and membership; Actions → create/reassign                                 |
| `GET /api/v1/cohorts/members`                      | Data → groups and membership; Actions → create/reassign                                 |
| `GET /api/v1/deflection/discussions-pool`          | Diagnostics / read-only role preview / existing Care Companion                          |
| `GET /api/v1/events`                               | Data / Actions → calendar events                                                        |
| `GET /api/v1/health`                               | Overview / deployment health check                                                      |
| `GET /api/v1/moderation/audit`                     | Actions → moderate discussion/reply; Data → moderation audit; existing moderation queue |
| `GET /api/v1/moderation/queue`                     | Actions → moderate discussion/reply; Data → moderation audit; existing moderation queue |
| `GET /api/v1/notifications`                        | Actions → mark own notification read; existing notifications inbox                      |
| `GET /api/v1/policies/status`                      | Data → read-only acknowledgment records; recipient acknowledges personally              |
| `GET /api/v1/posts`                                | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `GET /api/v1/posts/:id`                            | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `GET /api/v1/resources`                            | Data / Actions → resources; existing shared Guides page                                 |
| `GET /api/v1/updates`                              | Data / Actions → clinic updates                                                         |
| `GET /api/v1/users/me`                             | Data → users; Actions → account management                                              |
| `PATCH /api/v1/chatbot/guides/:id/approve`         | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `PATCH /api/v1/chatbot/guides/:id/toggle`          | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `POST /api/v1/admin/data/:table/reveal`            | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/admin/mutations/commit`              | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/admin/mutations/preview`             | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/admin/preview`                       | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/admin/reauthenticate`                | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/admin/reset-database`                | CS Admin console (corresponding section; reset remains disabled)                        |
| `POST /api/v1/auth/change-password`                | Account menu (own account only)                                                         |
| `POST /api/v1/auth/forgot-password`                | Actions → send password-reset link; recipient completes recovery                        |
| `POST /api/v1/auth/invitations`                    | Actions → invitations; Data → invitations                                               |
| `POST /api/v1/auth/invitations/:id/revoke`         | Actions → invitations; Data → invitations                                               |
| `POST /api/v1/auth/login`                          | Existing sign-in screen                                                                 |
| `POST /api/v1/auth/logout`                         | Account menu (own account only)                                                         |
| `POST /api/v1/auth/register`                       | Invitation enrollment (never enroll on behalf of a user)                                |
| `POST /api/v1/auth/reset-password`                 | Actions → send password-reset link; recipient completes recovery                        |
| `POST /api/v1/chat/private`                        | Actions → send private message; Data → masked messages                                  |
| `POST /api/v1/chatbot/extract-pdf`                 | Guides → Upload PDF or text (authenticated multipart)                                   |
| `POST /api/v1/chatbot/guides`                      | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `POST /api/v1/cohorts`                             | Data → groups and membership; Actions → create/reassign                                 |
| `POST /api/v1/cohorts/members/reassign`            | Data → groups and membership; Actions → create/reassign                                 |
| `POST /api/v1/deflection/discussions`              | Diagnostics / read-only role preview / existing Care Companion                          |
| `POST /api/v1/events`                              | Data / Actions → calendar events                                                        |
| `POST /api/v1/knowledge/chat`                      | Diagnostics / read-only role preview / existing Care Companion                          |
| `POST /api/v1/knowledge/deflect`                   | Diagnostics / read-only role preview / existing Care Companion                          |
| `POST /api/v1/moderation/action`                   | Actions → moderate discussion/reply; Data → moderation audit; existing moderation queue |
| `POST /api/v1/notifications/:id/read`              | Actions → mark own notification read; existing notifications inbox                      |
| `POST /api/v1/policies/acknowledge`                | Data → read-only acknowledgment records; recipient acknowledges personally              |
| `POST /api/v1/posts`                               | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `POST /api/v1/posts/:id/comments`                  | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `POST /api/v1/posts/:id/private-note`              | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `POST /api/v1/posts/:id/upvote`                    | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `POST /api/v1/resources`                           | Data / Actions → resources; existing shared Guides page                                 |
| `POST /api/v1/updates`                             | Data / Actions → clinic updates                                                         |
| `PUT /api/v1/chatbot/guides/:id`                   | Data → guides; Actions → guide publication; Diagnostics → search index                  |
| `PUT /api/v1/posts/:id`                            | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `PUT /api/v1/posts/:id/close`                      | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `PUT /api/v1/posts/:id/unmoderated-replies`        | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `PUT /api/v1/posts/:postId/comments/:commentId`    | Data / Actions → discussions, replies, reply policy, private replies and upvotes        |
| `PUT /api/v1/resources/:id`                        | Data / Actions → resources; existing shared Guides page                                 |

Protected file access: `GET /uploads/guides/:file` uses the effective account permissions; files are never served from a public upload alias.

## Operator checklist

Use **Data** for bounded, masked inspection. Choose **Reveal** only for an approved investigation and include its reason. Use **Actions** for domain operations instead of changing security/derived tables. Review the impact preview and the target table before confirming; keep audit retention and uploaded-file backups under the institution's policy.

The registry exposes all application tables. `moderation_audit`, `admin_audit_log` and `guide_uploads` are additionally read-only in the generic editor: domain moderation, append-only audit and approved cleanup actions preserve their provenance. Internal security/confirmation records in `app_settings` are excluded. CSV exports contain the current filtered page, not the entire database.

Diagnostics reports the actual PostgreSQL full-text ranking score. It does not label that score as cosine similarity or a calibrated match percentage. Retrieval operates over approved, active guides. The moderator and care-partner APIs omit extracted pages, chunk counts and retrieval scores while retaining source/page citations where needed.

If a session changes, reauthenticate and generate a new preview. Do not keep preview tokens, passwords or clinical reveals in tickets, logs or screenshots. Closing the preview discards its token; header forwarding through both Apache and nginx must be verified after proxy changes.
