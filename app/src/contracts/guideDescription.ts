/** Pure content contract shared by API responses and the guide authoring UI. */
export const MIN_GUIDE_DESCRIPTION_LENGTH = 20;
export const MAX_GUIDE_DESCRIPTION_LENGTH = 240;
export const MAX_GUIDE_SUGGESTION_LENGTH = 160;
export function isGuideDescriptionValid(value?: string): boolean {
  const length = value?.trim().length ?? 0;
  return (
    length >= MIN_GUIDE_DESCRIPTION_LENGTH &&
    length <= MAX_GUIDE_DESCRIPTION_LENGTH
  );
}
function normalized(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function suggestGuideDescription(
  content: string,
  title = '',
  limit = MAX_GUIDE_SUGGESTION_LENGTH,
): string {
  const boilerplate =
    /\ba quarterly newsletter for (?:health(?:care| care) professionals(?: and families)?|facility [\p{L}]+|families)\b/giu;
  const hadHeader = boilerplate.test(content);
  boilerplate.lastIndex = 0;
  let text = content
    .split(/[\r\n\f]+/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^(?:introduction|help\s*(?:&|and)\s*support|https?:\/\/\S+|www\.\S+|theaftd\.org.*|(?:page\s*)?\d+(?:\s*of\s*\d+)?|copyright.*|©.*)$/i.test(
          line,
        ),
    )
    .join(' ');
  text = text
    .replace(boilerplate, ' ')
    .replace(/\bPartners\s+in\s+FTD\s+Care\b/gi, ' ');
  if (hadHeader)
    text = text.replace(
      /\b(?:spring|summer|fall|autumn|winter)\s+(?:19|20)\d{2}\b/gi,
      ' ',
    );
  text = normalized(text);
  const plainTitle = normalized(title)
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/[.!?:]+$/, '');
  if (plainTitle)
    for (let i = 0; i < 3; i++)
      text = text
        .replace(
          new RegExp(
            '^' + escaped(plainTitle) + '(?:[.!?:—–-]+|\\s+|$)\\s*',
            'i',
          ),
          '',
        )
        .trim();
  text = text.replace(/^[\s|:;—–-]+/, '');
  // Existing previews may already end in a clipped token. Drop that token, not source text.
  text = text.replace(/\S*(?:\.{3}|…)\s*$/, '').trim();
  if (text.length <= limit) return text;
  const prefix = text.slice(0, limit);
  const sentences = [...prefix.matchAll(/[.!?](?=\s|$)/g)];
  const end = sentences.at(-1)?.index;
  if (end !== undefined && end + 1 >= MIN_GUIDE_DESCRIPTION_LENGTH)
    return prefix.slice(0, end + 1);
  const cut = text.slice(0, Math.max(0, limit - 2)).lastIndexOf(' ');
  return cut > 0
    ? text
        .slice(0, cut)
        .replace(/[,;:]$/, '')
        .trimEnd() + ' …'
    : '';
}
export function guideCardDescription(input: {
  description?: string | null;
  content?: string | null;
  title?: string;
}): string {
  return (
    suggestGuideDescription(input.description ?? '', input.title) ||
    suggestGuideDescription(input.content ?? '', input.title) ||
    'Open this guide to read the source document.'
  );
}
export function editableGuideDescription(
  description: string | undefined,
  content: string,
  title: string,
): string {
  if (
    isGuideDescriptionValid(description) &&
    suggestGuideDescription(description!, title) === normalized(description!)
  )
    return description!.trim();
  return (
    suggestGuideDescription(description ?? '', title) ||
    suggestGuideDescription(content, title)
  );
}
