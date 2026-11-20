import type { Request, Response } from 'express';
import { env } from '../config/env.js';

export const SESSION_COOKIE_NAME = 'jh_session';

function isHttpsRequest(res: Response): boolean {
  if (env.NODE_ENV === 'production') return true;
  const req = res.req;
  if (!req) return env.APP_URL.startsWith('https://');
  if (req.secure) return true;
  const forwardedProto = req
    .header('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim()
    .toLowerCase();
  if (forwardedProto === 'https') return true;
  const origin = req.header('origin') ?? '';
  if (origin.startsWith('https://')) return true;
  const referer = req.header('referer') ?? '';
  if (referer.startsWith('https://')) return true;
  const host = (req.header('x-forwarded-host') ?? req.header('host') ?? '')
    .split(',')[0]
    .trim()
    .toLowerCase();
  if (
    env.APP_URL.startsWith('https://') &&
    host &&
    !host.startsWith('localhost') &&
    !host.startsWith('127.0.0.1')
  ) {
    return true;
  }
  return false;
}

function cookieOptions(res: Response, persistent: boolean) {
  const secure = isHttpsRequest(res);
  // Embedded development previews run inside a cross-site HTTPS frame.
  const embeddedPreview = env.NODE_ENV !== 'production' && secure;
  return {
    httpOnly: true,
    secure,
    sameSite: (embeddedPreview ? 'none' : 'strict') as 'none' | 'strict',
    ...(embeddedPreview ? { partitioned: true } : {}),
    path: '/',
    ...(persistent ? { maxAge: env.SESSION_COOKIE_MAX_AGE_MS } : {}),
  };
}

export function setSessionCookie(
  res: Response,
  token: string,
  persistent: boolean,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions(res, persistent));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(res, false));
}

export function sessionCookie(req: Request): string | undefined {
  const header = req.header('cookie');
  if (!header) return undefined;
  for (const item of header.split(';')) {
    const [name, ...parts] = item.trim().split('=');
    if (name !== SESSION_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(parts.join('='));
    } catch {
      return undefined;
    }
  }
  return undefined;
}
