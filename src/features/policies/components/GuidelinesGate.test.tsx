import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { GuidelinesGate } from './GuidelinesGate';
import { GuidelinesReminder } from './GuidelinesReminder';
import { policiesApi } from '../api/policiesApi';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const status = {
  policyType: 'community_guidelines',
  currentVersion: '1.0',
  acknowledged: false,
  acknowledgedAt: null,
};
test('already acknowledged users continue without another click', async () => {
  vi.spyOn(policiesApi, 'getStatus').mockResolvedValue({
    ...status,
    acknowledged: true,
  });
  const next = vi.fn();
  render(<GuidelinesGate onContinue={next} onSignOut={vi.fn()} />);
  await waitFor(() => expect(next).toHaveBeenCalledOnce());
});
test('new acknowledgment requires agreement and supports sign out', async () => {
  vi.spyOn(policiesApi, 'getStatus').mockResolvedValue(status);
  const save = vi
    .spyOn(policiesApi, 'acknowledge')
    .mockResolvedValue({ ...status, acknowledged: true });
  const next = vi.fn(),
    signOut = vi.fn();
  render(<GuidelinesGate onContinue={next} onSignOut={signOut} />);
  const agree = await screen.findByRole('checkbox');
  expect(
    (
      screen.getByRole('button', {
        name: 'Agree and Continue',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(signOut).toHaveBeenCalledOnce();
  fireEvent.click(agree);
  fireEvent.click(screen.getByRole('button', { name: 'Agree and Continue' }));
  await waitFor(() => expect(save).toHaveBeenCalledOnce());
  expect(next).toHaveBeenCalledOnce();
});
test('guidelines reminder opens an accessible dialog that closes with Escape', () => {
  render(<GuidelinesReminder compact />);
  fireEvent.click(screen.getByRole('button', { name: 'Community Guidelines' }));
  const dialog = screen.getByRole('dialog');
  expect(dialog.getAttribute('aria-modal')).toBe('true');
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
});
