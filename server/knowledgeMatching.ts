import { randomUUID } from "node:crypto";
import type { KnowledgeItem, KnowledgeState } from "../src/types/knowledge.ts";

const stop = new Set(
  "a an the is are was were be been being it its of for and or to in on at by with my me we i our your you he she they their them does do did how what why when where which who can should would could about have has had this that these those from loved one help know please get all find explain tell show need want information document guide guidance".split(
    " ",
  ),
);
const forms: Record<string, string> = {
  registration: "register",
  registered: "register",
  registering: "register",
  creation: "create",
  created: "create",
  creating: "create",
  analysis: "analyz",
  analyse: "analyz",
  analyze: "analyz",
  analyzing: "analyz",
  driving: "drive",
  drove: "drive",
  collection: "collect",
  children: "child",
  people: "person",
  diagnoses: "diagnosis",
};
function stem(word: string) {
  if (forms[word]) return forms[word];
  if (word.length > 5 && word.endsWith("ies")) return word.slice(0, -3) + "y";
  if (word.length > 4 && word.endsWith("s") && !/(ss|us|is)$/.test(word))
    return word.slice(0, -1);
  if (word.length > 5 && word.endsWith("ing"))
    return word.slice(0, -3).replace(/(.)\1$/, "$1");
  if (word.length > 4 && word.endsWith("ed"))
    return word.slice(0, -2).replace(/(.)\1$/, "$1");
  return word;
}
export function tokens(text: string): string[] {
  return (
    text
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .normalize("NFKD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) || []
  )
    .filter((word) => word.length > 1 && !stop.has(word))
    .map(stem)
    .filter((word) => !stop.has(word));
}
const unique = (text: string) => new Set(tokens(text));
const canonical = (text: string) =>
  text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
interface Passage {
  words: Set<string>;
  phrase: string;
}
const passage = (words: string[]): Passage => ({
  words: new Set(words),
  phrase: " " + words.join(" ") + " ",
});
interface Profile {
  item: KnowledgeItem;
  header: Passage;
  body: Passage[];
  all: Set<string>;
}
const cache = new WeakMap<
  KnowledgeState,
  {
    rows: Profile[];
    versions: {
      item: KnowledgeItem;
      live: KnowledgeItem["live"];
      status: string;
    }[];
    topics: string;
  }
>();
function profiles(state: KnowledgeState) {
  const cached = cache.get(state);
  const topics = JSON.stringify(state.topics.map((t) => [t.id, t.enabled]));
  if (
    cached &&
    cached.topics === topics &&
    cached.versions.length === state.items.length &&
    cached.versions.every(
      (v, i) =>
        v.item === state.items[i] &&
        v.live === state.items[i].live &&
        v.status === state.items[i].status,
    )
  )
    return cached.rows;
  const rows = state.items
    .filter(
      (item) =>
        item.status === "Live" &&
        item.live &&
        state.topics.some((t) => t.id === item.live!.topicId && t.enabled),
    )
    .map((item) => {
      const d = item.live!;
      const header = passage(
        tokens(
          [d.title, d.question, ...d.alternatives, ...d.searchWords].join(" "),
        ),
      );
      const bodyTokens = tokens(d.answer);
      const body: Passage[] = [];
      // A long document must contain related query terms together, not scattered
      // across unrelated pages. Overlapping windows preserve boundary matches.
      for (let i = 0; i < bodyTokens.length; i += 60)
        body.push(passage(bodyTokens.slice(i, i + 120)));
      return {
        item,
        header,
        body,
        all: new Set([...header.words, ...bodyTokens]),
      };
    });
  cache.set(state, {
    rows,
    topics,
    versions: state.items.map((item) => ({
      item,
      live: item.live,
      status: item.status,
    })),
  });
  return rows;
}
export function rank(question: string, state: KnowledgeState) {
  const queryTokens = tokens(question);
  const query = [...new Set(queryTokens)];
  const rows = profiles(state);
  const exactQuestion = canonical(question);
  const exactMatch = (item: KnowledgeItem) =>
    [item.live!.title, item.live!.question, ...item.live!.alternatives].some(
      (value) => canonical(value) === exactQuestion,
    );
  if (!query.length)
    return exactQuestion
      ? rows
          .filter((row) => exactMatch(row.item))
          .slice(0, state.settings.resultCount)
          .map((row) => ({ item: row.item, score: 1 }))
      : [];
  const queryPhrase = " " + queryTokens.join(" ") + " ";
  const weights = query.map(
    (word) =>
      1 +
      Math.log(
        1 + rows.length / (1 + rows.filter((row) => row.all.has(word)).length),
      ),
  );
  const total = weights.reduce((a, b) => a + b, 0);
  const groups = Object.entries(state.settings.synonyms).map(([key, values]) =>
    [key, ...values].map((value) => tokens(value)),
  );
  const related = query.map((word) => {
    const found = new Set<string>();
    for (const group of groups) {
      // Multiword synonyms match as phrases, never as isolated generic words.
      if (
        group.some(
          (value) =>
            value.includes(word) &&
            queryPhrase.includes(" " + value.join(" ") + " "),
        )
      ) {
        group
          .filter((value) => value.length)
          .forEach((value) => found.add(value.join(" ")));
      }
    }
    return found;
  });
  const coverage = (text: Passage) =>
    query.reduce(
      (sum, word, i) =>
        sum +
        weights[i] *
          (text.words.has(word)
            ? 1
            : [...related[i]].some((value) =>
                  text.phrase.includes(" " + value + " "),
                )
              ? 0.85
              : 0),
      0,
    ) / total;
  return rows
    .map(({ item, header, body }) => {
      const exact = exactMatch(item);
      const score = exact
        ? 1
        : Math.max(
            coverage(header),
            ...body.map((words) => coverage(words) * 0.88),
          );
      return { item, score };
    })
    .filter((hit) => hit.score >= state.settings.minimum)
    .sort((a, b) => b.score - a.score)
    .slice(0, state.settings.resultCount);
}

export function suggestTopic(
  title: string,
  question: string,
  body: string,
  state: KnowledgeState,
): string {
  const heading = unique(title + " " + question);
  const content = unique(body.slice(0, 8000));
  const matches = state.topics
    .filter((t) => t.enabled)
    .map((topic) => {
      const words = [...unique(topic.name)];
      const score = words.length
        ? words.reduce(
            (sum, w) => sum + (heading.has(w) ? 1 : content.has(w) ? 0.45 : 0),
            0,
          ) / words.length
        : 0;
      return { topic, score };
    })
    .sort((a, b) => b.score - a.score);
  if (
    matches[0]?.score >= 0.65 &&
    (!matches[1] || matches[0].score > matches[1].score)
  )
    return matches[0].topic.id;
  const related = rank(title + " " + question, state);
  if (
    related[0]?.score >= 0.75 &&
    (!related[1] || related[0].score - related[1].score >= 0.15)
  )
    return related[0].item.live!.topicId;
  // An unfamiliar document gets its own meaningful heading, never the first
  // clinical category. Short/unfinished questions remain in a neutral topic.
  const name =
    body.trim().length >= 30 &&
    title.trim().length >= 3 &&
    title.trim().length <= 60 &&
    !question &&
    !/[?.!]$/.test(title.trim())
      ? title.trim().replace(/^#+\s*/, "")
      : "General guidance";
  const existing = state.topics.find(
    (t) => canonical(t.name) === canonical(name) && t.enabled,
  );
  if (existing) return existing.id;
  const id = "AUTO_" + randomUUID();
  state.topics.push({ id, name, enabled: true, automatic: true });
  return id;
}
