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
(legacy DOC), **xlsx** (XLSX/XLS/CSV/TSV), **parse5** (HTML), **@xmldom/xmldom**
(Office XML), and **@iarna/rtf-to-html** (RTF); **@types/adm-zip** provides development
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

Default match strictness is **0.60**. Matching handles Unicode, accents, common
word forms, and configured related words. Rare query terms carry more weight;
body matches use nearby passages and receive an 0.88 weight. Exact titles and
approved questions match completely. Unrelated queries return no content.
Topic suggestions use existing category names and relevant published content.
Unfamiliar document headings become new topics; unfinished or ambiguous questions
use General guidance. Staff can choose a different topic. Unused automatically
created draft topics stay out of the public topic list.

Readers preserve headings and inline words, decode Unicode text, retain lists,
and detect spreadsheet question/answer columns in either order. Commas in prose
stay document text. PDFs are inspected page by page so a scanned page is still
read when another page contains typed text. OCR content requires review before
publication. The patient-identity approval section has been removed.

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

`npm test` exercises the content lifecycle, optimistic concurrency, document-heading regressions, permissions on every staff endpoint, admin-only controls,
matching, safety, durable restart, archives, upload deduplication, macro refusal,
file readers, and scan text reading. Browser validation covered 360, 390, 768,
820, 1024, 1280, and 1440 px in light and dark themes, plus publishing a PDF and
CSV and editing/removing/restoring on a phone-sized viewport.

The app still uses demo persona identity: a staff ID supplied in `x-user-id` is
not real authentication. Real login is deliberately outside this change. DOC and HEIC readers
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
