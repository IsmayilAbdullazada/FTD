import { env } from "./env.js";

export const allowedOrigins = env.CORS_ORIGIN.split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

export function isAllowedOrigin(origin: string): boolean {
  return allowedOrigins.includes(origin.replace(/\/$/, ""));
}
