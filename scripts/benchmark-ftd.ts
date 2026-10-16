/** Audit public files in an isolated store. Never publishes to the application store.
 * node --import tsx scripts/benchmark-ftd.ts manifest.json output-directory
 */
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { promisify } from "node:util";
import { execFile } from "node:child_process";
import type { KnowledgeState } from "../src/types/knowledge.ts";
const exec = promisify(execFile);
interface Anchor {
  query: string;
  referenceExcerpt: string;
  kind: string;
}
interface Source {
  id: string;
  name: string;
  url: string;
  path?: string;
  extension: string;
  sha256: string;
  kind: string;
  anchors: Anchor[];
  referenceWords?: number;
  parentId?: string;
}
const [manifestPath, destination, applicationDirectory] = process.argv.slice(2);
const applicationRoot = applicationDirectory
  ? resolve(applicationDirectory)
  : fileURLToPath(new URL("../", import.meta.url));
const moduleURL = (name: string) =>
  pathToFileURL(join(applicationRoot, "server", name + ".ts")).href;
if (!manifestPath || !destination)
  throw Error("Usage: benchmark-ftd.ts manifest.json output-directory");
const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
  files: Source[];
  seed: number;
  sampling: string;
  discoveryLimit: string;
};
const out = resolve(destination);
await mkdir(join(out, "downloads"), { recursive: true });
await mkdir(join(out, "extracted"), { recursive: true });
const isolated = await mkdtemp(join(tmpdir(), "ftd-benchmark-"));
process.env.KNOWLEDGE_DATA_DIR = isolated;
// Keep independent OCR runs from oversubscribing the machine.
process.env.OMP_THREAD_LIMIT = "1";
process.env.MAGICK_THREAD_LIMIT = "1";
const [
  { readUpload },
  { tokens, rank },
  { SYNONYM_MAP },
  { getState, normalize, answer },
] = await Promise.all([
  import(moduleURL("fileReading")) as Promise<
    typeof import("../server/fileReading.ts")
  >,
  import(moduleURL("knowledgeMatching")) as Promise<
    typeof import("../server/knowledgeMatching.ts")
  >,
  import(moduleURL("vocabulary")) as Promise<
    typeof import("../server/vocabulary.ts")
  >,
  import(moduleURL("knowledgeStore")) as Promise<
    typeof import("../server/knowledgeStore.ts")
  >,
]);
const uploadDrafts = existsSync(join(applicationRoot, "server/uploadDrafts.ts"))
  ? (await import(moduleURL("uploadDrafts"))).uploadDrafts
  : (result: any) =>
      result.sections.map((section: any) => ({
        title: section.title,
        answer: section.text,
        visibility: "guides",
        unclearAccepted: !result.unclear,
      }));
const state: KnowledgeState = {
  ...getState(),
  items: [],
  files: [],
  history: [],
  snapshots: [],
  checks: [],
  settings: { synonyms: SYNONYM_MAP, minimum: 0.6, resultCount: 3 },
};
const canonical = (s: string) =>
  s
    .normalize("NFKC")
    .replace(/\u00ad/g, "")
    .replace(/(\p{L})-\s*\n\s*(\p{L})/gu, "$1$2")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
