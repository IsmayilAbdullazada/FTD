import type { Condition, GroupMember } from '@/types';

interface MemberFilterOptions {
  searchQuery: string;
  cohortId: string;
  audienceFilter: 'all' | Condition;
}

export function filterMembers(
  members: GroupMember[],
  { searchQuery, cohortId, audienceFilter }: MemberFilterOptions,
) {
  const query = searchQuery.toLowerCase();
  return members.filter((member) => {
    const matchesSearch =
      member.realName.toLowerCase().includes(query) ||
      member.anonymousHandle.toLowerCase().includes(query) ||
      (member.email || '').toLowerCase().includes(query) ||
      (member.phone || '').toLowerCase().includes(query);
    const matchesGroup = cohortId === 'all' || member.primaryGroupId === cohortId;
    const matchesCondition =
      audienceFilter === 'all' || member.condition === audienceFilter;
    return matchesSearch && matchesGroup && matchesCondition;
  });
}

export function moveMemberToGroup(
  members: GroupMember[],
  userId: string,
  groupId: string,
) {
  return members.map((member) =>
    member.userId === userId
      ? { ...member, primaryGroupId: groupId }
      : member
  );
}
