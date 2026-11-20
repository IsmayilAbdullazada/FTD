# Deployment and build verification

This follow-up to `8335b8d` includes the role-query hotfix `6598db6` and completes deployment hardening. The earlier 266-check workflow inventory remains historical evidence; the focused packaged-browser checks below verify this follow-up's affected deployment and PDF behavior.

## Changes

- `npm run build` runs the frontend typecheck before writing production output. `npm run verify` runs typechecking, lint, formatting, the complete frontend suite and release-tooling tests. Packaging requires verification and a fresh build.
- The unsupported Testing Library `exact` option is replaced with an anchored role-name matcher. Authentication failure tests mock and assert their expected logger calls; unexpected logs elsewhere are not globally suppressed. `npm run test:list` lists the full suite with a configuration-root-based test search.
- ESLint and typescript-eslint are updated to supported, compatible versions. The dependency audit reports zero vulnerabilities, including development dependencies.
- npm 12's install-script policy approves only the reviewed, locked `esbuild@0.28.2` postinstall, in the workspace root and the exported standalone backend manifest. The source workspace manifest does not repeat the policy, avoiding npm's ignored-workspace-policy warning. It is version-pinned rather than a blanket script approval. npm 12 clean installation is checked with `--strict-allow-scripts`.
- Vite's frontend port is 5173 with an explicit backend proxy to 3000. Production assets are copied from an allowlist; private runtime uploads cannot be exported into the public build. A regression test places a fabricated private PDF in the real upload directory, builds, and verifies it is absent from `dist`.
- The PDF preview uses a named iframe permitted by the production CSP instead of an object blocked by `object-src 'none'`.
- Backend startup validates migration versions/checksums before opening its listener. Preflight also checks explicit absolute upload storage, write permission and SMTP STARTTLS/certificate trust without sending email. Ignored `_probe_` SQL files are excluded and stale compiled migrations are cleared at build time.
- Versioned release archives include runtime outputs, standalone package manifests, public assets, SHA-256 checksums and revision metadata. Secrets, runtime uploads and local dependencies are excluded. A systemd template and [SSH deployment runbook](../deployment.md) cover activation and recovery.
- The deployment checker requires HTTPS, checks actual policy values and response types, validates database health, checks missing chunks return 404 and ensures uploaded files require authentication. Consistent duplicated nginx/backend headers are accepted.
- Docker has an application/database health check; nginx prioritizes API routes and returns 404 for missing assets rather than serving SPA HTML.

## Validation

- Frontend: **13 test files, 31 tests passed**. The full suite is invoked by `npm test`; filtered invocations do not establish a full pass.
- Backend: **45 tests passed on PostgreSQL 16 and 18**, including preflight, configuration and migration-readiness cases. Final focused checks cover missing SMTP, untrusted TLS, invalid/relative upload paths and legacy migration metadata.
- Release tooling: **4 tests passed**, including real-build upload exclusion, artifact contents/checksums, and false-positive deployment-response rejection.
- Packaged application: **8 desktop/mobile Chromium checks passed** over local HTTPS nginx, covering all three roles, secure cookies, permitted screens, logout, and staff PDF upload/extraction/iframe preview with no CSP violation. Mobile means viewport/touch emulation; native PDF rendering across physical devices is not certified.
- An empty database refused backend startup before accepting traffic. Compiled migrations and startup were verified from a separately extracted archive with standalone production dependencies.
- Clean installs, production builds, typechecking, ESLint, Prettier, Docker build, and effective nginx checks passed. npm audit reports **0 vulnerabilities** in both production-only and full dependency trees at verification time.

Detailed logs and mock-browser evidence are stored in `/workspace/artifacts/ftd-deployment-next/`. The install-script policy and dependency changes are validated with npm 12 as well as the environment's npm 11 tooling.

## Interpreting normal build output

Vite's `PLUGIN_TIMINGS` output measures build performance; it is informational when the build exits successfully. The tested app does not require changing production logic to silence it. On WSL, keeping a working checkout in the Linux filesystem (for example `~/projects/FTD`) generally reduces filesystem overhead compared with `/mnt/c/...`; rebuild/install dependencies within the chosen environment rather than copying `node_modules` between operating systems.

Funding notices are informational. Expected authentication failures in tests remain assertions about error handling, not failed logins against real accounts. Use `npm run verify` to assess the complete check result instead of treating a successful Vite build or a filtered test run as release approval.

The public deployment has not been changed by these local checks. Before activating the archive, back up real data/uploads, run the compiled preflight on the server, then verify deployed login/invitation/recovery and actual email delivery. Real SMTP delivery, Safari/iOS, production load, support/policy approval and the public server's effective configuration remain environment-specific checks.