const recall = (a: string, b: string) => {
  const wanted = new Set(tokens(a)),
    found = new Set(tokens(b));
  return wanted.size
    ? [...wanted].filter((w) => found.has(w)).length / wanted.size
    : null;
};
const rows: any[] = [];
try {
  for (const file of manifest.files) {
    const started = performance.now();
    const row: any = {
      id: file.id,
      name: file.name,
      extension: file.extension,
      url: file.url,
      kind: file.kind,
      sha256: file.sha256,
      parentId: file.parentId,
      anchors: file.anchors,
      issues: [],
    };
    try {
      let path = file.path;
      if (!path) {
        path = join(out, "downloads", `${file.id}-${basename(file.name)}`);
        await exec(
          "curl",
          [
            "--fail",
            "--silent",
            "--show-error",
            "--location",
            "--proto",
            "=https",
            "--proto-redir",
            "=https",
            "--max-time",
            "90",
            "--max-filesize",
            "26214400",
            file.url,
            "--output",
            path,
          ],
          { timeout: 95000 },
        );
      }
      const bytes = await readFile(path);
      if (createHash("sha256").update(bytes).digest("hex") !== file.sha256)
        throw Error(
          "Source checksum changed; review the source before updating the manifest.",
        );
      const parsed = await readUpload(bytes, file.name, path);
      const text = [
        ...parsed.sections.map((s) => s.title + "\n" + s.text),
        ...(parsed.sheets || []).map((s) =>
          s.rows.map((r) => r.join("\t")).join("\n"),
        ),
      ].join("\n\n");
      row.success = true;
      row.mime = parsed.mime;
      row.ocr = parsed.unclear;
      row.sectionCount = parsed.sections.length;
      row.sheetCount = parsed.sheets?.length || 0;
      row.words = text.split(/\s+/).length;
      row.largestSectionWords = Math.max(
        0,
        ...parsed.sections.map((s) => s.text.split(/\s+/).length),
      );
      row.firstTitles = parsed.sections.slice(0, 5).map((s) => s.title);
      row.extractedFtdMentions = (
        text.match(
          /fronto[ -]?temporal|\bFTD\b|\bFTLD\b|TDP[ -]?43|primary progressive aphasia/gi,
        ) || []
      ).length;
      if (row.largestSectionWords > 1000)
        row.issues.push(
          "Oversized section: retrieval returns excessive context.",
        );
      if (row.words < (file.referenceWords || 0) * 0.5)
        row.issues.push(
          "Extracted word count is less than half the independent reference.",
        );
      if (
        parsed.sections.some((s) =>
          /^(?:[•·\-—]|page \d+|\d+|copyright|contents|menu|home|skip to)/i.test(
            s.title.trim(),
          ),
        )
      )
        row.issues.push("At least one weak or boilerplate section title.");
      if (text.includes(" — continued — continued"))
        row.issues.push("Repeated continuation label.");
      await writeFile(join(out, "extracted", `${file.id}.txt`), text);
      const drafts: any[] = uploadDrafts(parsed, file.name, state);
      for (const sheet of parsed.sheets || []) {
        const head = sheet.rows[sheet.headerRow] || [];
        if (
          !/question|prompt|inquiry|^q$/i.test(
            head[sheet.questionColumn] || "",
          ) ||
          !/answer|response|reply|guidance|^a$/i.test(
            head[sheet.answerColumn] || "",
          )
        )
          row.issues.push(
            `Unverified Q&A mapping in sheet ${sheet.name}: columns ${sheet.questionColumn + 1}/${sheet.answerColumn + 1}.`,
          );
        for (const cells of sheet.rows
          .slice(sheet.headerRow + 1)
          .slice(0, 2000)) {
          const question = cells[sheet.questionColumn]?.trim(),
            response = cells[sheet.answerColumn]?.trim();
          if (question && response)
            drafts.push({
              title: question,
              question,
              answer: response,
              visibility: "chatbot",
            } as any);
        }
      }
      const topicNames = new Map<string, number>();
      drafts.forEach((draft, index) => {
        const d = draft.topicContext ? draft : normalize(draft, state);
        const topic = state.topics.find((t) => t.id === d.topicId)!.name;
        topicNames.set(topic, (topicNames.get(topic) || 0) + 1);
        state.items.push({
          id: `${file.id}/${index}`,
          type: "question" in draft ? "question" : "document",
          status: "Draft",
          live: d,
          draft: null,
          revision: 1,
          updatedAt: "",
          updatedBy: "Isolated benchmark",
        });
      });
      row.topics = Object.fromEntries(topicNames);
      row.draftCount = drafts.length;
      row.anchorRetention = file.anchors.map((a) => ({
        query: a.query,
        tokenRecall: recall(a.referenceExcerpt, text),
        contiguous: canonical(text).includes(canonical(a.referenceExcerpt)),
      }));
    } catch (error) {
      row.success = false;
      row.error = error instanceof Error ? error.message : String(error);
    }
    row.milliseconds = Math.round(performance.now() - started);
    rows.push(row);
    console.log(
      `${file.id} ${file.extension} ${row.success ? `${row.words} words; ${row.sectionCount} sections; ${row.issues.length} issues` : row.error}`,
    );
  }
  // Simulate a batch import, followed by approval in this isolated state only.
  state.items.forEach((item) => {
    item.status = "Live";
  });
  await writeFile(join(out, "state.json"), JSON.stringify(state));
  const queries: any[] = [];
  const isolatedStates = new Map(
    manifest.files.map((file) => [
      file.id,
      {
        ...state,
        items: state.items.filter((item) => item.id.startsWith(file.id + "/")),
      },
    ]),
  );
  for (const file of manifest.files)
    for (const anchor of file.anchors) {
      const matches = rank(anchor.query, state);
      const result = answer(anchor.query, state);
      const top = matches[0];
      const chosen = top?.item.live;
      const isolatedResult = answer(anchor.query, isolatedStates.get(file.id)!);
      queries.push({
        id: file.id,
        query: anchor.query,
        kind: anchor.kind,
        expectedExcerpt: anchor.referenceExcerpt,
        topSource: top?.item.id || null,
        topScore: top?.score || 0,
        expectedFileTop1: top?.item.id.startsWith(file.id + "/") || false,
        expectedFileTop3: matches.some((m) =>
          m.item.id.startsWith(file.id + "/"),
        ),
        noContent: result.noContent === true,
        safetyIntercept: !result.noContent && !result.citedResources.length,
        answerWords: result.answer.split(/\s+/).length,
        answerTokenRecall: recall(anchor.referenceExcerpt, result.answer),
        isolatedNoContent: isolatedResult.noContent === true,
        isolatedAnswerTokenRecall: recall(
          anchor.referenceExcerpt,
          isolatedResult.answer,
        ),
        modelPrefixTokenRecall: chosen
          ? recall(
              anchor.referenceExcerpt,
              (top.context || chosen.answer).slice(0, 12000),
            )
          : 0,
        answerPreview: result.answer.slice(0, 800),
      });
    }
  const naturalQuestions = [
    {
      query: "What are the symptoms of frontotemporal dementia?",
      evidence: ["ftd-33", "ftd-34"],
      expected: "social behaviour and a lack of inhibitions",
    },
    {
      query: "How does FTD affect personality and behavior?",
      evidence: ["ftd-33", "ftd-34"],
      expected: "behaviour, learning, personality and emotions",
    },
    {
      query: "At what ages is frontotemporal dementia more common?",
      evidence: ["ftd-33", "ftd-34"],
      expected: "45 to 65",
    },
    {
      query: "Which conditions can FTD be mistaken for?",
      evidence: ["ftd-33", "ftd-34"],
      expected: "depression, stress, anxiety, psychosis",
    },
    {
      query: "Can an EEG pattern diagnose dementia by itself?",
      evidence: ["ftd-03"],
      expected: "not a diagnosis on its own",
    },
    {
      query: "How many people with FTD were included in the EEG dataset?",
      evidence: ["ftd-01", "ftd-03", "ftd-11"],
      expected: "23",
    },
    {
      query:
        "Does cutting EEG into more windows create more independent patients?",
      evidence: ["ftd-03"],
      expected: "do not create more independent patients",
    },
    {
      query: "Are the reported model results clinical diagnostic performance?",
      evidence: ["ftd-11"],
      expected:
        "not external validation, medical-device evidence, or clinical diagnostic performance",
    },
  ].map((probe) => {
    const result = answer(probe.query, state);
    return {
      ...probe,
      topSource: result.citedResources[0]?.id || null,
      noContent: result.noContent === true,
      expectedSource: probe.evidence.some((id) =>
        result.citedResources[0]?.id.startsWith(id + "/"),
      ),
      evidenceInAnswer: canonical(result.answer).includes(
        canonical(probe.expected),
      ),
      answerPreview: result.answer.slice(0, 1800),
    };
  });
  const negatives = [
    "best pizza in Baltimore",
    "capital of France",
    "Where do I collect the teal clinic folder?",
    "What is the approved FTD protocol for quantum teleportation?",
    "Can frontotemporal dementia be diagnosed from a horoscope?",
    "Does FTD mean that pineapple juice restores neurons?",
  ].map((query) => ({ query, ...answer(query, state) }));
  const summary = {
    files: rows.length,
    parsed: rows.filter((r) => r.success).length,
    failed: rows.filter((r) => !r.success).length,
    byExtension: Object.fromEntries(
      [...new Set(rows.map((r) => r.extension))].map((ext) => [
        ext,
        {
          total: rows.filter((r) => r.extension === ext).length,
          parsed: rows.filter((r) => r.extension === ext && r.success).length,
        },
      ]),
    ),
    filesWithIssues: rows.filter((r) => r.issues.length).length,
    drafts: state.items.length,
    distinctTopics: new Set(state.items.map((i) => i.live!.topicId)).size,
    oversizedSections: rows.filter((r) => r.largestSectionWords > 1000).length,
    anchors: queries.length,
    sourceTop1: queries.filter((q) => q.expectedFileTop1).length,
    sourceTop3: queries.filter((q) => q.expectedFileTop3).length,
    noContent: queries.filter((q) => q.noContent).length,
    safetyIntercepts: queries.filter((q) => q.safetyIntercept).length,
    referenceEvidenceInAnswer: queries.filter((q) => q.answerTokenRecall >= 0.9)
      .length,
    isolatedReferenceEvidenceInAnswer: queries.filter(
      (q) => q.isolatedAnswerTokenRecall >= 0.9,
    ).length,
    referenceEvidenceInModelPrefix: queries.filter(
      (q) => q.modelPrefixTokenRecall >= 0.9,
    ).length,
    naturalQuestions: naturalQuestions.length,
    naturalEvidenceInAnswer: naturalQuestions.filter((q) => q.evidenceInAnswer)
      .length,
    negativeQueries: negatives.length,
    negativeAbstentions: negatives.filter((q) => q.noContent).length,
  };
  const codeHashes = Object.fromEntries(
    await Promise.all(
      [
        "fileReading",
        "documentText",
        "knowledgeMatching",
        "knowledgeStore",
        "knowledgeAnswer",
        "knowledgeRoutes",
        "uploadDrafts",
      ]
        .filter((name) =>
          existsSync(join(applicationRoot, "server", name + ".ts")),
        )
        .map(async (name) => [
          name,
          createHash("sha256")
            .update(
              await readFile(join(applicationRoot, "server", name + ".ts")),
            )
            .digest("hex"),
        ]),
    ),
  );
  await writeFile(
    join(out, "results.json"),
    JSON.stringify(
      {
        codeHashes,
        runAt: new Date().toISOString(),
        seed: manifest.seed,
        sampling: manifest.sampling,
        discoveryLimit: manifest.discoveryLimit,
        summary,
        files: rows,
        queries,
        naturalQuestions,
        negatives,
      },
      null,
      2,
    ),
  );
  const csv = (v: unknown) => '"' + String(v ?? "").replace(/"/g, '""') + '"';
  await writeFile(
    join(out, "files.csv"),
    [
      "id,name,extension,kind,success,words,sections,largestSectionWords,topics,issues,error,url",
      ...rows.map((r) =>
        [
          r.id,
          r.name,
          r.extension,
          r.kind,
          r.success,
          r.words,
          r.sectionCount,
          r.largestSectionWords,
          JSON.stringify(r.topics),
          r.issues.join(" | "),
          r.error,
          r.url,
        ]
          .map(csv)
          .join(","),
      ),
    ].join("\n"),
  );
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await rm(isolated, { recursive: true, force: true });
}
