import { test } from "node:test";
import assert from "node:assert/strict";
import { rank, suggestTopic } from "../server/knowledgeMatching.ts";
import type { KnowledgeState, KnowledgeText } from "../src/types/knowledge.ts";
const document = (
  title: string,
  answer: string,
  topicId = "REGISTRATION",
): KnowledgeText => ({
  title,
  question: "",
  answer,
  topicId,
  visibility: "guides",
  alternatives: [],
  searchWords: [],
  samples: [],
  keyPoints: [],
  unclearAccepted: true,
});
function library(): KnowledgeState {
  return {
    topics: [
      { id: "APATHY", name: "Apathy", enabled: true },
      { id: "REGISTRATION", name: "Client Registration", enabled: true },
    ],
    items: [
      document(
        "Client Registration",
        "Create the client profile at the blue desk. Save the registration document.",
      ),
      document(
        "Code Analysis",
        "Analyze code before starting the creation process.",
      ),
      document(
        "Knowledge Point",
        "Store reference notes in the knowledge library.",
      ),
    ].map((live, i) => ({
      id: String(i),
      live,
      status: "Live",
      type: "document",
      draft: null,
      revision: 1,
      updatedAt: "",
      updatedBy: "",
    })),
    history: [],
    files: [],
    settings: { synonyms: {}, minimum: 0.6, resultCount: 3 },
    snapshots: [],
    checks: [],
  };
}
test("matching handles natural questions, morphology, accents and body passages", () => {
  const s = library();
  for (const [query, expected] of [
    ["How can I register a client?", "0"],
    ["Where can I find the registration documents?", "0"],
    ["Explain the création process", "1"],
    ["How do I analyze the code?", "1"],
    ["Where do I save a client profile?", "0"],
    ["Show knowledge points", "2"],
  ]) {
    assert.equal(rank(query, s)[0]?.item.id, expected, query);
  }
  for (const query of [
    "best pizza in Baltimore",
    "capital of France",
    "register a submarine",
    "analyze protein folding",
    "what are the lunar creation rules",
  ])
    assert.equal(rank(query, s).length, 0, query);
});
test("topic suggestions require evidence and respect existing relevant categories", () => {
  const s = library();
  assert.equal(
    suggestTopic("Client Registration", "", s.items[0].live!.answer, s),
    "REGISTRATION",
  );
  const body = s.items[1].live!.answer;
  s.items = s.items.slice(0, 1);
  const id = suggestTopic("Code Analysis", "", body, s);
  assert.equal(s.topics.find((t) => t.id === id)?.name, "Code Analysis");
  assert.notEqual(id, "APATHY");
  const neutral = suggestTopic("", "How does this work?", "", s);
  assert.equal(
    s.topics.find((t) => t.id === neutral)?.name,
    "General guidance",
  );
  assert.equal(suggestTopic("Code Analysis", "", body, s), id);
});
test("matching reflects publish, removal and disabled topics on a mutated candidate", () => {
  const s = library();
  assert.equal(rank("client registration", s)[0]?.item.id, "0");
  s.items[0].status = "Removed";
  assert.equal(rank("client registration", s).length, 0);
  s.items[0].status = "Live";
  s.topics[1].enabled = false;
  assert.equal(rank("client registration", s).length, 0);
});
test("distant words in unrelated sections do not create a body match", () => {
  const s = library();
  s.items[0].live = document(
    "Reference",
    "platypus " + "context ".repeat(150) + "telescope",
  );
  assert.equal(rank("platypus telescope", s).length, 0);
});

test("configured multiword synonyms preserve phrase meaning in both directions", () => {
  const s = library();
  s.settings.synonyms = { register: ["sign up"] };
  assert.equal(rank("How do I sign up a client?", s)[0]?.item.id, "0");
  s.items[0].live = document(
    "Enrollment",
    "To sign up a client, create a profile at the blue desk.",
  );
  assert.equal(rank("How do I register a client?", s)[0]?.item.id, "0");
  s.items[0].live = document(
    "Notice board",
    "The sign is on the wall. Look up to read the announcement.",
  );
  assert.equal(rank("register", s).length, 0);
});

test("placeholder headings cannot outrank substantive FTD information", () => {
  const s = library();
  s.items[0].live = document(
    "Symptoms of frontotemporal dementia",
    "- list symptoms here (gotta do research on that and list the ones that are relevant)",
  );
  s.items[1].live = document(
    "Frontotemporal dementia",
    "Symptoms of frontotemporal dementia include changes in behavior, personality and language.",
  );
  assert.equal(
    rank("What are the symptoms of frontotemporal dementia?", s)[0]?.item.id,
    "1",
  );
});
test("matching handles British and American spelling", () => {
  const s = library();
  s.items[0].live = document(
    "Dementia",
    "Frontotemporal dementia can change behaviour and personality. An EEG pattern alone is not a diagnosis.",
  );
  assert.equal(
    rank(
      "How does frontotemporal dementia change behavior and personality?",
      s,
    )[0]?.item.id,
    "0",
  );
});
test("document context follows the matching paragraph and keeps protocol steps", () => {
  const s = library();
  const preamble =
    "Other context information about an unrelated study. ".repeat(60);
  const body =
    preamble +
    "\n\nFor respite badge collection:\n\n1. Go to the green desk.\n2. Ask for the respite badge.\n3. Keep the badge with you.";
  s.items[0].live = document("Clinic reference", body);
  const hit = rank("respite badge collection", s)[0]!;
  assert.match(hit.context, /1\. Go to the green desk/);
  assert.match(hit.context, /3\. Keep the badge with you/);
  assert.ok(body.includes(hit.context));
  assert.ok(hit.context.length < body.length / 2);
});
