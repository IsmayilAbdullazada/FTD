import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { CLINICAL_50_FAQ } from "../src/data/clinicalRagFaq.ts";
import { clinicalResources } from "./seedGuides.ts";
import { SYNONYM_MAP } from "./vocabulary.ts";
import { tokens, rank, suggestTopic } from "./knowledgeMatching.ts";
import { NO_GUIDE, safetyReply } from "./safety.ts";
import type { ClinicalResource } from "../src/types/index.ts";
import type {
  KnowledgeState,
  KnowledgeText,
  KnowledgeItem,
  KnowledgeAction,
  KnowledgeAnswer,
} from "../src/types/knowledge.ts";
export const dataDir = resolve(
  process.env.KNOWLEDGE_DATA_DIR || "data/knowledge",
);
mkdirSync(dataDir, { recursive: true });
mkdirSync(resolve(dataDir, "uploads"), { recursive: true });
const db = new DatabaseSync(resolve(dataDir, "knowledge.sqlite"));
db.exec(
  "PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)",
);
const labels: Record<string, string> = {
  INCONTINENCE: "Daily Care and Hygiene",
  LEGAL_MEDICAID: "Legal and Financial",
  BEHAVIORAL_AGITATION: "Behavior and Agitation",
  SAFETY_WANDERING: "Safety and Wandering",
  COMMUNICATION_PPA: "Speech and Communication",
  NUTRITION_DIET: "Eating and Nutrition",
};
const now = () => new Date().toISOString();
const text = (
  title: string,
  answer: string,
  topicId: string,
  visibility: KnowledgeText["visibility"],
  question = "",
): KnowledgeText => ({
  title,
  answer,
  topicId,
  visibility,
  question,
  keyPoints: [],
  alternatives: [],
  searchWords: [],
  samples: [
    question || title,
    `Help me with ${title}`,
    `What should I know about ${title}?`,
  ],
  unclearAccepted: true,
});
function seed(): KnowledgeState {
  const topics = [
    ...CLINICAL_50_FAQ.map((f) => ({
      id: f.category,
      name: f.categoryLabel,
      enabled: true,
    })),
    ...Object.entries(labels).map(([id, name]) => ({
      id,
      name,
      enabled: true,
    })),
  ];
  const item = (
    id: string,
    type: KnowledgeItem["type"],
    live: KnowledgeText,
  ): KnowledgeItem => ({
    id,
    type,
    status: "Live",
    live,
    draft: null,
    revision: 1,
    updatedAt: now(),
    updatedBy: "Clinic seed content",
  });
  return {
    topics,
    items: [
      ...CLINICAL_50_FAQ.map((f) =>
        item(f.id, "question", {
          ...text(
            f.question,
            f.physicianAnswer,
            f.category,
            "chatbot",
            f.question,
          ),
          keyPoints: f.keyProtocols,
          alternatives: f.alternateQueries,
          searchWords: f.keywords,
        }),
      ),
      ...clinicalResources.map((r) =>
        item(r.id, "document", {
          ...text(r.title, r.contentBody, r.category, "guides"),
          keyPoints: r.keyTakeaways,
          externalUrl: r.externalUrl,
        }),
      ),
    ],
    history: [],
    files: [],
    settings: { synonyms: SYNONYM_MAP, resultCount: 3, minimum: 0.6 },
    checks: [],
    snapshots: [],
  };
}
const row = db.prepare("SELECT value FROM state WHERE id=1").get();
let state: KnowledgeState = row ? JSON.parse(String(row.value)) : seed();
if (!row)
  db.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify(state));
