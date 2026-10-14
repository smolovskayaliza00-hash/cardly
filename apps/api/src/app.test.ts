import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { Card, TopUp, UserProfile } from '@cardapp/shared';
import { buildApp } from './app';
import { signInitData } from './auth/telegramInitData';
import type { Config } from './config';

process.env.NODE_ENV = 'test';

const TOKEN = '123456:TEST';
const config: Config = {
  PORT: 0,
  BOT_TOKEN: TOKEN,
  DEV_SKIP_AUTH: false,
  INIT_DATA_MAX_AGE_SEC: 3600,
  CORS_ORIGIN: '',
  CARD_PROVIDER: 'mock',
  PAYMENT_PROVIDER: 'mock',
  PARTNER_API_URL: '',
  PARTNER_API_KEY: '',
  PARTNER_WEBHOOK_SECRET: '',
};

const auth = (id = 7) =>
  `tma ${signInitData(
    { auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify({ id, first_name: 'Иван', last_name: 'Тестов' }) },
    TOKEN,
  )}`;

test('без initData — 401', async () => {
  const app = buildApp(config);
  const res = await app.inject({ method: 'GET', url: '/api/me' });
  assert.equal(res.statusCode, 401);
  await app.close();
});

test('демо-сценарий: профиль, карты, пополнение', async () => {
  const app = buildApp(config);
  const h = { authorization: auth() };

  const me = (await app.inject({ method: 'GET', url: '/api/me', headers: h })).json<UserProfile>();
  assert.equal(me.firstName, 'Иван');
  assert.equal(me.kycStatus, 'approved');

  const cards = (await app.inject({ method: 'GET', url: '/api/cards', headers: h })).json<Card[]>();
  assert.equal(cards.length, 3);
  const card = cards.find((c) => c.status === 'active')!;
  assert.equal(card.holderName, 'IVAN TESTOV');
  assert.ok(!('externalId' in card), 'внутренние поля не утекают');

  const create = await app.inject({
    method: 'POST',
    url: '/api/topups',
    headers: h,
    payload: { cardId: card.id, method: 'sbp', amountRubMinor: 10_000_00 },
  });
  assert.equal(create.statusCode, 200, create.body);
  const top = create.json<TopUp>();
  assert.equal(top.status, 'awaiting_payment');

  // чужой пользователь не видит платёж
  const foreign = await app.inject({ method: 'GET', url: `/api/topups/${top.id}`, headers: { authorization: auth(8) } });
  assert.equal(foreign.statusCode, 404);

  const bad = await app.inject({
    method: 'POST',
    url: '/api/topups',
    headers: h,
    payload: { cardId: card.id, method: 'sbp', amountRubMinor: 10_00 },
  });
  assert.equal(bad.statusCode, 400);

  await app.close();
});
