import { z } from 'zod';

try {
  // Node ≥ 20.12: загрузка .env без сторонних зависимостей
  process.loadEnvFile();
} catch {
  /* .env отсутствует — используем переменные окружения */
}

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true' || v === '1');

const schema = z.object({
  PORT: z.coerce.number().default(8787),
  BOT_TOKEN: z.string().default(''),
  DEV_SKIP_AUTH: bool,
  INIT_DATA_MAX_AGE_SEC: z.coerce.number().default(86_400),
  CORS_ORIGIN: z.string().default(''),
  CARD_PROVIDER: z.enum(['mock', 'partner']).default('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'partner']).default('mock'),
  PARTNER_API_URL: z.string().default(''),
  PARTNER_API_KEY: z.string().default(''),
  PARTNER_WEBHOOK_SECRET: z.string().default(''),
});

export const config = schema.parse(process.env);
export type Config = typeof config;

if (!config.BOT_TOKEN && !config.DEV_SKIP_AUTH) {
  throw new Error('BOT_TOKEN не задан. Для локальной разработки установите DEV_SKIP_AUTH=true.');
}
