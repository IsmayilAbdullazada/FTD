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
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("8h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  ENABLE_DEV_PERSONAS: z.enum(["true", "false"]).default("false"),
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
if (parsed.data.NODE_ENV === "production" && parsed.data.CORS_ORIGIN === "*") {
  throw new Error("CORS_ORIGIN cannot be * in production");
}
export const env = parsed.data;
