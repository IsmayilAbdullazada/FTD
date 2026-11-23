import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AdminDataPanel } from './AdminDataPanel';
import { adminApi } from '../api/adminApi';
import type { AdminTable } from '../types';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test('private text remains disabled until an explicitly reasoned reveal succeeds', async () => {
  const table: AdminTable = {
    name: 'private_messages',
    readOnly: false,
    primaryKey: ['id'],
    foreignKeys: [],
    columns: [
      {
        name: 'id',
        type: 'text',
        nullable: false,
        defaultValue: null,
        readOnly: true,
        sensitive: false,
      },
      {
        name: 'content',
        type: 'text',
        nullable: false,
        defaultValue: null,
        readOnly: false,
        sensitive: true,
      },
    ],
  };
  vi.spyOn(adminApi, 'rows').mockResolvedValue({
    items: [
      {
        id: 'private-1',
        content: '[Hidden — reveal to inspect]',
        _key: { id: 'private-1' },
      },
    ],
    total: 1,
    page: 1,
    pageSize: 50,
  });
  const reveal = vi.spyOn(adminApi, 'reveal').mockResolvedValue({
    id: 'private-1',
    content: 'Revealed fixture message',
  });
  render(<AdminDataPanel tables={[table]} />);
  fireEvent.click(await screen.findByRole('button', { name: 'View / edit' }));
  expect(
    (screen.getByLabelText('content *') as HTMLTextAreaElement).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole('button', { name: 'Reveal protected text (audited)' }),
  );
  expect(reveal).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Reason (at least 10 characters)'), {
    target: { value: 'Investigate an authorized test report' },
  });
  fireEvent.click(
    screen.getByRole('button', { name: 'Reveal protected text (audited)' }),
  );
  await waitFor(() =>
    expect(
      (screen.getByLabelText('content *') as HTMLTextAreaElement).disabled,
    ).toBe(false),
  );
  expect(
    (screen.getByLabelText('content *') as HTMLTextAreaElement).value,
  ).toBe('Revealed fixture message');
});
