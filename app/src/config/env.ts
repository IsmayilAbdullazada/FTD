import { z } from "zod";

const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(5432),
  DB_NAME: z.string().default("ftdcare_db"),
  DB_USER: z.string().default("ftdcare_user"),
  DB_PASSWORD: z.string().default(""),
  DB_POOL_MAX: z.coerce.number().int().positive().default(20),
  DB_SSL: z.enum(["true", "false"]).default("false"),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).default(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SESSION_COOKIE_MAX_AGE_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 60 * 60 * 1000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ENABLE_DEV_PERSONAS: z.enum(["true", "false"]).default("false"),
  ENABLE_DATABASE_RESET: z.enum(["true", "false"]).default("false"),
  ALLOW_PRODUCTION_SEED: z.enum(["true", "false"]).default("false"),
  GEMINI_API_KEY: z.string().optional(),
  APP_URL: z.string().url().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z
    .string()
    .default("Hopkins Care Partner Connect <no-reply@localhost>"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join(", ");
  throw new Error(`Invalid backend configuration: ${details}`);
}
if (parsed.data.NODE_ENV === "production") {
  if (parsed.data.DB_PASSWORD.length < 12)
    throw new Error(
      "DB_PASSWORD must contain at least 12 characters in production",
    );
  if (parsed.data.CORS_ORIGIN === "*")
    throw new Error("CORS_ORIGIN cannot be * in production");
  const productionOrigins = parsed.data.CORS_ORIGIN.split(",").map((value) =>
    value.trim(),
  );
  if (
    productionOrigins.some((value) => {
      try {
        return new URL(value).protocol !== "https:";
      } catch {
        return true;
      }
    })
  )
    throw new Error(
      "Every production CORS_ORIGIN must be a valid HTTPS origin",
    );
  if (new URL(parsed.data.APP_URL).protocol !== "https:")
    throw new Error("APP_URL must use HTTPS in production");
}
export const env = parsed.data;
