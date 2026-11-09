import type { Condition, GroupMember, QueueItem } from '@/types';

export function filterQueueByAudience(
  items: QueueItem[],
  members: Pick<GroupMember, 'userId' | 'condition'>[],
  audienceFilter: 'all' | Condition,
) {
  if (audienceFilter === 'all') return items;
  return items.filter((item) => {
    const author = members.find((member) => member.userId === item.author.userId);
    return (
      (item.condition ?? author?.condition) === audienceFilter ||
      item.condition === 'BOTH'
    );
  });
}

export function sanitizePersonalInfo(
  content: string,
  alerts: QueueItem['phiAlerts'] = [],
) {
  let cleaned = content;
  alerts.forEach((alert) => {
    if (!alert.text) return;
    const escaped = alert.text.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(
      new RegExp(escaped, 'gi'),
      `[${alert.type} removed]`,
    );
  });
  cleaned = cleaned.replace(
    /(?:\+?1[-.\s]*)?(?:\(\d{3}\)|\b\d{3}\b)[-.\s]*\d{3}[-.\s]*\d{4}\b/g,
    '[PHONE removed]',
  );
  return cleaned.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[EMAIL removed]',
  );
}
