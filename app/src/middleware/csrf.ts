import type { NextFunction, Request, Response } from "express";
import { isAllowedOrigin } from "../config/origins.js";
import { sessionCookie } from "../lib/session.js";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

export function protectCookieSession(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (
    safeMethods.has(req.method) ||
    !sessionCookie(req) ||
    req.header("authorization")?.toLowerCase().startsWith("bearer ")
  ) {
    next();
    return;
  }
  const origin = req.header("origin");
  if (!origin || !isAllowedOrigin(origin)) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }
  next();
}
