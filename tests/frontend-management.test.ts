import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  filterQueueByAudience,
  sanitizePersonalInfo,
} from '../src/features/moderation/lib/moderationQueue.ts';
import {
  filterDiscussions,
  updatePostReplyPolicy,
} from '../src/features/discussions/lib/discussionManagement.ts';
import {
  filterMembers,
  moveMemberToGroup,
} from '../src/features/community/lib/memberFilters.ts';
import {
  filterGuides,
  replaceGuide,
} from '../src/features/knowledge/lib/guideWorkflow.ts';
import type { GroupMember, Post, QueueItem } from '../src/types/index.ts';
import type { ChatbotGuideFile } from '../src/features/knowledge/types.ts';

const queueItem = (
  id: string,
  userId: string,
  condition?: QueueItem['condition'],
) => ({ id, author: { userId }, condition }) as QueueItem;

const post = (
  id: string,
  options: Partial<Post> = {},
) => ({
  id,
  title: `Post ${id}`,
  content: 'care guidance',
  status: 'APPROVED',
  author: { anonymousHandle: `Author-${id}` },
  assignedGroups: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  commentCount: 0,
  upvotes: 0,
  ...options,
}) as Post;

const member = (
  userId: string,
  groupId: string,
  condition: GroupMember['condition'],
) => ({
  userId,
  realName: `Member ${userId}`,
  anonymousHandle: `Handle-${userId}`,
  email: `${userId}@example.com`,
  primaryGroupId: groupId,
  condition,
}) as GroupMember;

const guide = (
  id: string,
  options: Partial<ChatbotGuideFile> = {},
) => ({
  id,
  title: `Guide ${id}`,
  fileName: `${id}.pdf`,
  content: 'care protocol',
  condition: 'FTD',
  isActive: true,
  ...options,
}) as ChatbotGuideFile;

test('moderation queue audience filtering uses explicit and member conditions', () => {
  const items = [
    queueItem('explicit-ftd', 'member-ad', 'FTD'),
    queueItem('member-ftd', 'member-ftd'),
    queueItem('both', 'member-ad', 'BOTH'),
    queueItem('ad', 'member-ad', 'AD'),
  ];
  const members = [
    { userId: 'member-ftd', condition: 'FTD' as const },
    { userId: 'member-ad', condition: 'AD' as const },
  ];
  assert.deepEqual(
    filterQueueByAudience(items, members, 'FTD').map((item) => item.id),
    ['explicit-ftd', 'member-ftd', 'both'],
  );
  assert.equal(filterQueueByAudience(items, members, 'all'), items);
});

test('personal information sanitization handles detected text and fallbacks', () => {
  const content = 'Jane (Mom), jane@example.com, can be reached at (410) 555-9122.';
  const sanitized = sanitizePersonalInfo(content, [{
    type: 'PERSON',
    text: 'Jane (Mom)',
    startIndex: 0,
    endIndex: 10,
    explanation: 'name',
  }]);
  assert.equal(
    sanitized,
    '[PERSON removed], [EMAIL removed], can be reached at [PHONE removed].',
  );
});

test('discussion policy updates are immutable and filtering respects policy', () => {
  const posts = [
    post('moderated'),
    post('open', { allowUnmoderatedReplies: true }),
    post('closed', { isClosed: true }),
  ];
  const updated = updatePostReplyPolicy(posts, 'moderated', true);
  assert.equal(posts[0].allowUnmoderatedReplies, undefined);
  assert.equal(updated[0].allowUnmoderatedReplies, true);
  assert.equal(updated[1], posts[1]);
  assert.deepEqual(
    filterDiscussions(posts, 'closed', '').map((item) => item.id),
    ['closed'],
  );
  assert.deepEqual(
    filterDiscussions(posts, 'all', 'author-open').map((item) => item.id),
    ['open'],
  );
});

test('member reassignment and filters update only the selected member', () => {
  const members = [member('one', 'group-a', 'FTD'), member('two', 'group-a', 'AD')];
  const moved = moveMemberToGroup(members, 'one', 'group-b');
  assert.equal(moved[0].primaryGroupId, 'group-b');
  assert.equal(moved[1], members[1]);
  assert.deepEqual(
    filterMembers(moved, {
      searchQuery: 'member one',
      cohortId: 'group-b',
      audienceFilter: 'FTD',
    }).map((item) => item.userId),
    ['one'],
  );
});

test('guide workflow replaces server results and filters draft or legacy approvals', () => {
  const draft = guide('draft', { status: 'DRAFT', isActive: false });
  const legacyApproved = guide('legacy', { status: undefined });
  const approved = { ...draft, status: 'APPROVED' as const, isActive: true };
  const transitioned = replaceGuide([draft, legacyApproved], approved);
  assert.equal(transitioned[0], approved);
  assert.equal(transitioned[1], legacyApproved);
  assert.deepEqual(
    filterGuides(transitioned, 'APPROVED', '').map((item) => item.id),
    ['draft', 'legacy'],
  );
});
