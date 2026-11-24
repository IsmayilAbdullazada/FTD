# Guides card redesign verification

## Scope and decisions

- Cards share the same header height, serif titles, three-line minimum summary area and bottom-aligned footer for every role. Text may wrap beyond three lines on small screens instead of clipping a word.
- Staff actions use a keyboard-accessible overflow menu; only drafts keep a primary Approve button in the footer. Delete retains its confirmation. Publish and Unpublish offer Undo for six seconds.
- Menu placement stays inside the viewport and follows scrolling; moving focus into the menu does not scroll the document.
- Short descriptions are required when creating guides (trimmed 20–240 characters), including the admin console. Existing descriptions can be omitted when updating unrelated metadata. Suggested and fallback descriptions remove boilerplate and stop at a sentence or word boundary within 160 characters. PDF text and pages remain unchanged.
- One pure content contract in `app/src/contracts/guideDescription.ts` is shared with the UI through a feature-local re-export; it imports no backend configuration, database or secrets.
- Test Assistant Guidance is above search and the cards and remains moderator-only. The existing pagination controls display six guides per page and reset when search, topic or user changes. This is display pagination; the resource endpoint still loads the library as a whole.
- No migration or library-union authorization changes are included.

## Validation

- `npm run verify`: type checking, ESLint, formatting, 77 frontend tests and four release tests.
- `npm run build`: frontend production build and compiled backend.
- `npm run test:app-loading`: eight delayed-loading App tests.
- `npm run backend:test`: 70 backend tests, including owned PDF storage, unchanged PDF source/pages and missing/short/long description rejection.
- Headless Chromium through Playwright at 1440×900 and 390×844, light and dark: a link, live guide, draft and unpublished guide; titles and footer dividers align within each row (0 px difference). Keyboard menu opening/navigation/Escape and viewport containment passed.
- The real local App confirmed Unpublish, Undo restoration, six-second toast expiry and Publish, with the synthetic fixture restored afterward.
- The real local App was also checked at both widths with more than six guides: paging changes cards, search resets to page one, and the tester precedes the guide list.
- axe-core WCAG A/AA scans of the Guides page: zero violations at both viewport sizes in both themes. Two existing shared-header accessible names were corrected to include their visible labels/counts.

### Measured text contrast

Ratios are measured from computed browser colors, including alpha-composited pill backgrounds. Mobile values match desktop. All exceed the 4.5:1 AA requirement for normal text.

| Element                   |   Light |    Dark |
| ------------------------- | ------: | ------: |
| Topic                     | 12.98:1 |  9.83:1 |
| FTD pill                  |  8.11:1 |  8.95:1 |
| AD pill                   |  8.36:1 |  9.07:1 |
| Draft chip                |  6.84:1 | 12.05:1 |
| Unpublished chip          |  9.45:1 | 11.86:1 |
| Date                      |  7.58:1 |  6.78:1 |
| PDF / website footer cues |  7.58:1 | 12.00:1 |

Raw measurements: [acceptance.json](evidence/guide-card-design/acceptance.json).

## Existing descriptions needing staff review

This list comes **only from the isolated local browser database**, with synthetic test records. Production was not accessed; staff should review production guide descriptions before release. The fallback keeps missing descriptions readable but is not a substitute for an authored description.

| Local guide                                                                                              | Reason              |
| -------------------------------------------------------------------------------------------------------- | ------------------- |
| Card Design QA: Understanding compulsive behaviors and supporting daily routines (`card-design-qa-live`) | Missing description |
| QA plain guide desktop 1795399311392284449 (`guide-8e3405d5-19b6-4d98-9922-bfad5e6197fe`)                | Missing description |
| QA plain guide desktop 1795399363633615210 (`guide-103b9f22-0b5a-4482-aaad-96b4d575b637`)                | Missing description |
| QA plain guide mobile 1795399376118600397 (`guide-a3a249e3-0f3f-41b5-a863-0999d7fda9be`)                 | Missing description |
| QA text desktop 1795544899534142989 (`guide-91a32143-128b-47cf-8329-54729bceb856`)                       | Missing description |
| QA unified guide desktop 1795399008166754549 (`guide-c02d5e22-ec8b-4c31-aac6-7ba37728e58e`)              | Missing description |
| QA unified guide mobile 1795399022349115794 (`guide-8480e89e-be3f-487c-9ba8-8c2c96d58459`)               | Missing description |
| WAF guide 1795446729972454207 (`guide-c157fa55-dd0e-4572-bf89-e840e76ac1ad`)                             | Missing description |

Audit: [description-audit.json](evidence/guide-card-design/description-audit.json).

## Before and after

The screenshots use synthetic mixed-state cards, not patient data. After screenshots include the tester moved above the list.

| View          | Before                                                        | After                                                       |
| ------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Desktop Light | [Before](evidence/guide-card-design/before-desktop-light.png) | [After](evidence/guide-card-design/after-desktop-light.png) |
| Desktop Dark  | [Before](evidence/guide-card-design/before-desktop-dark.png)  | [After](evidence/guide-card-design/after-desktop-dark.png)  |
| Mobile Light  | [Before](evidence/guide-card-design/before-mobile-light.png)  | [After](evidence/guide-card-design/after-mobile-light.png)  |
| Mobile Dark   | [Before](evidence/guide-card-design/before-mobile-dark.png)   | [After](evidence/guide-card-design/after-mobile-dark.png)   |
