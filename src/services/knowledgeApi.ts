import type {
  KnowledgeOverview,
  KnowledgeAnswer,
  KnowledgeText,
} from "../types/knowledge";
export const knowledgeRoot = "/api/v1/staff/knowledge";
export async function staffRequest<T>(
  userId: string,
  path = "",
  body?: unknown,
  method = "POST",
): Promise<T> {
  const r = await fetch(knowledgeRoot + path, {
    method: body === undefined ? "GET" : method,
    headers: { "x-user-id": userId, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }).catch(() => {
    throw new Error(
      "We could not reach your clinic content. Check your connection and try again.",
    );
  });
  if (!r.headers.get("content-type")?.includes("application/json"))
    throw new Error(
      "We could not reach your clinic content. Please try again.",
    );
  const data = await r.json();
  if (!r.ok)
    throw new Error(
      data.error || "We could not save this change. Please try again.",
    );
  return data;
}
export const loadKnowledge = (userId: string) =>
  staffRequest<KnowledgeOverview>(userId);
export const saveKnowledge = (
  userId: string,
  id: string,
  draft: KnowledgeText,
  revision: number,
) =>
  staffRequest<KnowledgeOverview>(
    userId,
    `/items/${id}`,
    { ...draft, revision },
    "PUT",
  );
export const tryKnowledge = (userId: string, query: string) =>
  staffRequest<KnowledgeAnswer>(userId, "/try", { query });
