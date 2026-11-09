import type { ChatbotGuideFile } from '@/features/knowledge/types';

export type GuideStatusFilter = 'ALL' | 'DRAFT' | 'APPROVED';

export function replaceGuide(
  guides: ChatbotGuideFile[],
  replacement: ChatbotGuideFile,
) {
  return guides.map((guide) =>
    guide.id === replacement.id ? replacement : guide
  );
}

export function filterGuides(
  guides: ChatbotGuideFile[],
  statusFilter: GuideStatusFilter,
  searchFilter: string,
) {
  const query = searchFilter.toLowerCase();
  return guides.filter((guide) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'DRAFT' && guide.status === 'DRAFT') ||
      (statusFilter === 'APPROVED' &&
        (guide.status === 'APPROVED' || !guide.status));
    if (!matchesStatus) return false;
    return (
      !query ||
      guide.title.toLowerCase().includes(query) ||
      guide.fileName.toLowerCase().includes(query) ||
      Boolean(guide.publisher?.toLowerCase().includes(query)) ||
      Boolean(guide.year?.toLowerCase().includes(query)) ||
      guide.content.toLowerCase().includes(query)
    );
  });
}
