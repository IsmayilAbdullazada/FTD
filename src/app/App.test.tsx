import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import App from './App';
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
    await screen.findByRole('button', { name: 'Join Community' }),
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
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByRole('heading', { name: 'Sign in to your account' }),
  ).toBeTruthy();
  expect(requests).toEqual([
    {
      token: 'app-reset-fixture-token',
      newPassword: 'New-app-fixture-password!',
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
