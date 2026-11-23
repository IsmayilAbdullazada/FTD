import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { HttpError } from '../../lib/http.js';
export const digest = (value: unknown) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function signAdminToken(
  payload: Record<string, unknown>,
  purpose: string,
  minutes: number,
) {
  return jwt.sign({ ...payload, purpose }, env.JWT_SECRET, {
    algorithm: 'HS256',
    issuer: 'ftdcare-admin',
    audience: 'ftdcare-' + purpose,
    expiresIn: minutes * 60,
    jwtid: crypto.randomUUID(),
  });
}
export function verifyAdminToken(token: string, purpose: string) {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'ftdcare-admin',
      audience: 'ftdcare-' + purpose,
    });
    if (typeof decoded === 'string' || decoded.purpose !== purpose)
      throw new Error('Invalid purpose');
    return decoded;
  } catch {
    throw new HttpError(
      403,
      'This authorization has expired. Please try again.',
    );
  }
}
