# Hopkins Care Partner Connect

Secure, clinician-moderated knowledge exchange and peer support platform for Frontotemporal Dementia (FTD) care partners, featuring real-time clinical guidance, private clinician communication with Dr. Seema Gulyani, and regional support cohorts.

---

## 🚀 Quick Start (Local Development)

```bash
# 1. Install dependencies
npm install

# 2. Run the development server (runs Express backend + Vite frontend)
npm run dev

# App runs locally at http://localhost:3000
```

## Chatbot Knowledge

Clinic staff can open **Dashboard → Chatbot Knowledge** to upload files, review
and correct draft content, publish it, try the care partner chatbot, and read the
change history. Uploading and editing never publish automatically. Live edits
remain drafts until **Save and update chatbot** is confirmed. Removed content is
archived and can be restored. System administrators additionally see Advanced.

### Development and system tools

Use **Node.js 24** (including its built-in SQLite support) and npm 11:

```bash
npm ci
npm run dev
npm run lint
npm test
npm run build
# Serve the complete built application, including its API:
NODE_ENV=production npm run dev
```

PDF and photo reading uses `pdfinfo`, `pdftotext`, and `pdftoppm` from
**poppler-utils**, **tesseract-ocr** with English language data, and ImageMagick's
`convert` / `identify`. ImageMagick needs a libheif-enabled build for HEIC.
These tools are present in the prepared cloud environment. On Debian/Ubuntu,
install them using `apt-get install poppler-utils tesseract-ocr imagemagick`.
The application does not download or execute tools during an upload.

File-reading dependencies added: **file-type** (content detection), **adm-zip**
(inspection of Office/ODT containers), **mammoth** (DOCX), **word-extractor**
(legacy DOC), and **xlsx** (XLSX/XLS/CSV/TSV); **@types/adm-zip** provides development
types. The committed npm lockfile makes installation repeatable. Files with macros,
encryption, excessive expanded size, or unreadable content are refused. Documents
can be at most 25 MB; PDFs can contain at most 300 pages. The picker accepts ten
files per batch; errors are reported individually. Split large spreadsheets into
batches of no more than 2,000 questions. Hidden and empty sheets are excluded.
Scanned text always requires a human double-check before publication.

### Storage, matching, and safety

SQLite stores knowledge, drafts, topics, settings, checks, and history in
`data/knowledge/knowledge.sqlite`; originals have generated names under
`data/knowledge/uploads/`. The whole `data/` folder is ignored by Git. Set
`KNOWLEDGE_DATA_DIR` to use another durable volume; back up the SQLite database
and uploads together. Keep one application process per store. Original files are
available only through staff-authorized endpoints. The existing discussion,
member, update, and calendar stores retain their existing behavior.

Only the first three mock FAQs and the four original guides seed a **new** store.
Seed files are never a client fallback or a substitute for an existing database.
The Guides page only shows enabled, live content marked for that page. The
question browser and Guides page share the managed topic list.

Default match strictness is **0.60**. Matching ignores common question words,
uses related-word groups, and requires coverage of at least 60% of the meaningful
question words in titles/questions/search wording. Body matches receive an 0.8
weight, so they require at least 75% coverage at the default setting. Exact own
questions match completely. Tests calibrate every seeded item's own question or
title, both off-topic examples (pizza and the capital of France), and a removed
FAQ's driving question. There is no default-to-first-item behavior. A specific
question covered by one of the four preserved guides can still use that guide.

Update triggers within three seconds are coalesced into one serialized update:
a complete candidate is validated, written to SQLite, and then made available
atomically. Required safety failures leave the
previous content serving; failures are recorded. Each update runs content and
safety checks and retains the five most recent saved states for admin rollback.
No overlapping builds or separate background service is required. Clinician checks expose
plain outcomes; only the administrator verification endpoint returns match
information. Medication/remedy terms and clinic numbers live in
`server/safety.ts` and are never editable in the workspace.

`GEMINI_API_KEY` remains optional. Without it the chatbot quotes approved text.
With it Gemini receives only the matched source, capped at 12,000 characters,
and can select an exact passage. Any output that adds or changes source text,
invalid output, or service failure falls back to approved text. Safety responses
and no-content responses never go to the model. Try It uses the same answer
function as care partners. Live knowledge is checked again before returning a
model response so an in-flight request cannot revive removed content.

### Verification and current limits

`npm test` exercises the content lifecycle, optimistic concurrency, privacy
acknowledgments, permissions on every staff endpoint, admin-only controls,
matching, safety, durable restart, archives, upload deduplication, macro refusal,
file readers, and scan text reading. Browser validation covered 360, 390, 768,
820, 1024, 1280, and 1440 px in light and dark themes, plus publishing a PDF and
CSV and editing/removing/restoring on a phone-sized viewport.

The app still uses demo persona identity: a staff ID supplied in `x-user-id` is
not real authentication. Real login is deliberately outside this change. Privacy
warnings are conservative heuristics, not a guarantee that all patient information
has been found; the staff review step remains essential. DOC and HEIC readers
are implemented, but those two formats and a live Gemini account have not been
validated with real-world files/credentials in this environment. Unusual scans,
complex document layouts, or legacy formatting may need correction during review.

The browser regression test is optional and does not add a runtime dependency:

```bash
npm install --prefix /tmp/ftd-browser-check playwright
PLAYWRIGHT_MODULE_PATH=/tmp/ftd-browser-check/node_modules/playwright/index.mjs \
CHROMIUM_PATH=/usr/bin/chromium npm run test:browser
```

It uses an isolated temporary database and the synthetic PDF fixture, checks all
seven sizes in both themes, and exercises publish/edit/archive/restore and role
visibility. Screenshots are saved under `/tmp/ftd-browser-artifacts` (override with
`BROWSER_ARTIFACT_DIR`). Existing Google Fonts proxy failures are excluded from
application console errors. Set `BROWSER_TEST_PORT` if port 3420 is occupied.
