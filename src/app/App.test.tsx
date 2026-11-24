import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
// Load real workspace modules during collection, before per-test timers/act scopes.
// These tests exercise App workflows rather than chunk-download performance.
import '@/features/auth';
import '@/features/discussions';
import '@/features/knowledge';
import '@/features/clinician-workspace';
import App from './App';

// jsdom does not implement the layout observer used by Care Companion.
beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, '', '/');
});
test('a signed-out invitation opens registration and preserves its token', async () => {
  window.history.replaceState({}, '', '/?token=valid-invitation-token');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/auth/invitations/'))
        return Response.json({
          valid: true,
          invitation: {
            email: 'new@example.test',
            firstName: 'New',
            lastName: 'Partner',
            condition: 'FTD',
            primaryCohortSlug: 'general',
          },
        });
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }),
  );
  render(<App />);
  await waitFor(() => expect(screen.queryByText('Session Expired')).toBeNull());
  expect(
    await screen.findByRole('button', { name: 'Continue to password' }),
  ).toBeTruthy();
  expect(window.location.search).toContain('token=valid-invitation-token');
});

test('wrong credentials display the login error without expiring a session', async () => {
  const { fireEvent } = await import('@testing-library/react');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) =>
      Response.json(
        {
          error: String(input).includes('/auth/login')
            ? 'Invalid password'
            : 'Authentication required',
        },
        { status: 401 },
      ),
    ),
  );
  render(<App />);
  fireEvent.change(await screen.findByPlaceholderText('you@example.com'), {
    target: { value: 'care@example.test' },
  });
  fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
    target: { value: 'wrong-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByText('Invalid password')).toBeTruthy();
  expect(screen.queryByText('Session Expired')).toBeNull();
});

test('the signed-out App accepts an email reset link without an email or code field', async () => {
  window.history.replaceState(
    {},
    '',
    '/?tab=reset-password#resetToken=app-reset-fixture-token',
  );
  const requests: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/auth/password-reset-context'))
        return Response.json({ requiresProfile: false });
      if (String(input).includes('/auth/reset-password')) {
        requests.push(JSON.parse(String(init?.body)));
        return Response.json({
          success: true,
          message: 'Password updated successfully.',
        });
      }
      return Response.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }),
  );
  render(<App />);
  fireEvent.change(await screen.findByLabelText('New password'), {
    target: { value: 'New-app-fixture-password!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'New-app-fixture-password!' },
  });
  expect(window.location.href).not.toContain('resetToken');
  expect(screen.queryByText(/6-digit/i)).toBeNull();
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and agree/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByRole('heading', { name: 'Sign in to your account' }),
  ).toBeTruthy();
  expect(requests).toEqual([
    {
      token: 'app-reset-fixture-token',
      newPassword: 'New-app-fixture-password!',
      guidelinesAccepted: true,
    },
  ]);
  expect(screen.queryByText('Session Expired')).toBeNull();
});

test('activity email links open the signed-in notification inbox and closing it clears the URL flag', async () => {
  window.history.replaceState({}, '', '/?tab=feed&notifications=open');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/users/me'))
        return Response.json({
          user: {
            id: 'care-fixture',
            email: 'care@example.test',
            role: 'CARE_PARTNER',
            firstName: 'Care',
            lastName: 'Partner',
            anonymousHandle: 'Care-fixture',
            badgeLabel: 'Care Partner',
            avatarColor: '#002D72',
            condition: 'FTD',
          },
          allPersonas: [],
        });
      if (url.includes('/policies/status'))
        return Response.json({ acknowledged: true, currentVersion: '1.0' });
      if (url.includes('/cohorts')) return Response.json([]);
      if (url.includes('/notifications'))
        return Response.json({
          unreadCount: 1,
          messages: [
            {
              id: 'notice-fixture',
              recipientUserId: 'care-fixture',
              title: 'An update on your discussion',
              message: 'Please review the feedback from your moderation team.',
              type: 'REJECTION',
              createdAt: '2026-01-01T00:00:00Z',
              read: false,
            },
          ],
        });
      if (url.includes('/posts'))
        return Response.json({
          posts: [],
          total: 0,
          pagination: { page: 1, pageSize: 5, total: 0, totalPages: 0 },
        });
      return Response.json([]);
    }),
  );
  render(<App />);
  expect(
    await screen.findByText(
      'Please review the feedback from your moderation team.',
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByLabelText('Close'));
  expect(window.location.search).not.toContain('notifications');
});

test('a care-partner staff URL resolves to the feed without requesting staff data', async () => {
  window.history.replaceState({}, '', '/?tab=moderation');
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/users/me'))
      return Response.json({
        user: {
          id: 'care-route',
          email: 'care@example.test',
          role: 'CARE_PARTNER',
          firstName: 'Care',
          lastName: 'Partner',
          anonymousHandle: 'User-123',
          badgeLabel: 'Care Partner',
          avatarColor: '#002D72',
          condition: 'FTD',
        },
        allPersonas: [],
      });
    if (url.includes('/policies/status'))
      return Response.json({ acknowledged: true, currentVersion: '1.0' });
    if (url.includes('/cohorts')) return Response.json([]);
    if (url.includes('/notifications'))
      return Response.json({ messages: [], unreadCount: 0 });
    if (url.includes('/posts'))
      return Response.json({ posts: [], total: 0, page: 1, pageSize: 5 });
    return Response.json({ pool: [] });
  });
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  expect(
    screen.queryByRole('dialog', {
      name: 'Community Guidelines acknowledgment',
    }),
  ).toBeNull();
  const main = await screen.findByRole('main');
  expect(
    await within(main).findByRole('button', { name: 'New Post' }),
  ).toBeTruthy();
  expect(screen.queryByRole('heading', { name: 'Dashboard' })).toBeNull();
  expect(
    fetchMock.mock.calls.some(([url]) =>
      String(url).includes('/moderation/queue'),
    ),
  ).toBe(false);
});

