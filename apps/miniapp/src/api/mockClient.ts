import {
  TARIFF_LIST,
  TOPUP_METHODS,
  checkCanIssue,
  computeTopUpQuote,
  createDemoState,
  demoId,
  toCardholderName,
  validateTopUpAmount,
  type Card,
  type DemoResetMode,
  type DemoState,
  type TopUp,
  type Transaction,
} from '@cardapp/shared';
import { getTelegramUser } from '../lib/telegram';
import { ApiError, type ApiClient } from './types';

/**
 * Полностью клиентская имитация бэкенда.
 * Никаких реальных платежей и выпусков: все данные вымышленные и живут в localStorage.
 */

const STORAGE_KEY = 'cardly-demo-state-v1';
const ISSUE_DURATION_MS = 2_800;
const TOPUP_PROCESSING_MS = 2_500;
const KYC_DURATION_MS = 3_500;
const TOPUP_TTL_MS = 15 * 60_000;

interface MockState extends DemoState {
  topUps: TopUp[];
  kycStartedAt?: string;
  topUpPaidAt: Record<string, string>;
}

function demoUserInput() {
  const u = getTelegramUser();
  return u
    ? { telegramId: u.id, firstName: u.first_name, lastName: u.last_name, username: u.username, photoUrl: u.photo_url }
    : { telegramId: 100000001, firstName: 'Александр', lastName: 'Демо', username: 'demo_user' };
}

function fresh(mode: DemoResetMode): MockState {
  return { ...createDemoState(demoUserInput(), mode), topUps: [], topUpPaidAt: {} };
}

function load(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    /* приватный режим / недоступное хранилище */
  }
  return fresh('seeded');
}

let state: MockState = load();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

const delay = (min = 250, max = 650) =>
  new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** «Фоновые процессы» партнёра: выпуск карт, обработка платежей, KYC */
function tick() {
  const now = Date.now();
  let changed = false;

  for (const card of state.cards) {
    if (card.status === 'issuing' && card.readyAt && Date.parse(card.readyAt) <= now) {
      card.status = 'active';
      delete card.readyAt;
      changed = true;
    }
  }

  if (state.user.kycStatus === 'pending' && state.kycStartedAt && now - Date.parse(state.kycStartedAt) > KYC_DURATION_MS) {
    state.user.kycStatus = 'approved';
    changed = true;
  }

  for (const t of state.topUps) {
    if (t.status === 'awaiting_payment' && Date.parse(t.expiresAt) < now) {
      t.status = 'expired';
      changed = true;
    }
    const paidAt = state.topUpPaidAt[t.id];
    if (t.status === 'processing' && paidAt && now - Date.parse(paidAt) > TOPUP_PROCESSING_MS) {
      t.status = 'succeeded';
      const card = state.cards.find((c) => c.id === t.cardId);
      if (card) {
        card.balanceMinor += t.quote.creditedMinor;
        state.transactions.unshift({
          id: demoId('tx'),
          cardId: card.id,
          type: 'topup',
          status: 'completed',
          amountMinor: t.quote.creditedMinor,
          currency: card.currency,
          merchant: `Пополнение · ${TOPUP_METHODS.find((m) => m.id === t.method)?.title ?? ''}`,
          category: 'topup',
          createdAt: new Date().toISOString(),
          originalAmount: { amountMinor: t.quote.amountRubMinor, currency: 'RUB' },
        });
      }
      changed = true;
    }
  }

  if (changed) save();
}

function findCard(id: string): Card {
  const card = state.cards.find((c) => c.id === id);
  if (!card) throw new ApiError('NOT_FOUND', 'Карта не найдена', 404);
  return card;
}

function randomDigits(n: number) {
  return Array.from({ length: n }, () => Math.floor(Math.random() * 10)).join('');
}

