import { useEffect, useRef } from 'react';

export function useDialogFocus(active: boolean) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active) return;
    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [active]);

  return dialogRef;
}
