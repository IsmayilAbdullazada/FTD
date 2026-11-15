import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
