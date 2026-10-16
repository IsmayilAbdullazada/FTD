import type { ReadResult } from "./fileReading.ts";
import { fileTitle } from "./fileReading.ts";
import { normalize } from "./knowledgeStore.ts";
import { suggestTopic } from "./knowledgeMatching.ts";
import type { KnowledgeState } from "../src/types/knowledge.ts";

// All sections of a file share one suggested topic. A subheading, table row or
// page continuation must not create a separate public category.
export function uploadDrafts(
  result: ReadResult,
  name: string,
  state: KnowledgeState,
) {
  if (!result.sections.length) return [];
  const context = result.title || fileTitle(name);
  const topicId = suggestTopic(
    context,
    "",
    result.sections.map((s) => s.text).join("\n\n"),
    state,
  );
  return result.sections.map((section) => ({
    ...normalize(
      {
        title: section.title,
        answer: section.text,
        topicId,
        visibility: "guides",
        unclearAccepted: !result.unclear,
      },
      state,
    ),
    topicSuggested: true,
    topicContext: context,
  }));
}
