import { afterEach, expect, test, vi } from 'vitest';
afterEach(() => vi.unstubAllGlobals());
test('preview sends its scoped header, blocks writes and fails closed if a proxy loses the target identity', async () => {
  const { setPreviewSession, requestJson } = await import('./httpClient');
  const fetchMock = vi.fn(async () =>
    Response.json({ user: { id: 'actual-admin' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
  setPreviewSession('scoped-test-token', 'User-123', 'target-care');
  try {
    await expect(
      requestJson('/api/v1/posts', { method: 'POST' }),
    ).rejects.toThrow('Preview is read-only');
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(requestJson('/api/v1/users/me')).rejects.toThrow(
      'Preview identity could not be verified',
    );
    const options = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(new Headers(options[1].headers).get('X-Preview-Token')).toBe(
      'scoped-test-token',
    );
  } finally {
    setPreviewSession(null);
  }
});