export const getState = () => structuredClone(state);
export type Actor = { id: string; firstName: string; lastName: string };
export function record(
  s: KnowledgeState,
  actor: Actor,
  action: KnowledgeAction,
  id: string,
  notes: string,
) {
  s.history.unshift({
    id: randomUUID(),
    moderatorId: actor.id,
    moderatorName: `${actor.firstName} ${actor.lastName}`,
    entityType: "KNOWLEDGE",
    entityId: id,
    actionTaken: action,
    notes,
    createdAt: now(),
  });
}
export function retrieve(question: string, s = state) {
  return rank(question, s);
}
let live = structuredClone(state);
export function answer(question: string, s = live): KnowledgeAnswer {
  const safety = safetyReply(question);
  if (safety)
    return {
      ...safety,
      citedResources: [],
      suggestedQuestions: [],
      wording: "local",
    };
  const matches = retrieve(question, s);
  if (!matches.length)
    return {
      answer: NO_GUIDE,
      citedResources: [],
      suggestedQuestions: [],
      noContent: true,
      wording: "local",
    };
  const best = matches[0].item.live!;
  return {
    answer: best.answer,
    citedResources: [
      {
        id: matches[0].item.id,
        title: best.title,
        ...(best.visibility === "guides"
          ? { url: `/guides/${matches[0].item.id}` }
          : {}),
      },
    ],
    suggestedQuestions: s.items
      .filter(
        (i) =>
          i.status === "Live" &&
          i.live?.topicId === best.topicId &&
          i.type === "question" &&
          i.id !== matches[0].item.id,
      )
      .slice(0, 3)
      .map((i) => i.live!.question),
    wording: "local",
  };
}
export function safetyChecks(s = live) {
  return [
    {
      question: "Medication questions are refused",
      passed: answer("What seroquel dosage?", s).isMedicationRefusal === true,
    },
    {
      question: "Unverified remedies are declined",
      passed:
        answer("Can coconut oil help?", s).answer ===
        safetyReply("coconut oil")!.answer,
    },
    ...["best pizza in Baltimore", "capital of France"].map((q) => ({
      question: q,
      passed: answer(q, s).noContent === true,
    })),
    {
      question: "Emergency help points to 911",
      passed: answer("This is an emergency", s).answer.includes("911"),
    },
  ];
}
export function itemChecks(ids: string[], s = live) {
  return ids.flatMap((id) => {
    const i = s.items.find((i) => i.id === id);
    return i?.status === "Live" && i.live
      ? (i.live.samples.length >= 3
          ? i.live.samples
          : [
              i.live.question || i.live.title,
              `Help me with ${i.live.title}`,
              `What about ${i.live.title}?`,
            ]
        ).map((question) => ({
          question,
          itemId: id,
          passed:
            !safetyReply(question) && retrieve(question, s)[0]?.item.id === id,
        }))
      : [];
  });
}
let updateError = "";
export const updateStatus = () =>
  pendingUpdates.length
    ? "Updating the chatbot…"
    : updateError || "The chatbot is using your latest content";
function commitChange(
  actor: Actor,
  action: KnowledgeAction,
  id: string,
  notes: string,
  mutate: (s: KnowledgeState) => void,
  update = false,
) {
  try {
    const next = structuredClone(state);
    mutate(next);
    next.topics = next.topics.filter(
      (t) =>
        !t.automatic ||
        next.items.some(
          (i) => i.live?.topicId === t.id || i.draft?.topicId === t.id,
        ),
    );
    record(next, actor, action, id, notes);
    if (update) {
      const candidate = structuredClone(next);
      const checks = safetyChecks(candidate);
      if (checks.some((c) => !c.passed))
        throw new Error(
          "The safety checks need attention. Your previous content is still available.",
        );
      const itemResults = itemChecks(
        next.items.filter((i) => i.status === "Live").map((i) => i.id),
        candidate,
      );
      next.checks = [...checks, ...itemResults];
      next.items.forEach((i) => {
        const c = itemResults.filter((c) => c.itemId === i.id);
        if (c.length && c.every((c) => c.passed)) i.checkedAt = now();
        else delete i.checkedAt;
      });
      next.snapshots.unshift({
        id: randomUUID(),
        at: now(),
        items: structuredClone(next.items),
        topics: structuredClone(next.topics),
        settings: structuredClone(next.settings),
      });
      next.snapshots = next.snapshots.slice(0, 5);
      record(next, actor, "UPDATE_COMPLETED", id, "Updated the chatbot");
      record(next, actor, "CHECK_RUN", id, "Checked content and safety");
      if (itemResults.every((c) => c.passed))
        record(next, actor, "CHECKED", id, "Checks passed");
    }
    db.prepare("UPDATE state SET value=? WHERE id=1").run(JSON.stringify(next));
    state = next;
    if (update) {
      live = structuredClone(next);
      updateError = "";
    }
    return getState();
  } catch (error) {
    if (update) {
      updateError =
        "We couldn't finish updating. Care partners are still seeing your previous content. Try again.";
      const failed = structuredClone(state);
      record(
        failed,
        actor,
        "UPDATE_FAILED",
        id,
        "Could not finish updating; previous content is still available",
      );
      try {
        db.prepare("UPDATE state SET value=? WHERE id=1").run(
          JSON.stringify(failed),
        );
        state = failed;
      } catch {
        /* A storage failure must not replace the live state. */
      }
    }
    throw error;
  }
}

