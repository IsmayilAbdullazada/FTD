/**
 * cleanPdfText - Production-grade clinical document text cleaner
 *
 * Cleans PDF text extractions by:
 * 1. Removing null and unprintable binary/control characters.
 * 2. Normalizing Windows and legacy line breaks.
 * 3. Normalizing non-breaking and unusual unicode whitespace.
 * 4. Standardizing curly quotes, smart apostrophes, em-dashes, and ellipses.
 * 5. Converting decorative bullet symbols (•, ●, ▪, ◆, ►, ▶) to standard markdown list dashes (- ).
 * 6. De-hyphenating words broken across line wraps (e.g., "incon-\ntinence" -> "incontinence").
 * 7. Stripping repetitive running headers, footers, newsletter volume/issue tags, and pagination lines.
 * 8. Collapsing excessive horizontal whitespace and consolidating erratic vertical newlines.
 * 9. Trimming leading and trailing whitespace.
 */

export function cleanPdfText(rawText: string): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let text = rawText;

  // 1. Remove binary/control characters (preserve newlines \n and tabs \t)
  text = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

  // 2. Normalize Windows (\r\n) and legacy Mac (\r) line breaks
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 3. Normalize unicode whitespace characters to standard spaces
  text = text.replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ');

  // 4. Normalize curly quotes, dashes, and ellipses
  text = text
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '—')
    .replace(/\u2026/g, '...');

  // 5. Standardize bullet characters to markdown list dashes
  text = text.replace(/^[ \t]*[•●▪◆►▶*]\s+/gm, '- ');

  // 6. De-hyphenate words broken across line breaks (e.g. "com-\nbative" -> "combative")
  text = text.replace(/(\b[A-Za-z]{2,})-\n[ \t]*([a-z]{2,}\b)/g, '$1$2');

  // 7. Strip running headers, footers, and page numbers line by line
  const lines = text.split('\n');
  const cleanedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const trimmedLine = lines[i].trim();

    // Skip empty lines in header check
    if (!trimmedLine) {
      cleanedLines.push('');
      continue;
    }

    // Isolated page numbers (e.g., "1", "Page 2", "Page 3 of 4", "2 of 6")
    if (/^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(trimmedLine)) {
      continue;
    }

    // Common newsletter running headers & footers
    if (
      /^(the\s+)?association for frontotemporal degeneration\b/i.test(trimmedLine) ||
      /^partners in ftd care\b/i.test(trimmedLine) ||
      /^aftd\s+educational\s+newsletter/i.test(trimmedLine) ||
      /^www\.theaftd\.org\b/i.test(trimmedLine) ||
      /^help and hope\b/i.test(trimmedLine) ||
      /^issue\s+\d+\s*[-–—|•]/i.test(trimmedLine) ||
      (/^(winter|spring|summer|fall)\s+\d{4}\b/i.test(trimmedLine) && trimmedLine.length < 35) ||
      /^\d{4}\s+the association for frontotemporal degeneration/i.test(trimmedLine) ||
      /^all rights reserved/i.test(trimmedLine)
    ) {
      continue;
    }

    cleanedLines.push(lines[i]);
  }

  text = cleanedLines.join('\n');

  // 8. Collapse excessive horizontal spaces and tabs
  text = text.replace(/[ \t]{2,}/g, ' ');

  // 9. Consolidate erratic multiple newlines (keep maximum 2 consecutive newlines)
  text = text.replace(/\n{3,}/g, '\n\n');

  // 10. Trim leading and trailing whitespace
  return text.trim();
}
