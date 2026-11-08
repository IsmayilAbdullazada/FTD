import type { Request, Response } from "express";
import { env } from "../config/env.js";

export const SESSION_COOKIE_NAME = "jh_session";

function cookieOptions(persistent: boolean) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict" as const,
    path: "/",
    ...(persistent ? { maxAge: env.SESSION_COOKIE_MAX_AGE_MS } : {}),
  };
}

export function setSessionCookie(
  res: Response,
  token: string,
  persistent: boolean,
): void {
  res.cookie(SESSION_COOKIE_NAME, token, cookieOptions(persistent));
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, cookieOptions(false));
}

export function sessionCookie(req: Request): string | undefined {
  const header = req.header("cookie");
  if (!header) return undefined;
  for (const item of header.split(";")) {
    const [name, ...parts] = item.trim().split("=");
    if (name !== SESSION_COOKIE_NAME) continue;
    try {
      return decodeURIComponent(parts.join("="));
    } catch {
      return undefined;
    }
  }
  return undefined;
}
