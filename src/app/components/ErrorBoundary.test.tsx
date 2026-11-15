import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
test('a render failure shows a usable recovery action', () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  function Broken(): never {
    throw new Error('Fixture render failure');
  }
  render(
    <ErrorBoundary>
      <Broken />
    </ErrorBoundary>,
  );
  expect(screen.getByRole('alert').textContent).toContain(
    'Something went wrong',
  );
  expect(screen.getByRole('button', { name: 'Reload page' })).toBeTruthy();
});
