import { StrictMode, type ReactNode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useModerationQueue } from './useModerationQueue';
import { moderationApi } from '../api/moderationApi';
import type { CurrentUser } from '@/types';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test('Strict Mode reuses the bootstrap queue instead of refetching it', () => {
  const load = vi
    .spyOn(moderationApi, 'getModerationQueue')
    .mockResolvedValue({ items: [], totalPending: 0 });
  const options = {
    currentUser: { id: 'staff', role: 'CLINICIAN_MODERATOR' } as CurrentUser,
    initialQueue: { items: [], totalPending: 0 },
    cohorts: [],
    audienceFilter: 'all' as const,
    onQueueUpdated: vi.fn(),
    onPublishedPostsChanged: vi.fn(async () => {}),
    setActionSuccessNotice: vi.fn(),
  };
  const { result } = renderHook(() => useModerationQueue(options), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    ),
  });
  expect(result.current.queueItems).toEqual([]);
  expect(load).not.toHaveBeenCalled();
});
