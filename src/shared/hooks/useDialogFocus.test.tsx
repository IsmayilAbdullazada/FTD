import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test } from 'vitest';
import { useDialogFocus } from './useDialogFocus';
afterEach(cleanup);
function Dialog({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useDialogFocus(true, onClose);
  return (
    <div role="dialog" aria-modal="true" ref={ref}>
      {children}
    </div>
  );
}
function Nested() {
  const [outer, setOuter] = useState(false),
    [inner, setInner] = useState(false);
  return (
    <>
      <button onClick={() => setOuter(true)}>Open editor</button>
      {outer && (
        <Dialog onClose={() => setOuter(false)}>
          <button onClick={() => setInner(true)}>Review edit</button>
          {inner && (
            <Dialog onClose={() => setInner(false)}>
              <button
                onClick={() => {
                  setInner(false);
                  setOuter(false);
                }}
              >
                Confirm both
              </button>
            </Dialog>
          )}
        </Dialog>
      )}
    </>
  );
}
test('closing a confirmation and its editor together restores the original trigger', () => {
  render(<Nested />);
  const trigger = screen.getByRole('button', { name: 'Open editor' });
  trigger.focus();
  fireEvent.click(trigger);
  fireEvent.click(screen.getByRole('button', { name: 'Review edit' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm both' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(trigger);
});