interface PendingUpdate {
  actor: Actor;
  action: KnowledgeAction;
  id: string;
  notes: string;
  mutate: (s: KnowledgeState) => void;
  resolve: (s: KnowledgeState) => void;
  reject: (error: unknown) => void;
}
const pendingUpdates: PendingUpdate[] = [];
let updateTimer: ReturnType<typeof setTimeout> | undefined;
// Coalesce publication, archival, restoration, checks and admin triggers for three seconds.
// One synchronous commit builds and validates the complete candidate, writes it durably,
// then swaps it. Draft saves during the wait are preserved by reading state at flush time.
export function change(
  actor: Actor,
  action: KnowledgeAction,
  id: string,
  notes: string,
  mutate: (s: KnowledgeState) => void,
  update = false,
): KnowledgeState | Promise<KnowledgeState> {
  if (!update) return commitChange(actor, action, id, notes, mutate, false);
  return new Promise((resolve, reject) => {
    pendingUpdates.push({ actor, action, id, notes, mutate, resolve, reject });
    if (!updateTimer) updateTimer = setTimeout(flushUpdates, 3000);
  });
}
function flushUpdates() {
  updateTimer = undefined;
  const batch = pendingUpdates.splice(0);
  let staged = structuredClone(state);
  const accepted: PendingUpdate[] = [];
  const failed: { entry: PendingUpdate; error: unknown }[] = [];
  for (const entry of batch) {
    try {
      const candidate = structuredClone(staged);
      entry.mutate(candidate);
      if (safetyChecks(candidate).some((c) => !c.passed))
        throw Error(
          "The safety checks need attention. Your previous content is still available.",
        );
      record(candidate, entry.actor, entry.action, entry.id, entry.notes);
      staged = candidate;
      accepted.push(entry);
    } catch (error) {
      failed.push({ entry, error });
      record(
        staged,
        entry.actor,
        "UPDATE_FAILED",
        entry.id,
        "Could not finish updating; previous content is still available",
      );
    }
  }
  try {
    if (accepted.length) {
      for (const entry of accepted.slice(0, -1)) {
        record(
          staged,
          entry.actor,
          "UPDATE_COMPLETED",
          entry.id,
          "Updated the chatbot",
        );
        record(
          staged,
          entry.actor,
          "CHECK_RUN",
          entry.id,
          "Checked content and safety",
        );
      }
      const last = accepted.at(-1)!;
      commitChange(
        last.actor,
        "UPDATE_COMPLETED",
        last.id,
        "Applied reviewed changes",
        (s) => Object.assign(s, staged),
        true,
      );
    } else {
      const last = batch.at(-1)!;
      commitChange(
        last.actor,
        "UPDATE_FAILED",
        last.id,
        "Could not apply the requested changes",
        (s) => Object.assign(s, staged),
        false,
      );
    }
    if (failed.length)
      updateError =
        "We couldn't finish updating. Care partners are still seeing your previous content. Try again.";
    const result = getState();
    accepted.forEach((entry) => entry.resolve(result));
    failed.forEach(({ entry, error }) => entry.reject(error));
  } catch (error) {
    batch.forEach((entry) => entry.reject(error));
  }
}

