import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  JWT_ACCESS_SECRET: z.string().default('civicfix_access_jwt_secret_dev_key_2026_secure'),
  JWT_REFRESH_SECRET: z.string().default('civicfix_refresh_jwt_secret_dev_key_2026_secure'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('1h'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  AI_SERVICE_URL: z.string().default('http://127.0.0.1:8000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE: z.string().default('10485760').transform((val) => parseInt(val, 10)),
});

export const env = envSchema.parse(process.env);