export function createMockClient(): ApiClient {
  return {
    mode: 'mock',

    async getMe() {
      await delay(150, 300);
      tick();
      return clone(state.user);
    },

    async startKyc() {
      await delay();
      state.user.kycStatus = 'pending';
      state.kycStartedAt = new Date().toISOString();
      save();
      return clone(state.user);
    },

    async setSubscription(active) {
      await delay();
      const renews = new Date();
      renews.setMonth(renews.getMonth() + 1);
      state.user.subscription = active ? { active: true, renewsAt: renews.toISOString() } : { active: false };
      save();
      return clone(state.user);
    },

    async getTariffs() {
      await delay(100, 200);
      return clone(TARIFF_LIST);
    },

    async getTopUpMethods() {
      await delay(100, 200);
      return clone(TOPUP_METHODS);
    },

    async getCards() {
      await delay();
      tick();
      return clone(state.cards.filter((c) => c.status !== 'closed'));
    },

    async getCard(id) {
      await delay(150, 350);
      tick();
      return clone(findCard(id));
    },

    async issueCard(req) {
      await delay(600, 900);
      const check = checkCanIssue(state.user, state.cards, req.tariffId);
      if (!check.ok) throw new ApiError(check.code, check.message);

      const now = new Date();
      if (check.chargeReason === 'subscription') {
        const renews = new Date(now);
        renews.setMonth(renews.getMonth() + 1);
        state.user.subscription = { active: true, renewsAt: renews.toISOString() };
      }

      const card: Card = {
        id: demoId('card'),
        brand: req.brand,
        currency: req.currency,
        status: 'issuing',
        design: req.design,
        label: req.label.trim() || 'Новая карта',
        last4: randomDigits(4),
        holderName: toCardholderName(state.user.firstName, state.user.lastName),
        expMonth: now.getMonth() + 1,
        expYear: now.getFullYear() + 3,
        balanceMinor: 0,
        tariffId: req.tariffId,
        limits: { perTransaction: 2_000_00, daily: 5_000_00, monthly: 20_000_00 },
        createdAt: now.toISOString(),
        readyAt: new Date(now.getTime() + ISSUE_DURATION_MS).toISOString(),
      };
      state.cards.push(card);
      save();
      return clone(card);
    },

    async revealCard(id) {
      await delay(400, 700);
      const card = findCard(id);
      if (card.status !== 'active' && card.status !== 'frozen') {
        throw new ApiError('CARD_NOT_READY', 'Реквизиты будут доступны после выпуска');
      }
      // Заведомо тестовые номера — не являются реальными картами
      const pan = card.brand === 'visa' ? `4242 4242 4242 ${card.last4}` : `5555 5555 5555 ${card.last4}`;
      return {
        kind: 'demo',
        pan,
        cvv: '000',
        expiry: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`,
        expiresAt: new Date(Date.now() + 30_000).toISOString(),
      };
    },

    async freezeCard(id) {
      await delay();
      const card = findCard(id);
      if (card.status === 'active') card.status = 'frozen';
      save();
      return clone(card);
    },

    async unfreezeCard(id) {
      await delay();
      const card = findCard(id);
      if (card.status === 'frozen') card.status = 'active';
      save();
      return clone(card);
    },

    async updateLimits(id, limits) {
      await delay();
      const card = findCard(id);
      card.limits = { ...limits };
      save();
      return clone(card);
    },

    async closeCard(id) {
      await delay(500, 800);
      const card = findCard(id);
      card.status = 'closed';
      save();
      return clone(card);
    },

    async getTransactions(query = {}) {
      await delay(200, 450);
      tick();
      let list: Transaction[] = state.transactions;
      if (query.cardId) list = list.filter((t) => t.cardId === query.cardId);
      if (query.type && query.type !== 'all') list = list.filter((t) => t.type === query.type);
      if (query.limit) list = list.slice(0, query.limit);
      return clone(list);
    },

    async createTopUp(req) {
      await delay(500, 800);
      const card = findCard(req.cardId);
      if (card.status !== 'active') throw new ApiError('CARD_NOT_ACTIVE', 'Карта должна быть активна');
      const err = validateTopUpAmount(req.method, req.amountRubMinor);
      if (err) throw new ApiError('INVALID_AMOUNT', err);

      const tariffId = state.user.subscription.active ? 'subscription' : 'one_time';
      const now = Date.now();
      const id = demoId('top');
      const topUp: TopUp = {
        id,
        cardId: card.id,
        method: req.method,
        status: 'awaiting_payment',
        quote: computeTopUpQuote(req.amountRubMinor, card.currency, tariffId, req.method),
        qrPayload: `DEMO-NOT-A-PAYMENT:${id}`,
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + TOPUP_TTL_MS).toISOString(),
      };
      state.topUps.unshift(topUp);
      save();
      return clone(topUp);
    },

    async getTopUp(id) {
      await delay(100, 250);
      tick();
      const t = state.topUps.find((x) => x.id === id);
      if (!t) throw new ApiError('NOT_FOUND', 'Платёж не найден', 404);
      return clone(t);
    },

    async simulateTopUpPayment(id) {
      await delay(300, 500);
      const t = state.topUps.find((x) => x.id === id);
      if (!t) throw new ApiError('NOT_FOUND', 'Платёж не найден', 404);
      if (t.status === 'awaiting_payment') {
        t.status = 'processing';
        state.topUpPaidAt[id] = new Date().toISOString();
        save();
      }
      return clone(t);
    },

    async resetDemo(mode) {
      await delay(300, 500);
      state = fresh(mode);
      save();
    },
  };
}