export function normalize(
  input: Partial<KnowledgeText>,
  s: KnowledgeState,
): KnowledgeText {
  const clean = (x: unknown) =>
    typeof x === "string" ? x.slice(0, 100000) : "";
  const list = (x: unknown) =>
    Array.isArray(x)
      ? x
          .filter((v): v is string => typeof v === "string")
          .map((v) => v.slice(0, 2000))
          .slice(0, 100)
      : [];
  const title = clean(input.title);
  const q = clean(input.question);
  const topicSuggested =
    input.topicSuggested === true ||
    !s.topics.some((t) => t.id === input.topicId);
  const topicId = topicSuggested
    ? suggestTopic(title, q, clean(input.answer), s)
    : input.topicId!;
  return {
    title,
    question: q,
    answer: clean(input.answer),
    topicId,
    topicSuggested,
    visibility: input.visibility === "guides" ? "guides" : "chatbot",
    keyPoints: list(input.keyPoints),
    alternatives: input.alternatives ? list(input.alternatives) : [q || title],
    searchWords: input.searchWords
      ? list(input.searchWords)
      : tokens(title + " " + q),
    samples: input.samples
      ? list(input.samples)
      : [
          q || title,
          `Help me with ${q || title}`,
          `What should I know about ${q || title}?`,
        ],
    unclearAccepted: input.unclearAccepted !== false,
    externalUrl:
      typeof input.externalUrl === "string" &&
      /^https?:\/\//.test(input.externalUrl)
        ? input.externalUrl
        : undefined,
  };
}
export function faqItems() {
  return live.items
    .filter(
      (i) =>
        i.status === "Live" &&
        i.type === "question" &&
        live.topics.some((t) => t.id === i.live?.topicId && t.enabled),
    )
    .map((i) => ({
      id: i.id,
      category: i.live!.topicId,
      categoryLabel:
        live.topics.find((t) => t.id === i.live!.topicId)?.name || "",
      question: i.live!.question,
      alternateQueries: i.live!.alternatives,
      keywords: i.live!.searchWords,
      physicianAnswer: i.live!.answer,
      keyProtocols: i.live!.keyPoints,
    }));
}
export function guides(): ClinicalResource[] {
  return live.items
    .filter(
      (i) =>
        i.status === "Live" &&
        i.live?.visibility === "guides" &&
        live.topics.some((t) => t.id === i.live!.topicId && t.enabled),
    )
    .map((i) => ({
      id: i.id,
      title: i.live!.title,
      summary: i.live!.answer.slice(0, 200),
      contentBody: i.live!.answer,
      category: i.live!.topicId,
      externalUrl: i.live!.externalUrl,
      keyTakeaways: i.live!.keyPoints,
      diseaseDomain: "FTD",
      createdAt: i.updatedAt,
    }));
}
export const publicTopics = () =>
  live.topics.filter(
    (t) =>
      t.enabled &&
      (!t.automatic ||
        live.items.some(
          (i) => i.status === "Live" && i.live?.topicId === t.id,
        )),
  );
export const snapshotState = () => structuredClone(live);

// Validate the complete durable state before exposing it after process startup.
if (safetyChecks(live).some((c) => !c.passed))
  throw new Error("Knowledge safety validation failed at startup");
if (!state.checks.length) {
  state.checks = [
    ...safetyChecks(live),
    ...itemChecks(
      state.items.filter((i) => i.status === "Live").map((i) => i.id),
      live,
    ),
  ];
  state.items.forEach((i) => {
    const checks = state.checks.filter((c) => c.itemId === i.id);
    if (checks.length && checks.every((c) => c.passed))
      i.checkedAt = new Date().toISOString();
  });
  db.prepare("UPDATE state SET value=? WHERE id=1").run(JSON.stringify(state));
  live = structuredClone(state);
}
