let authenticatedSession = false;
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch(
  input: RequestInfo | URL,
  options?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, {
    ...options,
    headers: new Headers(options?.headers),
    credentials: 'include',
  });
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
  return new ApiError(body?.error || fallbackMessage, response.status);
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