test('a bootstrap service failure shows retry feedback instead of a misleading sign-in screen', async () => {
  const fetchMock = vi.fn(async () =>
    Response.json(
      { error: 'Service temporarily unavailable' },
      { status: 503 },
    ),
  );
  vi.stubGlobal('fetch', fetchMock);
  render(<App />);
  expect(
    await screen.findByRole('button', { name: 'Retry loading' }),
  ).toBeTruthy();
  expect(screen.queryByRole('button', { name: /^Sign in$/ })).toBeNull();
  const requestsBeforeRetry = fetchMock.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }));
  await waitFor(() =>
    expect(fetchMock.mock.calls.length).toBeGreaterThan(requestsBeforeRetry),
  );
});

test('a required guidelines acknowledgment preserves an in-progress discussion draft', async () => {
  window.history.replaceState({}, '', '/?tab=compose');
  let acknowledged = true;
  const user = {
    id: 'draft-care',
    email: 'draft@example.test',
    role: 'CARE_PARTNER',
    firstName: 'Draft',
    lastName: 'Partner',
    anonymousHandle: 'User-123',
    badgeLabel: 'Care Partner',
    avatarColor: '#002D72',
    condition: 'FTD',
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/users/me'))
        return Response.json({ user, allPersonas: [] });
      if (url.includes('/policies/acknowledge')) {
        acknowledged = true;
        return Response.json({ acknowledged: true, currentVersion: '1.0' });
      }
      if (url.includes('/policies/status'))
        return Response.json({ acknowledged, currentVersion: '1.0' });
      if (url.includes('/cohorts'))
        return Response.json([
          {
            id: 'group-general',
            name: 'General',
            slug: 'general',
            description: 'General community',
            isGeneralBoard: true,
            geographicRegion: 'All',
            tag: 'general',
            isActive: true,
            memberCount: 1,
          },
        ]);
      if (url.includes('/posts'))
        return Response.json({
          posts: [],
          pagination: { page: 1, pageSize: 25, total: 0, totalPages: 1 },
        });
      if (url.includes('/discussions-pool')) return Response.json({ pool: [] });
      return Response.json([]);
    }),
  );
  render(<App />);
  const title = await screen.findByPlaceholderText(
    'e.g. Managing resistance when bathing',
  );
  fireEvent.change(title, {
    target: { value: 'Keep this unfinished question' },
  });
  fireEvent.change(screen.getByLabelText('Details'), {
    target: { value: 'Keep these details while I review the guidelines.' },
  });
  acknowledged = false;
  fireEvent(window, new Event('jh:guidelines-required'));
  fireEvent.click(await screen.findByRole('checkbox'));
  fireEvent.click(screen.getByRole('button', { name: 'Agree and Continue' }));
  await waitFor(() =>
    expect(
      screen.queryByRole('dialog', {
        name: 'Community Guidelines acknowledgment',
      }),
    ).toBeNull(),
  );
  expect(
    (
      screen.getByPlaceholderText(
        'e.g. Managing resistance when bathing',
      ) as HTMLInputElement
    ).value,
  ).toBe('Keep this unfinished question');
  expect((screen.getByLabelText('Details') as HTMLTextAreaElement).value).toBe(
    'Keep these details while I review the guidelines.',
  );
});

test('dashboard Guides stays in the dashboard and exposes the shared publishing library', async () => {
  window.history.replaceState({}, '', '/?tab=moderation');
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/users/me'))
        return Response.json({
          user: {
            id: 'moderator-fixture',
            role: 'CLINICIAN_MODERATOR',
            email: 'moderator@example.test',
            firstName: 'Moderator',
            lastName: 'Fixture',
            badgeLabel: 'Moderator',
            avatarColor: '#002D72',
            condition: 'FTD',
          },
          allPersonas: [],
        });
      if (url.includes('/moderation/queue'))
        return Response.json({ totalPending: 0, items: [] });
      if (url.includes('/notifications'))
        return Response.json({ messages: [] });
      if (url.includes('/posts')) return Response.json({ total: 0, posts: [] });
      return Response.json([]);
    }),
  );
  render(<App />);
  await screen.findByRole('heading', { name: 'Dashboard' });
  const guidesTab = screen
    .getAllByRole('button', { name: /^Guides/ })
    .find(
      (button) =>
        button.tagName === 'BUTTON' &&
        !button.closest('header') &&
        !button.closest('nav'),
    );
  expect(guidesTab).toBeTruthy();
  fireEvent.click(guidesTab!);
  expect(
    await screen.findByRole('heading', { name: 'Test Assistant Guidance' }),
  ).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeTruthy();
  expect(window.location.search).toBe('?tab=moderation');
  fireEvent.click(screen.getByRole('button', { name: 'Add guide' }));
  expect(
    screen.getByRole('button', { name: 'Upload PDF or text' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Write or paste text' }),
  ).toBeTruthy();
  expect(
    screen.getByRole('button', { name: 'Link to a webpage' }),
  ).toBeTruthy();
});
