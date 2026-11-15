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
  authApi: { login: vi.fn(), forgotPassword: vi.fn() },
}));
afterEach(cleanup);
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
