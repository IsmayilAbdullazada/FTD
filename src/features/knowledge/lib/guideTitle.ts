export const INSTITUTIONAL_RESOURCE_FILES = [
  { fileName: 'Managing-Aggressive-Behavior.pdf', label: 'Managing Aggressive Behavior' },
  { fileName: 'SleepIssuesFTD-090623.pdf', label: 'Sleep Issues in FTD' },
  { fileName: 'PinFTDcare_Newsletter_Fall_2016.pdf', label: 'Partners in FTD Care - Fall 2016' },
  { fileName: 'PinFTDcare_Newsletter_Winter_2018.pdf', label: 'Partners in FTD Care - Winter 2018' },
  { fileName: 'PinFTDcare_Newsletter_Winter_2019.pdf', label: 'Partners in FTD Care - Winter 2019' },
  { fileName: 'PinFTDcare_sprng_2020.pdf', label: 'Partners in FTD Care - Spring 2020' },
  { fileName: 'January-2014.pdf', label: 'Partners in FTD Care - January 2014' },
  { fileName: 'July-2012.pdf', label: 'Partners in FTD Care - July 2012' },
  { fileName: 'PiC-fall-2014-WTDA.pdf', label: 'Partners in FTD Care - Fall 2014' },
  { fileName: 'Summer-2014-Newsletter_Final.pdf', label: 'Partners in FTD Care - Summer 2014' },
];

export function suggestGuideTitle(fileName: string, firstPageText?: string): string {
  if (!fileName) return '';

  // 1. Direct match from known institutional library resources
  const match = INSTITUTIONAL_RESOURCE_FILES.find(
    (f) => f.fileName.toLowerCase() === fileName.toLowerCase()
  );
  if (match) return match.label;

  // 2. Check first page text for a clean, human clinical title line
  if (firstPageText) {
    const lines = firstPageText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    for (const rawLine of lines.slice(0, 6)) {
      const line = rawLine.replace(/^[#*\-•\s]+/, '').trim();
      if (
        line.length >= 8 &&
        line.length <= 80 &&
        !/^page\s+\d+/i.test(line) &&
        !/^\d+$/.test(line) &&
        !/^www\./i.test(line) &&
        !/^https?:/i.test(line) &&
        !/^vol(ume)?\.?\s*\d+/i.test(line)
      ) {
        if (
          line.includes('FTD') ||
          line.includes('Partners') ||
          line.includes('Behavior') ||
          line.includes('Care') ||
          line.includes('Sleep') ||
          line.includes('Dementia') ||
          line.includes('Guide') ||
          line.includes('Managing')
        ) {
          return line;
        }
      }
    }
  }

  // 3. Fallback: Parse filename patterns
  let name = fileName.replace(/\.[^/.]+$/, ''); // Remove extension

  // Pattern: PinFTDcare_Newsletter_Winter_2019
  const p1 = name.match(/^PinFTDcare_Newsletter_([A-Za-z]+)_(\d{4})/i);
  if (p1) return `Partners in FTD Care - ${p1[1]} ${p1[2]}`;

  // Pattern: PinFTDcare_sprng_2020
  const p2 = name.match(/^PinFTDcare_([A-Za-z]+)_(\d{4})/i);
  if (p2) {
    const season = p2[1].toLowerCase() === 'sprng' ? 'Spring' : p2[1];
    return `Partners in FTD Care - ${season} ${p2[2]}`;
  }

  // Pattern: PiC-fall-2014-WTDA
  const p3 = name.match(/^PiC-([A-Za-z]+)-(\d{4})/i);
  if (p3) return `Partners in FTD Care - ${p3[1]} ${p3[2]}`;

  // Pattern: Month-Year, e.g. January-2014
  const p4 = name.match(/^([A-Za-z]+)-(\d{4})$/i);
  if (p4) return `Partners in FTD Care - ${p4[1]} ${p4[2]}`;

  // Beautify underscores and dashes
  name = name
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return name
    .split(' ')
    .map((w) => (w.length > 2 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

