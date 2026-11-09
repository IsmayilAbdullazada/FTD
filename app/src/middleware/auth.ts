import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { query } from "../config/db.js";
import { sessionCookie } from "../lib/session.js";

export type UserRole = "CARE_PARTNER" | "CLINICIAN_MODERATOR" | "SYSTEM_ADMIN";
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

function bearer(req: Request): string | undefined {
  const [scheme, token] = (req.header("authorization") ?? "").split(" ");
  return scheme?.toLowerCase() === "bearer" && token ? token : undefined;
}

function sessionToken(req: Request): string | undefined {
  return bearer(req) ?? sessionCookie(req);
}

async function authenticatedUser(token: string): Promise<AuthenticatedUser> {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ["HS256"],
    issuer: "ftdcare-api",
    audience: "ftdcare-web",
  });
  if (
    typeof payload === "string" ||
    typeof payload.id !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.sessionVersion !== "number"
  )
    throw new Error("Invalid session payload");
  const result = await query(
    `SELECT id,email,role,session_version FROM users WHERE id=$1 AND is_active`,
    [payload.id],
  );
  const user = result.rows[0];
  if (!user || user.session_version !== payload.sessionVersion)
    throw new Error("Session is no longer valid");
  return { id: user.id, email: user.email, role: user.role };
}

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = sessionToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    req.user = await authenticatedUser(token);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
  }
}

export const requireRole =
  (roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
export const requireStaff = requireRole([
  "CLINICIAN_MODERATOR",
  "SYSTEM_ADMIN",
]);
