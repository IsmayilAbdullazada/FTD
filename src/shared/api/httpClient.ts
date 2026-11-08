const fallbackEnabled =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_API_FALLBACK === 'true';

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
  return fetch(input, {
    ...options,
    headers: new Headers(options?.headers),
    credentials: 'include',
  });
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
    return new ApiError(`${fallbackMessage} (${response.status})`, response.status);
  }
  const body = await response.json().catch(() => ({}));
  return new ApiError(body?.error || fallbackMessage, response.status);
}

export async function requestJson<T>(
  input: RequestInfo | URL,
  options?: RequestInit,
  fallbackMessage = 'Request failed',
): Promise<T> {
  const response = await apiFetch(input, options);
  if (response.status === 401) notifyExpiredSession();
  if (!response.ok) throw await responseError(response, fallbackMessage);
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError('Backend returned an invalid response', response.status);
  }
  return response.json() as Promise<T>;
}

export async function safeFetchJson<T>(
  url: string,
  options: RequestInit | undefined,
  fallback: () => T,
): Promise<T> {
  let response: Response;
  try {
    response = await apiFetch(url, options);
  } catch {
    if (fallbackEnabled) return fallback();
    throw new Error('The backend is unavailable. Please try again.');
  }

  if (response.status === 401) notifyExpiredSession();
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await response.json();
    if (response.ok) return data;
    throw new ApiError(
      data?.error || `Request failed (${response.status})`,
      response.status,
    );
  }
  if (fallbackEnabled) return fallback();
  throw new ApiError(
    `Backend returned an invalid response (${response.status})`,
    response.status,
  );
}
