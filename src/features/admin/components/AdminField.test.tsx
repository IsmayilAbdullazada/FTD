import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { AdminField, parseFields } from './AdminField';
afterEach(cleanup);
test('existing event dates are editable in local time and sent as ISO dates', () => {
  const field = { name: 'startsAt', label: 'Starts at', type: 'date' as const };
  const timestamp = '2027-01-15T12:30:00.000Z';
  const date = new Date(timestamp);
  render(<AdminField field={field} value={timestamp} onChange={() => {}} />);
  const input = screen.getByLabelText('Starts at') as HTMLInputElement;
  expect(input.value).toBe(
    new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16),
  );
  expect(parseFields([field], { startsAt: input.value })).toEqual({
    startsAt: timestamp,
  });
});
test('an optional boolean can be cleared without setting false', () => {
  const change = vi.fn();
  render(
    <AdminField
      field={{ name: 'active', label: 'Active', type: 'boolean' }}
      value={true}
      onChange={change}
    />,
  );
  fireEvent.change(screen.getByLabelText('Active'), { target: { value: '' } });
  expect(change).toHaveBeenCalledWith(undefined);
});
