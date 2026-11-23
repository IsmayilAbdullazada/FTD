import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { MutationDialog } from './MutationDialog';
import { adminApi } from '../api/adminApi';
import type { AdminIntent } from '../types';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test('a destructive change requires the preview, password and typed table confirmation', async () => {
  const intent: AdminIntent = {
    operation: {
      kind: 'data',
      table: 'users',
      mode: 'delete',
      keys: [{ id: 'test-user' }],
      values: {},
    },
    reason: 'Deactivate an isolated test account',
  };
  vi.spyOn(adminApi, 'preview').mockResolvedValue({
    table: 'users',
    destructive: true,
    requiresPassword: true,
    rowsAffected: 1,
    before: [],
    after: [],
    relationships: [],
    previewToken: 'signed-preview',
  });
  const authenticate = vi
    .spyOn(adminApi, 'reauthenticate')
    .mockResolvedValue({ success: true, validForSeconds: 600 });
  const commit = vi
    .spyOn(adminApi, 'commit')
    .mockResolvedValue({ success: true, auditId: 'audit-123' });
  const done = vi.fn();
  render(<MutationDialog intent={intent} onClose={vi.fn()} onDone={done} />);
  const confirm = await screen.findByLabelText('Type users to confirm');
  const button = screen.getByRole('button', { name: 'Confirm change' });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(confirm, { target: { value: 'users' } });
  expect((button as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Confirm your current password'), {
    target: { value: 'Test-only-password!' },
  });
  fireEvent.click(button);
  await waitFor(() => expect(done).toHaveBeenCalledWith('audit-123'));
  expect(authenticate).toHaveBeenCalledWith('Test-only-password!');
  expect(commit).toHaveBeenCalledWith(intent, 'signed-preview', 'users');
});
