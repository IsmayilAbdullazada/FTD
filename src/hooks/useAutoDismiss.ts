import { Dispatch, SetStateAction, useEffect } from 'react';

export function useAutoDismiss<T>(
  value: T | null,
  setValue: Dispatch<SetStateAction<T | null>>,
  delayMs: number,
): void {
  useEffect(() => {
    if (value === null) return;
    const timeout = window.setTimeout(() => setValue(null), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, setValue, value]);
}
