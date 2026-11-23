import { useEffect, useEffectEvent, useRef } from 'react';

const dialogs: HTMLElement[] = [];
const originalInert = new Map<HTMLElement, boolean>();
let originalOverflow = '';
let originalFocus: HTMLElement | null = null;
function syncBackground() {
  for (const [node, inert] of originalInert) node.inert = inert;
  originalInert.clear();
  let branch = dialogs.at(-1);
  while (branch?.parentElement) {
    for (const sibling of branch.parentElement.children) {
      if (
        sibling instanceof HTMLElement &&
        sibling !== branch &&
        !['SCRIPT', 'STYLE'].includes(sibling.tagName)
      ) {
        originalInert.set(sibling, sibling.inert);
        sibling.inert = true;
      }
    }
    if (branch.parentElement === document.body) break;
    branch = branch.parentElement;
  }
}

/** Manage the topmost dialog only, including nested confirmations. */
export function useDialogFocus(active: boolean, onClose?: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const dismiss = useEffectEvent(() => onClose?.());
  useEffect(() => {
    const node = dialogRef.current;
    if (!active || !node) return;
    const previous = document.activeElement;
    if (!dialogs.length) {
      originalOverflow = document.body.style.overflow;
      originalFocus = previous instanceof HTMLElement ? previous : null;
      document.body.style.overflow = 'hidden';
    }
    dialogs.push(node);
    syncBackground();
    node.tabIndex = -1;
    node.focus();
    const focusable = () =>
      [
        ...node.querySelectorAll<HTMLElement>(
          'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])',
        ),
      ].filter(
        (element) =>
          element.getClientRects().length && !element.closest('[inert]'),
      );
    const keydown = (event: KeyboardEvent) => {
      if (dialogs.at(-1) !== node) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      } else if (event.key === 'Tab') {
        const targets = focusable();
        const first = targets[0],
          last = targets.at(-1);
        if (!first) {
          event.preventDefault();
          node.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first || document.activeElement === node)
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last || document.activeElement === node)
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (dialogs.at(-1) === node && !node.contains(event.target as Node))
        node.focus();
    };
    document.addEventListener('keydown', keydown, true);
    document.addEventListener('focusin', containFocus);
    return () => {
      document.removeEventListener('keydown', keydown, true);
      document.removeEventListener('focusin', containFocus);
      const index = dialogs.indexOf(node);
      if (index !== -1) dialogs.splice(index, 1);
      syncBackground();
      if (!dialogs.length) document.body.style.overflow = originalOverflow;
      if (
        previous instanceof HTMLElement &&
        previous.isConnected &&
        !previous.closest('[inert]')
      )
        previous.focus();
      else if (
        !dialogs.length &&
        originalFocus?.isConnected &&
        !originalFocus.closest('[inert]')
      )
        originalFocus.focus();
    };
  }, [active]);
  return dialogRef;
}
