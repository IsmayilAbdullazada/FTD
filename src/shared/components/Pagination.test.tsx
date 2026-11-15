import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { Pagination } from './Pagination';
afterEach(cleanup);
test('exposes page controls with correct boundaries and next-page action', () => {
  const setPage = vi.fn();
  render(
    <Pagination
      label="Discussions"
      page={1}
      pageCount={3}
      total={25}
      start={0}
      pageSize={10}
      setPage={setPage}
    />,
  );
  expect(
    (
      screen.getByRole('button', {
        name: 'Previous discussions page',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true);
  fireEvent.click(
    screen.getByRole('button', { name: 'Next discussions page' }),
  );
  expect(setPage).toHaveBeenCalledWith(2);
  expect(screen.getByText('1–10 of 25')).toBeTruthy();
});
