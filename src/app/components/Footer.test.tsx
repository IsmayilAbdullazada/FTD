import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { Footer } from './Footer';
afterEach(cleanup);
test('the footer offers only the canonical, formatted Community Guidelines', () => {
  render(<Footer />);
  for (const text of [
    'Privacy Policy',
    'Notice of Privacy Practices',
    'Non-Discrimination Policy',
    'Patient Rights',
  ])
    expect(screen.queryByText(text)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Community Guidelines' }));
  const dialog = screen.getByRole('dialog', { name: 'Community Guidelines' });
  expect(dialog.querySelectorAll('h1')).toHaveLength(0);
  expect(dialog.querySelectorAll('h3')).toHaveLength(4);
  expect(dialog.querySelectorAll('li')).toHaveLength(8);
  fireEvent.click(screen.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
