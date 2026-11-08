import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.string().default('5432'),
  DB_NAME: z.string().default('ftdcare_db'),
  DB_USER: z.string().default('ftdcare_user'),
  DB_PASSWORD: z.string().optional(),
  DB_POOL_MAX: z.string().default('20'),
  DB_SSL: z.string().default('false'),
  JWT_SECRET: z.string().min(16).default('development_jwt_secret_change_in_production_key_12345'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('*'),
  GEMINI_API_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
