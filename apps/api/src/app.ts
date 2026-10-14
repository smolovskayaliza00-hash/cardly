import cors from '@fastify/cors';
import Fastify, { type FastifyRequest } from 'fastify';
import { z, ZodError } from 'zod';
import { TARIFF_LIST, TOPUP_METHODS, type ApiErrorBody } from '@cardapp/shared';
import { InitDataError, validateInitData, type TelegramInitUser } from './auth/telegramInitData';
import type { Config } from './config';
import { AppError } from './errors';
import { createProviders, ProviderError, type Providers } from './providers';
import { AppService } from './services/AppService';
import { MemoryStore, type UserRecord } from './store/memoryStore';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody: string;
    account: UserRecord;
    tgUser: TelegramInitUser;
  }
}

const DEV_USER: TelegramInitUser = { id: 100000001, first_name: 'Александр', last_name: 'Демо', username: 'demo_user' };

// ── Схемы входных данных ─────────────────────────────────────────
const idParam = z.object({ id: z.string().min(1).max(64) });
const issueSchema = z.object({
  brand: z.enum(['visa', 'mastercard']),
  currency: z.enum(['USD', 'EUR']),
  tariffId: z.enum(['one_time', 'subscription']),
  design: z.enum(['graphite', 'gold', 'obsidian', 'champagne']),
  label: z.string().max(20),
});
const limitsSchema = z.object({
  perTransaction: z.number().int().positive(),
  daily: z.number().int().positive(),
  monthly: z.number().int().positive(),
});
const topUpSchema = z.object({
  cardId: z.string().min(1),
  method: z.enum(['sbp', 'sberpay', 'tpay', 'usdt']),
  amountRubMinor: z.number().int().positive(),
});
const txQuery = z.object({
  cardId: z.string().optional(),
  type: z.enum(['all', 'purchase', 'topup', 'fee', 'refund', 'subscription']).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export function buildApp(config: Config, providers: Providers = createProviders(config)) {
  const app = Fastify({ logger: { level: process.env.NODE_ENV === 'test' ? 'silent' : 'info' } });
  const store = new MemoryStore();
  const service = new AppService(store, providers);
  const isMock = providers.cards.name === 'mock' && providers.payments.name === 'mock';

  app.register(cors, {
    origin: config.CORS_ORIGIN ? config.CORS_ORIGIN.split(',').map((s) => s.trim()) : true,
  });

  // Сохраняем сырое тело — нужно для проверки подписи вебхуков
  app.decorateRequest('rawBody', '');
  app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
    req.rawBody = body as string;
    try {
      done(null, body ? JSON.parse(body as string) : {});
    } catch (e) {
      done(e as Error, undefined);
    }
  });

  app.setErrorHandler((err, _req, reply) => {
    const send = (status: number, code: string, message: string) =>
      reply.status(status).send({ error: { code, message } } satisfies ApiErrorBody);
    if (err instanceof AppError) return send(err.status, err.code, err.message);
    if (err instanceof ZodError) return send(400, 'VALIDATION', err.issues[0]?.message ?? 'Некорректные данные');
    if (err instanceof InitDataError) return send(401, 'UNAUTHORIZED', err.message);
    if (err instanceof ProviderError) return send(502, err.code, err.message);
    app.log.error(err);
    return send(500, 'INTERNAL', 'Внутренняя ошибка');
  });

  /** Аутентификация по Telegram initData: `Authorization: tma <initData>` */
  async function authenticate(req: FastifyRequest) {
    const header = req.headers.authorization ?? '';
    const [scheme, data] = header.split(' ');
    let tgUser: TelegramInitUser;
    if (scheme === 'tma' && data) {
      tgUser = validateInitData(data, config.BOT_TOKEN, config.INIT_DATA_MAX_AGE_SEC).user;
    } else if (config.DEV_SKIP_AUTH) {
      tgUser = DEV_USER;
    } else {
      throw new AppError('UNAUTHORIZED', 'Требуется авторизация Telegram', 401);
    }
    req.tgUser = tgUser;
    req.account = service.ensureUser(tgUser);
  }

  app.get('/api/health', async () => ({ ok: true, cardProvider: providers.cards.name, paymentProvider: providers.payments.name }));

  // Вебхуки партнёра — без Telegram-авторизации, но с проверкой подписи
  app.post('/api/webhooks/payments', async (req, reply) => {
    const event = providers.payments.parseWebhook(req.headers, req.rawBody);
    await service.handlePaymentEvent(event);
    return reply.status(200).send({ ok: true });
  });

  app.register(async (r) => {
    r.addHook('preHandler', authenticate);

    r.get('/api/me', async (req) => service.getProfile(req.account));
    r.post('/api/kyc/start', async (req) => service.startKyc(req.account));
    r.post('/api/me/subscription', async (req) => {
      const { active } = z.object({ active: z.boolean() }).parse(req.body);
      return service.setSubscription(req.account, active);
    });

    r.get('/api/tariffs', async () => TARIFF_LIST);
    r.get('/api/topup-methods', async () => TOPUP_METHODS);

    r.get('/api/cards', async (req) => service.listCards(req.account));
    r.post('/api/cards', async (req) => service.issueCard(req.account, issueSchema.parse(req.body)));
    r.get('/api/cards/:id', async (req) => service.getCard(req.account, idParam.parse(req.params).id));
    r.post('/api/cards/:id/reveal', async (req) => service.revealCard(req.account, idParam.parse(req.params).id));
    r.post('/api/cards/:id/freeze', async (req) => service.cardAction(req.account, idParam.parse(req.params).id, 'freeze'));
    r.post('/api/cards/:id/unfreeze', async (req) =>
      service.cardAction(req.account, idParam.parse(req.params).id, 'unfreeze'),
    );
    r.post('/api/cards/:id/close', async (req) => service.cardAction(req.account, idParam.parse(req.params).id, 'close'));
    r.patch('/api/cards/:id/limits', async (req) =>
      service.updateLimits(req.account, idParam.parse(req.params).id, limitsSchema.parse(req.body)),
    );

    r.get('/api/transactions', async (req) => service.listTransactions(req.account, txQuery.parse(req.query)));

    r.post('/api/topups', async (req) => service.createTopUp(req.account, topUpSchema.parse(req.body)));
    r.get('/api/topups/:id', async (req) => service.getTopUp(req.account, idParam.parse(req.params).id));

    // Демо-эндпоинты: существуют только при mock-поставщиках
    if (isMock) {
      r.post('/api/topups/:id/simulate', async (req) => service.simulateTopUp(req.account, idParam.parse(req.params).id));
      r.post('/api/demo/reset', async (req, reply) => {
        const { mode } = z.object({ mode: z.enum(['seeded', 'fresh']) }).parse(req.body);
        service.resetUser(req.tgUser, mode);
        return reply.status(204).send();
      });
    }
  });

  return app;
}
