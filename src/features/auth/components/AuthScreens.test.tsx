import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AuthScreens } from './AuthScreens';
import { authApi } from '../api/authApi';
vi.mock('../api/authApi', () => ({
  authApi: { login: vi.fn(), forgotPassword: vi.fn(), resetPassword: vi.fn() },
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
});
test('login submits entered credentials and reports a failure without leaving the screen', async () => {
  vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));
  render(<AuthScreens onLoginSuccess={vi.fn()} />);
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: 'care@example.test' },
  });
  fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
    target: { value: 'incorrect-password' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
  await waitFor(() =>
    expect(authApi.login).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'care@example.test',
        password: 'incorrect-password',
      }),
    ),
  );
  expect(await screen.findByText('Invalid credentials')).toBeTruthy();
});
test('recovery remains reachable after extracting authentication panels', async () => {
  render(<AuthScreens onLoginSuccess={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
  expect(
    screen.getByRole('heading', { name: 'Reset your password' }),
  ).toBeTruthy();
});

test('password recovery requests one link and keeps the response generic', async () => {
  vi.mocked(authApi.forgotPassword).mockResolvedValue({
    success: true,
    message: 'If that account exists, recovery instructions will be emailed.',
    requiresEmailLink: true,
  });
  render(
    <AuthScreens initialMode="forgot-password" onLoginSuccess={vi.fn()} />,
  );
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: 'care@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Send reset link' }));
  expect(
    await screen.findByText(
      'If the account exists, open the password reset link sent by email.',
    ),
  ).toBeTruthy();
  expect(authApi.forgotPassword).toHaveBeenCalledWith('care@example.test');
  expect(screen.queryByText(/6-digit/i)).toBeNull();
});

test('a reset link needs only a new password and returns to sign-in without retaining it', async () => {
  window.history.replaceState(
    {},
    '',
    '/?tab=reset-password&resetToken=link-only-fixture-token',
  );
  vi.mocked(authApi.resetPassword).mockResolvedValue({
    success: true,
    message: 'Password updated successfully.',
  });
  const onLoginSuccess = vi.fn();
  render(<AuthScreens onLoginSuccess={onLoginSuccess} />);
  const password = await screen.findByLabelText('New password');
  expect(window.location.search).not.toContain('resetToken');
  expect(screen.queryByText(/6-digit/i)).toBeNull();
  fireEvent.change(password, { target: { value: 'New-fixture-password!' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'New-fixture-password!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByRole('heading', { name: 'Sign in to your account' }),
  ).toBeTruthy();
  expect(authApi.resetPassword).toHaveBeenCalledWith({
    token: 'link-only-fixture-token',
    newPassword: 'New-fixture-password!',
  });
  expect(screen.getByRole('status').textContent).toContain(
    'Your password has been reset',
  );
  expect(
    (screen.getByPlaceholderText('Enter your password') as HTMLInputElement)
      .value,
  ).toBe('');
  expect(onLoginSuccess).not.toHaveBeenCalled();
  expect(window.location.search).toBe('?tab=login');
});

test('an expired link displays the error and offers a new link', async () => {
  window.history.replaceState(
    {},
    '',
    '/?tab=reset-password&resetToken=expired-fixture-token',
  );
  vi.mocked(authApi.resetPassword).mockRejectedValue(
    new Error('Reset link is invalid or expired. Request a new link.'),
  );
  render(<AuthScreens onLoginSuccess={vi.fn()} />);
  fireEvent.change(await screen.findByLabelText('New password'), {
    target: { value: 'New-fixture-password!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'New-fixture-password!' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByText(
      'Reset link is invalid or expired. Request a new link.',
    ),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy();
});
