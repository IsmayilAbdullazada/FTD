import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { discussionApi } from '../api/discussionApi';
import { useDiscussionManagement } from './useDiscussionManagement';
import type { CurrentUser, Post } from '@/types';
vi.mock('../api/discussionApi', () => ({
  discussionApi: { getPosts: vi.fn(), togglePostUnmoderatedReplies: vi.fn() },
}));
const user = { id: 'staff', role: 'CLINICIAN_MODERATOR' } as CurrentUser;
const post = {
  id: 'p1',
  title: 'First',
  content: 'content',
  author: { anonymousHandle: 'Staff' },
  allowUnmoderatedReplies: false,
} as Post;
beforeEach(() => vi.clearAllMocks());
test('requests another page only when pagination is used and resets when filters change', async () => {
  vi.mocked(discussionApi.getPosts).mockResolvedValue({
    total: 35,
    posts: [post],
  });
  const { result } = renderHook(() =>
    useDiscussionManagement({
      currentUser: user,
      audienceFilter: 'all',
      onQueueUpdated: vi.fn(),
      setActionSuccessNotice: vi.fn(),
    }),
  );
  await waitFor(() => expect(result.current.discussionPage.total).toBe(35));
  expect(discussionApi.getPosts).toHaveBeenCalledTimes(1);
  act(() => result.current.discussionPage.setPage(2));
  await waitFor(() =>
    expect(discussionApi.getPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2, pageSize: 10 }),
    ),
  );
  act(() => result.current.setSearchPostsQuery('sleep'));
  await waitFor(() =>
    expect(discussionApi.getPosts).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, search: 'sleep' }),
    ),
  );
});
test('rolls back an optimistic reply-policy change when saving fails', async () => {
  vi.mocked(discussionApi.getPosts).mockResolvedValue({
    total: 1,
    posts: [post],
  });
  vi.mocked(discussionApi.togglePostUnmoderatedReplies).mockRejectedValue(
    new Error('unavailable'),
  );
  const { result } = renderHook(() =>
    useDiscussionManagement({
      currentUser: user,
      audienceFilter: 'all',
      onQueueUpdated: vi.fn(),
      setActionSuccessNotice: vi.fn(),
    }),
  );
  await waitFor(() => expect(result.current.publishedPosts).toHaveLength(1));
  await act(async () => result.current.handleTogglePostRepliesMode(post));
  expect(result.current.publishedPosts[0].allowUnmoderatedReplies).toBe(false);
});
