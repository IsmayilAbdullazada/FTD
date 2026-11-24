import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { AuthScreens } from './AuthScreens';
import { authApi } from '../api/authApi';
import { reportError } from '@/shared/lib/logger';
vi.mock('@/shared/lib/logger', () => ({ reportError: vi.fn() }));
vi.mock('../api/authApi', () => ({
  authApi: {
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    passwordResetContext: vi.fn(),
    getInvitation: vi.fn(),
    registerWithInvite: vi.fn(),
  },
}));
beforeEach(() => {
  vi.mocked(authApi.passwordResetContext).mockResolvedValue({
    requiresProfile: false,
  });
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.removeItem('hpc_theme');
  document.documentElement.classList.remove('dark');
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
  expect(reportError).toHaveBeenCalledWith('Login error:', expect.any(Error));
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
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and agree/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByRole('heading', { name: 'Sign in to your account' }),
  ).toBeTruthy();
  expect(authApi.resetPassword).toHaveBeenCalledWith({
    token: 'link-only-fixture-token',
    newPassword: 'New-fixture-password!',
    guidelinesAccepted: true,
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
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and agree/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  expect(
    await screen.findByText(
      'Reset link is invalid or expired. Request a new link.',
    ),
  ).toBeTruthy();
  expect(reportError).toHaveBeenCalledWith(
    'Reset confirmation failed:',
    expect.any(Error),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy();
});

test('registration lets the server assign the stored short tag without a client-generated handle', async () => {
  vi.mocked(authApi.getInvitation).mockResolvedValue({
    valid: true,
    invitation: {
      email: 'care@example.test',
      firstName: 'Care',
      lastName: 'Partner',
      condition: 'FTD',
      primaryCohortSlug: 'general-community',
    },
  });
  const user = {
    id: 'user-care-internal-uuid',
    email: 'care@example.test',
    role: 'CARE_PARTNER' as const,
    firstName: 'Care',
    lastName: 'Partner',
    anonymousHandle: 'User-123',
    badgeLabel: 'Care Partner',
    avatarColor: '#002D72',
    condition: 'FTD' as const,
  };
  vi.mocked(authApi.registerWithInvite).mockResolvedValue({
    success: true,
    user,
  });
  const onLoginSuccess = vi.fn();
  render(
    <AuthScreens
      initialMode="register"
      initialToken="fixture-invitation-token"
      onLoginSuccess={onLoginSuccess}
    />,
  );
  await screen.findByLabelText('Patient age (years)');
  for (const [label, value] of [
    ['Patient age (years)', '70'],
    ['Care partner age (years)', '45'],
    ['Relationship to the patient', 'Daughter'],
    ['County of residence', 'Baltimore'],
    ['State of residence', 'Maryland'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  expect(screen.queryByLabelText('Password')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Continue to password' }));
  expect(
    await screen.findByText('You will receive a tag such as User-123'),
  ).toBeTruthy();
  expect(screen.queryByLabelText('Community handle')).toBeNull();
  fireEvent.change(screen.getByPlaceholderText('At least 8 characters'), {
    target: { value: 'Registration-fixture-password!' },
  });
  fireEvent.click(
    screen.getByRole('checkbox', { name: /I have read and agree/ }),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Join Community' }));
  await waitFor(() => expect(onLoginSuccess).toHaveBeenCalledWith(user));
  const payload = vi.mocked(authApi.registerWithInvite).mock.calls[0][0];
  expect(payload).not.toHaveProperty('anonymousHandle');
  expect(payload.token).toBe('fixture-invitation-token');
  expect(payload.guidelinesAccepted).toBe(true);
  expect(payload.carePartnerDetails).toEqual({
    patientAge: 70,
    carePartnerAge: 45,
    relationshipToPatient: 'Daughter',
    county: 'Baltimore',
    state: 'Maryland',
  });
});

test('login screen provides an icon-only light/dark mode switch that updates the document theme', () => {
  localStorage.setItem('hpc_theme', 'light');
  render(
    <ThemeProvider>
      <AuthScreens onLoginSuccess={vi.fn()} />
    </ThemeProvider>,
  );

  const toggleButton = screen.getByRole('button', {
    name: 'Switch to dark mode',
  });
  expect(toggleButton.textContent?.trim()).toBe('');
  expect(toggleButton.getAttribute('aria-pressed')).toBe('false');
  expect(document.documentElement.classList.contains('dark')).toBe(false);

  fireEvent.click(toggleButton);

  const lightButton = screen.getByRole('button', {
    name: 'Switch to light mode',
  });
  expect(lightButton.textContent?.trim()).toBe('');
  expect(lightButton.getAttribute('aria-pressed')).toBe('true');
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('hpc_theme')).toBe('dark');
});

test('invite code input uses sans-serif font for its placeholder when empty', () => {
  render(<AuthScreens initialMode="register" onLoginSuccess={vi.fn()} />);
  const inviteInput = screen.getByPlaceholderText(
    'Paste your invite code or link',
  );
  expect(inviteInput.className).toContain('font-sans');
  expect(inviteInput.className).toContain('placeholder:font-sans');
  expect(inviteInput.className).not.toContain('font-mono');
});

test('care partners missing intake must complete details before password reset and agreement stays unchecked', async () => {
  window.history.replaceState({}, '', '/#resetToken=intake-fixture-token');
  vi.mocked(authApi.passwordResetContext).mockResolvedValue({
    requiresProfile: true,
  });
  render(<AuthScreens onLoginSuccess={vi.fn()} />);
  await screen.findByLabelText('Patient age (years)');
  expect(screen.queryByLabelText('New password')).toBeNull();
  for (const [label, value] of [
    ['Patient age (years)', '70'],
    ['Care partner age (years)', '45'],
    ['Relationship to the patient', 'Spouse'],
    ['County of residence', 'Baltimore'],
    ['State of residence', 'Maryland'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue to password' }));
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'New-fixture-password!' },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'New-fixture-password!' },
  });
  const agreement = screen.getByRole('checkbox', {
    name: /I have read and agree/,
  }) as HTMLInputElement;
  expect(agreement.required).toBe(true);
  expect(agreement.checked).toBe(false);
  fireEvent.submit(
    screen.getByRole('button', { name: 'Reset password' }).closest('form')!,
  );
  expect(authApi.resetPassword).not.toHaveBeenCalled();
  expect(
    await screen.findByText(
      'Please read and agree to the Community Guidelines.',
    ),
  ).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: 'Read Community Guidelines' }),
  );
  const modal = screen.getByRole('dialog', { name: 'Community Guidelines' });
  expect(modal.querySelector('h1')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(agreement.checked).toBe(false);
});

test('an invalid reset context offers recovery without displaying a password form', async () => {
  window.history.replaceState({}, '', '/#resetToken=expired-context-token');
  vi.mocked(authApi.passwordResetContext).mockRejectedValue(
    new Error('Reset link is invalid or expired. Request a new link.'),
  );
  render(<AuthScreens onLoginSuccess={vi.fn()} />);
  expect(
    await screen.findByText(
      'Reset link is invalid or expired. Request a new link.',
    ),
  ).toBeTruthy();
  expect(screen.queryByLabelText('New password')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Request a new link' }));
  expect(screen.getByRole('button', { name: 'Send reset link' })).toBeTruthy();
});
