let previewSession: { token: string; name: string; targetId?: string } | null =
  null;
export function setPreviewSession(
  token: string | null,
  name = '',
  targetId?: string,
) {
  previewSession = token ? { token, name, targetId } : null;
}
export function getPreviewSession() {
  return previewSession ? { name: previewSession.name, readOnly: true } : null;
}
let authenticatedSession = false;
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (previewSession) {
    if ((options?.method || 'GET').toUpperCase() !== 'GET')
      throw new ApiError('Preview is read-only', 403, 'PREVIEW_READ_ONLY');
    const raw =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const url = new URL(raw, window.location.origin);
    if (
      url.origin === window.location.origin &&
      (url.pathname.startsWith('/api/') || url.pathname.startsWith('/uploads/'))
    )
      headers.set('X-Preview-Token', previewSession.token);
  }
  const response = await fetch(input, {
    ...options,
    headers,
    credentials: 'include',
  });
  if (
    previewSession?.targetId &&
    response.ok &&
    /\/users\/me/.test(String(input))
  ) {
    const identity = await response
      .clone()
      .json()
      .catch(() => null);
    if (identity?.user?.id !== previewSession.targetId)
      throw new ApiError(
        'Preview identity could not be verified. Check proxy forwarding before continuing.',
        403,
      );
  }
  const url = String(input);
  const publicAuth = /\/auth\//.test(url);
  if (
    response.ok &&
    (/\/users\/me/.test(url) || /\/auth\/(login|register)/.test(url))
  )
    authenticatedSession = true;
  if (/\/auth\/logout/.test(url)) authenticatedSession = false;
  if (response.status === 401 && authenticatedSession && !publicAuth) {
    authenticatedSession = false;
    notifyExpiredSession();
  }
  return response;
}

function notifyExpiredSession(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('jh:session-expired', {
      detail: { reason: 'Your session has expired. Please sign in again.' },
    }),
  );
}

async function responseError(
  response: Response,
  fallbackMessage: string,
): Promise<ApiError> {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return new ApiError(
      `${fallbackMessage} (${response.status})`,
      response.status,
    );
  }
  const body = await response.json().catch(() => ({}));
  if (body?.code === 'GUIDELINES_ACK_REQUIRED')
    window.dispatchEvent(new Event('jh:guidelines-required'));
  return new ApiError(
    body?.error || fallbackMessage,
    response.status,
    body?.code,
  );
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  options?: RequestInit,
  fallbackMessage: string | ((response: Response) => string) = 'Request failed',
): Promise<T> {
  const response = await apiFetch(input, options);
  if (!response.ok)
    throw await responseError(
      response,
      typeof fallbackMessage === 'function'
        ? fallbackMessage(response)
        : fallbackMessage,
    );
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('Backend returned an invalid response', response.status);
  }
  return response.json() as Promise<T>;
}

export const safeFetchJson = requestJson;
