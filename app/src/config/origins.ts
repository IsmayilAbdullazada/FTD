import { env } from './env.js';

export const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((value) => value.trim().replace(/\/$/, ''))
  .filter(Boolean);

export function isAllowedOrigin(origin: string): boolean {
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.includes(normalized)) return true;
  if (env.NODE_ENV !== 'production') {
    try {
      const { hostname } = new URL(normalized);
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.endsWith('.run.app')
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}
