import { verifyAdminToken } from '../modules/admin/adminTokens.js';
import { readOnlyRequestScope } from '../config/db.js';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { query } from '../config/db.js';
import { sessionCookie } from '../lib/session.js';
import type { UserRole } from '../lib/roles.js';

export type { UserRole } from '../lib/roles.js';
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  sessionVersion?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      preview?: boolean;
      previewActor?: AuthenticatedUser;
    }
  }
}

function bearer(req: Request): string | undefined {
  const [scheme, token] = (req.header('authorization') ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}

function sessionToken(req: Request): string | undefined {
  return bearer(req) ?? sessionCookie(req);
}

async function authenticatedUser(token: string): Promise<AuthenticatedUser> {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    issuer: 'ftdcare-api',
    audience: 'ftdcare-web',
  });
  if (
    typeof payload === 'string' ||
    typeof payload.id !== 'string' ||
    typeof payload.email !== 'string' ||
    typeof payload.sessionVersion !== 'number'
  )
    throw new Error('Invalid session payload');
  const result = await query(
    `SELECT id,email,role,session_version FROM users WHERE id=$1 AND is_active`,
    [payload.id],
  );
  const user = result.rows[0];
  if (!user || user.session_version !== payload.sessionVersion)
    throw new Error('Session is no longer valid');
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    sessionVersion: user.session_version,
  };
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.user) {
    next();
    return;
  }
  const token = sessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  try {
    req.user = await authenticatedUser(token);
    const previewToken = req.header('X-Preview-Token');
    if (previewToken) {
      if (
        env.ENABLE_ADMIN_CONSOLE !== 'true' ||
        req.user.role !== 'SYSTEM_ADMIN'
      ) {
        res.status(403).json({ error: 'Preview is unavailable' });
        return;
      }
      const claims = verifyAdminToken(previewToken, 'preview');
      if (
        claims.adminId !== req.user.id ||
        claims.sessionVersion !== req.user.sessionVersion ||
        typeof claims.targetId !== 'string'
      ) {
        res
          .status(403)
          .json({ error: 'Preview authorization is no longer valid' });
        return;
      }
      if (req.method !== 'GET') {
        res
          .status(403)
          .json({ error: 'Preview is read-only', code: 'PREVIEW_READ_ONLY' });
        return;
      }
      const target = (
        await query(
          "SELECT id,email,role,session_version FROM users WHERE id=$1 AND is_active AND role IN ('CARE_PARTNER','CLINICIAN_MODERATOR')",
          [claims.targetId],
        )
      ).rows[0];
      if (!target) {
        res.status(403).json({ error: 'Preview target is unavailable' });
        return;
      }
      req.previewActor = req.user;
      req.preview = true;
      req.user = {
        id: target.id,
        email: target.email,
        role: target.role,
        sessionVersion: target.session_version,
      };
      const json = res.json.bind(res);
      res.json = (body: unknown) => json(maskPreview(body));
      await readOnlyRequestScope(next, (cleanup) => {
        res.once('finish', cleanup);
        res.once('close', cleanup);
      });
    } else next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export const requireRole =
  (roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
export const requireStaff = requireRole([
  'CLINICIAN_MODERATOR',
  'SYSTEM_ADMIN',
]);

function maskPreview(value: unknown, privateBranch = false): unknown {
  if (value instanceof Date) return value;
  if (Array.isArray(value))
    return value.map((item) =>
      privateBranch && typeof item === 'string'
        ? '[Hidden in preview]'
        : maskPreview(item, privateBranch),
    );
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => {
        if (
          /email|phone|clinicPatientId|phiAlerts|password|token|^recipient$/i.test(
            key,
          )
        )
          return [
            key,
            Array.isArray(item)
              ? []
              : typeof item === 'boolean'
                ? item
                : '[Hidden in preview]',
          ];
        const privateValue =
          privateBranch ||
          /private.*(?:note|message)|privateNotes|moderatorNotes/i.test(key);
        if (
          privateValue &&
          /^(content|message|text|rawContent|sanitizedContent)$/i.test(key)
        )
          return [key, '[Hidden in preview]'];
        if (
          privateValue &&
          typeof item === 'string' &&
          /private.*(?:note|message)|privateNotes|moderatorNotes/i.test(key)
        )
          return [key, '[Hidden in preview]'];
        return [key, maskPreview(item, privateValue)];
      }),
    );
  return value;
}
