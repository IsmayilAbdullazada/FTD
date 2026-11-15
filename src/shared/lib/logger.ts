export function reportError(event: string, _cause?: unknown): void {
  if (import.meta.env.DEV) console.error(event);
}
