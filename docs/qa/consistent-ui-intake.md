# Consistent UI and care partner intake

The change adds private intake and mandatory Guidelines agreement, restores staff answer testing, and aligns recently added controls with the existing site design. No production service or production records were changed during validation.

## Release requirement

Deploy matching frontend and backend builds. Back up PostgreSQL, apply `014_care_partner_intake` with `npm run migrate:compiled` from the deployed `app/` directory, run `npm run preflight:compiled`, then restart `ftdcare-api.service`. Existing migrations remain unchanged. There are no new environment variables. Existing accounts have no fabricated intake; care partners missing details complete them when setting a password through an emailed link. Existing saved intake survives later resets.

## Automated checks

- TypeScript, ESLint and Prettier.
- 53 frontend tests, including the signed-out App invitation/reset flows, five required details, explicit agreement, invalid reset contexts, canonical Guidelines formatting and retrieval-only answer handling.
- Seven App tests with deliberately delayed lazy-module loading.
- 69 backend tests on PostgreSQL 16 and PostgreSQL 18. New cases cover invalid/missing details, explicit consent, unchanged invitation/reset credentials after failed validation, atomic profile/acknowledgment writes, saved-profile preservation, private public DTOs and protected console metadata.
- Four release-tooling tests and production frontend/backend builds.

## Browser checks

Local Chromium uses the real Vite frontend, Express API and isolated PostgreSQL database. Test records are synthetic. Desktop is 1440 × 900; the touch-enabled mobile viewport is 390 × 844. These checks do not represent physical-device or Safari testing.

| Flow                         | Verified behavior                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation registration      | Required patient age, care partner age, relationship, county and state precede password setup. Empty input cannot advance.                                |
| Final enrollment             | The agreement starts unchecked and is required. Reading Guidelines does not check it. Completing enrollment signs in without another acknowledgment gate. |
| Recovery with missing intake | Details precede password fields; agreement is required; the new password signs in.                                                                        |
| Recovery with saved intake   | Details are not requested again; agreement is required; the new password signs in.                                                                        |
| Staff recovery               | No patient questions; agreement is required; the new password signs in.                                                                                   |
| Guides                       | Upload text, save draft, edit, approve, unpublish, publish and delete through the real UI. Status badges and action buttons retain their behavior.        |
| Test Assistant Guidance      | Answers use the same retrieval-only fallback as Care Companion, with source links; no chunk text or retrieval scores appear.                              |
| Footer and Guidelines        | Only Community Guidelines remains. Four formatted sections replace the duplicated heading; Escape closes the modal.                                       |
| Private admin intake         | Fields are masked until an audited reveal; the table is read-only.                                                                                        |

Light/dark screenshots were visually reviewed. Automated axe checks cover intake, final password setup, Guides and the private admin dialog at both viewport sizes and themes. No browser render errors or horizontal page overflow were observed. Browser scripts, screenshots and machine-readable results are in `/workspace/artifacts/consistent-ui-intake/` in the task workspace; they are not production assets.
