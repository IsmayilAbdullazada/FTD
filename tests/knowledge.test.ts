import { test } from "node:test";
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import AdmZip from "adm-zip";
import * as XLSX from "xlsx";
import type {
  KnowledgeOverview,
  KnowledgeItem,
  KnowledgeAnswer,
} from "../src/types/knowledge.ts";
const port = 3418,
  base = `http://127.0.0.1:${port}`,
  root = "/api/v1/staff/knowledge";
let process: ChildProcess;
let logs = "";
let directory: string;
async function start() {
  logs = "";
  process = spawn(
    globalThis.process.execPath,
    ["--import", "tsx", "server.ts"],
    {
      env: {
        ...globalThis.process.env,
        PORT: String(port),
        KNOWLEDGE_DATA_DIR: directory,
        NODE_ENV: "production",
      },
    },
  );
  process.stdout?.on("data", (s) => (logs += s));
  process.stderr?.on("data", (s) => (logs += s));
  for (let i = 0; i < 100; i++) {
    if (process.exitCode !== null) throw Error(logs);
    try {
      if ((await fetch(base + "/api/v1/knowledge/faq")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error(logs);
}
async function stop() {
  if (process.exitCode !== null) return;
  const done = new Promise<void>((r) => process.once("exit", () => r()));
  process.kill("SIGTERM");
  await done;
}
async function request<T = KnowledgeOverview>(
  path = "",
  body?: unknown,
  user = "user-clinician-1",
  method = "POST",
  expected = 200,
): Promise<T> {
  const r = await fetch(base + root + path, {
    method: body === undefined ? "GET" : method,
    headers: { "x-user-id": user, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await r.json();
  assert.equal(r.status, expected, JSON.stringify(data));
  return data;
}
async function chat(query: string): Promise<KnowledgeAnswer> {
  return fetch(base + "/api/v1/knowledge/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  }).then((r) => r.json());
}
async function upload(
  buffer: Buffer,
  name: string,
  expected = 200,
  extra = {},
) {
  const r = await fetch(base + root + "/uploads", {
    method: "POST",
    headers: {
      "x-user-id": "user-admin-1",
      "x-file-name": encodeURIComponent(name),
      "Content-Type": "application/octet-stream",
      ...extra,
    },
    body: new Uint8Array(buffer),
  });
  const d = await r.json();
  assert.equal(r.status, expected, JSON.stringify(d));
  return d;
}
const draft = {
  type: "question",
  title: "Respite badge collection",
  question: "Where do I collect the respite badge?",
  answer:
    "Collect the respite badge at the green desk beside the clinic entrance.",
  topicId: "APATHY",
  visibility: "chatbot",
  samples: [
    "Where do I collect the respite badge?",
    "Help me with respite badge collection",
    "What about the respite badge?",
  ],
  privacyAccepted: [],
  unclearAccepted: true,
};
let id: string;
const item = (s: KnowledgeOverview) => s.items.find((i) => i.id === id)!;
const publish = (s: KnowledgeOverview, expected = 200) =>
  request(
    "/publish",
    { ids: [id], revisions: { [id]: item(s).revision }, confirmed: true },
    "user-admin-1",
    "POST",
    expected,
  );
test("durable knowledge workflow", async (t) => {
  directory = await mkdtemp(join(tmpdir(), "ftd-tests-"));
  await start();
  try {
    await t.test(
      "only three mock FAQs and four original guides; matching and safety calibrated",
      async () => {
        const faqs = await fetch(base + "/api/v1/knowledge/faq").then((r) =>
          r.json(),
        );
        assert.deepEqual(
          faqs.map((f: { id: string }) => f.id),
          ["faq-1", "faq-2", "faq-3"],
        );
        assert.equal(
          (await fetch(base + "/api/v1/resources").then((r) => r.json()))
            .length,
          4,
        );
        const s = await request();
        for (const i of s.items) {
          const result = await chat(i.live!.question || i.live!.title);
          assert.equal(result.citedResources[0]?.id, i.id);
        }
        for (const q of [
          "best pizza in Baltimore",
          "capital of France",
          "How do I stop my loved one from driving safely?",
        ])
          assert.equal((await chat(q)).noContent, true, q);
        assert.equal(
          (await chat("What seroquel dosage?")).isMedicationRefusal,
          true,
        );
        assert.match((await chat("coconut oil")).answer, /cannot provide/);
        assert.match((await chat("emergency")).answer, /911/);
        assert.ok(s.checks.length >= 5);
      },
    );
    await t.test(
      "all staff routes deny care partners and anonymous actors; advanced is admin only",
      async () => {
        const routes: [string, string][] = [
          ["", "GET"],
          ["/topics", "POST"],
          ["/drafts", "POST"],
          ["/items/missing", "PUT"],
          ["/publish", "POST"],
          ["/items/missing/remove", "POST"],
          ["/items/missing/restore", "POST"],
          ["/checks", "POST"],
          ["/items/missing/fix", "POST"],
          ["/privacy/missing", "GET"],
          ["/try", "POST"],
          ["/uploads", "POST"],
          ["/uploads/missing/questions", "POST"],
          ["/files/missing", "GET"],
          ["/advanced", "GET"],
          ["/advanced", "POST"],
          ["/advanced/verify", "POST"],
        ];
        for (const [path, method] of routes)
          for (const user of ["user-care-1", ""])
            await request(
              path,
              method === "GET" ? undefined : {},
              user,
              method,
              403,
            );
        await request("/advanced", undefined, "user-clinician-1", "GET", 403);
        await request("/advanced", {}, "user-clinician-1", "POST", 403);
        const r = await fetch(base + "/api/v1/resources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        assert.equal(r.status, 403);
      },
    );
    await t.test(
      "drafts cannot answer; publish, edit isolation, and concurrent edits",
      async () => {
        let s = await request("/drafts", draft, "user-admin-1");
        id = s.items.at(-1)!.id;
        assert.equal((await chat(draft.question)).noContent, true);
        s = await publish(s);
        assert.equal((await chat(draft.question)).answer, draft.answer);
        const rev = item(s).revision;
        s = await request(
          `/items/${id}`,
          {
            ...item(s).live,
            answer: "Collect the respite badge at the purple desk.",
            revision: rev,
          },
          "user-admin-1",
          "PUT",
        );
        assert.equal((await chat(draft.question)).answer, draft.answer);
        await request(
          `/items/${id}`,
          { ...draft, revision: rev },
          "user-clinician-1",
          "PUT",
          409,
        );
        s = await publish(s);
        assert.equal(
          (await chat(draft.question)).answer,
          "Collect the respite badge at the purple desk.",
        );
        assert.ok(item(s).checkedAt);
      },
    );
    await t.test(
      "archive/restore update answers immediately and history uses real actors",
      async () => {
        let s = await request();
        s = await request(
          `/items/${id}/remove`,
          { revision: item(s).revision, confirmed: true },
          "user-admin-1",
        );
        assert.equal((await chat(draft.question)).noContent, true);
        s = await request(
          `/items/${id}/restore`,
          { revision: item(s).revision, confirmed: true },
          "user-admin-1",
        );
        assert.equal((await chat(draft.question)).noContent, undefined);
        const entry = s.history.find(
          (h) => h.entityId === id && h.actionTaken === "RESTORE",
        );
        assert.equal(entry?.moderatorName, "Hopkins CS Infrastructure Lead");
        const ledger = await fetch(base + "/api/v1/moderation/audit", {
          headers: { "x-user-id": "user-admin-1" },
        }).then((r) => r.json());
        assert.ok(ledger.some((h: { id: string }) => h.id === entry!.id));
      },
    );
    await t.test(
      "privacy warnings block publishing until acknowledged; clinic numbers exempt",
      async () => {
        let s = await request("/drafts", {
          ...draft,
          title: "Contact questions",
          question: "Who can I contact?",
          answer:
            "Patient name: John Smith\nEmail john@example.com. Call (410) 955-5147 (option 2) or (410) 502-4163.",
        });
        const previous = id;
        id = s.items.at(-1)!.id;
        const p = await request<{ highlights: string[] }>(`/privacy/${id}`);
        assert.ok(p.highlights.includes("john@example.com"));
        assert.ok(
          !p.highlights.some(
            (x) => x.includes("955-5147") || x.includes("502-4163"),
          ),
        );
        await publish(s, 400);
        s = await request(
          `/items/${id}`,
          {
            ...item(s).draft,
            privacyAccepted: p.highlights,
            revision: item(s).revision,
          },
          "user-clinician-1",
          "PUT",
        );
        s = await publish(s);
        id = previous;
      },
    );
    await t.test(
      "spreadsheet detection, hidden sheets, duplicate files, macro rejection, and originals protected",
      async () => {
        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.aoa_to_sheet([
            ["Question", "Answer"],
            [
              "Where is the visitor lantern?",
              "The visitor lantern is at the blue reception desk.",
            ],
            ["", "Skipped"],
          ]),
          "Questions",
        );
        XLSX.utils.book_append_sheet(
          book,
          XLSX.utils.aoa_to_sheet([["Hidden", "Secret"]]),
          "Hidden",
        );
        book.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 1 }] };
        const file = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
        const u = await upload(file, "renamed.bin");
        assert.equal(u.sheets.length, 1);
        assert.equal(u.sheets[0].questionColumn, 0);
        assert.equal(u.sheets[0].answerColumn, 1);
        assert.equal(u.overview.pendingSheets.length, 1);
        await upload(file, "again.xlsx", 409);
        await request(
          `/files/${u.fileId}`,
          undefined,
          "user-care-1",
          "GET",
          403,
        );
        const s = await request(`/uploads/${u.fileId}/questions`, {
          sheetName: "Questions",
          rows: [
            {
              question: "Where is the visitor lantern?",
              answer: "At the blue reception desk.",
            },
          ],
        });
        assert.equal(s.items.at(-1)?.status, "Draft");
        assert.equal(s.pendingSheets?.length, 0);
        const zip = new AdmZip();
        zip.addFile(
          "word/document.xml",
          Buffer.from("<doc>Some content</doc>"),
        );
        zip.addFile("word/vbaProject.bin", Buffer.from("macro"));
        await upload(zip.toBuffer(), "macros.docx", 400);
      },
    );
    await t.test(
      "simultaneous updates share one atomic update and preserve intervening drafts",
      async () => {
        const before = await request<{ snapshots: { id: string }[] }>(
          "/advanced",
          undefined,
          "user-admin-1",
        );
        const make = async (name: string) => {
          const state = await request(
            "/drafts",
            {
              ...draft,
              title: name,
              question: name,
              answer: `Approved information about ${name}.`,
              samples: [name, `Help me with ${name}`, `What about ${name}?`],
            },
            "user-admin-1",
          );
          return state.items.at(-1)!;
        };
        const first = await make("velvet seashell locker");
        const second = await make("copper thimble cupboard");
        const one = request(
          "/publish",
          {
            ids: [first.id],
            revisions: { [first.id]: first.revision },
            confirmed: true,
          },
          "user-clinician-1",
        );
        const two = request(
          "/publish",
          {
            ids: [second.id],
            revisions: { [second.id]: second.revision },
            confirmed: true,
          },
          "user-admin-1",
        );
        await new Promise((r) => setTimeout(r, 80));
        const pending = await request();
        assert.equal(pending.status, "Updating the chatbot…");
        assert.equal(
          (await chat(first.live?.question || first.draft!.question)).noContent,
          true,
        );
        const waiting = await make("draft waiting for later");
        const results = await Promise.all([one, two]);
        assert.ok(
          results.every(
            (s) =>
              s.items.find((i) => i.id === first.id)!.status === "Live" &&
              s.items.find((i) => i.id === second.id)!.status === "Live",
          ),
        );
        const state = await request();
        assert.equal(
          state.items.find((i) => i.id === waiting.id)!.status,
          "Draft",
        );
        const after = await request<{ snapshots: { id: string }[] }>(
          "/advanced",
          undefined,
          "user-admin-1",
        );
        assert.equal(after.snapshots[1].id, before.snapshots[0].id);
        assert.ok(
          state.history.some(
            (h) =>
              h.entityId === first.id &&
              h.moderatorId === "user-clinician-1" &&
              h.actionTaken === "UPDATE_COMPLETED",
          ),
        );
        assert.ok(
          state.history.some(
            (h) =>
              h.entityId === second.id &&
              h.moderatorId === "user-admin-1" &&
              h.actionTaken === "UPDATE_COMPLETED",
          ),
        );
      },
    );
    await t.test(
      "failed updates retain the prior live content and record the failure",
      async () => {
        const before = await chat(draft.question);
        let state = await request(
          "/drafts",
          {
            ...draft,
            title: "capital of France",
            question: "capital of France",
            answer: "Unrelated content should not become live.",
          },
          "user-admin-1",
        );
        const blocked = state.items.at(-1)!;
        await request(
          "/publish",
          {
            ids: [blocked.id],
            revisions: { [blocked.id]: blocked.revision },
            confirmed: true,
          },
          "user-admin-1",
          "POST",
          400,
        );
        state = await request();
        assert.equal(
          state.items.find((i) => i.id === blocked.id)!.status,
          "Draft",
        );
        assert.equal((await chat(draft.question)).answer, before.answer);
        assert.match(state.status, /previous content/);
        assert.ok(state.history.some((h) => h.actionTaken === "UPDATE_FAILED"));
        await request("/checks", {}, "user-admin-1");
      },
    );
    await t.test(
      "removed content and settings survive restart; public chat never includes debug data",
      async () => {
        await request(
          "/advanced",
          {
            settings: {
              synonyms: { bath: ["shower"] },
              resultCount: 2,
              minimum: 0.6,
            },
          },
          "user-admin-1",
        );
        let s = await request();
        await request(
          `/items/${id}/remove`,
          { revision: item(s).revision, confirmed: true },
          "user-admin-1",
        );
        await stop();
        await start();
        s = await request();
        assert.equal(item(s).status, "Removed");
        assert.equal((await chat(draft.question)).noContent, true);
        const a = await request<{ settings: { resultCount: number } }>(
          "/advanced",
          undefined,
          "user-admin-1",
        );
        assert.equal(a.settings.resultCount, 2);
        assert.equal("debug" in (await chat("bath")), false);
      },
    );
  } finally {
    await stop();
    await rm(directory, { recursive: true, force: true });
  }
});
