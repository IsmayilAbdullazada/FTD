import { fireEvent, render, screen, cleanup } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useState } from 'react';
import { useDialogFocus } from './useDialogFocus';
afterEach(cleanup);
function Example() {
  const [open, setOpen] = useState(false);
  const ref = useDialogFocus(open, () => setOpen(false));
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      {open && (
        <div ref={ref} role="dialog" aria-label="Example">
          <button>Inside</button>
        </div>
      )}
    </>
  );
}
test('opening focuses the dialog and Escape restores focus to its opener', () => {
  render(<Example />);
  const opener = screen.getByRole('button', { name: 'Open' });
  opener.focus();
  fireEvent.click(opener);
  expect(document.activeElement).toBe(screen.getByRole('dialog'));
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(opener);
  expect(document.body.style.overflow).not.toBe('hidden');
});
