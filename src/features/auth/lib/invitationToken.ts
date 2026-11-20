export function invitationToken(value: string): string {
  const input = value.trim();
  if (/^https?:\/\//i.test(input)) {
    try {
      return new URL(input).searchParams.get('token')?.trim() || '';
    } catch {
      return '';
    }
  }
  return /^[A-Za-z0-9_-]+$/.test(input) ? input : '';
}
