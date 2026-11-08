import { z } from "zod";

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isLocalAssetUrl(value: string): boolean {
  return (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\") &&
    !/[\u0000-\u001f]/.test(value)
  );
}

export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(isHttpUrl, "URL must use http or https");

export const publicAssetUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => isLocalAssetUrl(value) || isHttpUrl(value),
    "URL must be a local path or use http or https",
  );
