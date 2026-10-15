import { randomUUID } from 'node:crypto';
import {
  DEFAULT_LIMITS,
  TOPUP_METHODS,
  checkCanIssue,
  computeTopUpQuote,
  createDemoState,
  toCardholderName,
  validateTopUpAmount,
  type Card,
  type CardLimits,
  type DemoResetMode,
  type IssueCardRequest,
  type KycStartRequest,
  type TopUp,
  type TopUpRequest,
  type TransactionsQuery,
  type UserProfile,
} from '@cardapp/shared';
import type { TelegramInitUser } from '../auth/telegramInitData';
import { AppError, notFound } from '../errors';
import { MockCardProvider } from '../providers/mock/MockCardProvider';
import type { PaymentEvent, Providers } from '../providers';
import type { CardRecord, Store, TopUpRecord, UserRecord } from '../store/memoryStore';

const strip = <T extends { userId: string; externalId?: string }>(r: T) => {
  const { userId: _u, externalId: _e, ...rest } = r;
  return rest;
};

/**
 * Бизнес-логика. Работает только через интерфейсы Store и Providers,
 * поэтому смена БД или партнёра не затрагивает этот код.
 */
export class AppService {
  constructor(
    private store: Store,
    private providers: Providers,
  ) {
    providers.payments.onEvent?.((e) => void this.handlePaymentEvent(e));
  }

  // ── Пользователь ───────────────────────────────────────────────

  ensureUser(tgUser: TelegramInitUser): UserRecord {
    const existing = this.store.getUser(tgUser.id);
    if (existing) return existing;
    // Новый пользователь. Для mock-эмитента сразу наполняем демо-данными.
    return this.resetUser(tgUser, this.providers.cards instanceof MockCardProvider ? 'seeded' : 'fresh');
  }

  resetUser(tgUser: TelegramInitUser, mode: DemoResetMode): UserRecord {
    const userId = `usr_${tgUser.id}`;
    this.store.deleteUserData(userId);
    const demo = createDemoState(
      {
        telegramId: tgUser.id,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name,
        username: tgUser.username,
        photoUrl: tgUser.photo_url,
      },
      mode,
    );
    const rec: UserRecord = { profile: demo.user, customerRef: `cust_${tgUser.id}` };
    this.store.saveUser(rec);

    // Демо-id одинаковы у всех пользователей — делаем их уникальными в рамках хранилища
    const scoped = (id: string) => `${id}_${tgUser.id}`;
    const mock = this.providers.cards instanceof MockCardProvider ? this.providers.cards : null;
    for (const c of demo.cards) {
      const externalId = `mock_${scoped(c.id)}`;
      mock?.seed({ ...c, externalId });
      this.store.saveCard({ ...c, id: scoped(c.id), userId, externalId });
    }
    for (const t of demo.transactions) {
      this.store.addTransaction({ ...t, id: scoped(t.id), cardId: scoped(t.cardId), userId });
    }
    return rec;
  }

  getProfile(u: UserRecord): UserProfile {
    return u.profile;
  }

  startKyc(u: UserRecord, req: KycStartRequest): UserProfile {
    u.profile.kyc = { country: req.country, documentType: req.documentType, submittedAt: new Date().toISOString() };
    // В продакшене: создать заявку у KYC-провайдера и ждать вебхук с результатом
    if (u.profile.kycStatus === 'none' || u.profile.kycStatus === 'rejected') {
      u.profile.kycStatus = 'pending';
      setTimeout(() => {
        u.profile.kycStatus = 'approved';
      }, 3_500);
    }
    return u.profile;
  }

  setSubscription(u: UserRecord, active: boolean): UserProfile {
    // В продакшене: подписка активируется только по факту успешного платежа (вебхук)
    const renews = new Date();
    renews.setMonth(renews.getMonth() + 1);
    u.profile.subscription = active ? { active: true, renewsAt: renews.toISOString() } : { active: false };
    return u.profile;
  }

  // ── Карты ──────────────────────────────────────────────────────

  private async syncCard(c: CardRecord): Promise<CardRecord> {
    if (c.status === 'closed') return c;
    const remote = await this.providers.cards.getCard(c.externalId);
    Object.assign(c, { status: remote.status, balanceMinor: remote.balanceMinor, last4: remote.last4 });
    if (c.status !== 'issuing') delete c.readyAt;
    this.store.saveCard(c);
    return c;
  }

  private ownCard(u: UserRecord, id: string): CardRecord {
    const c = this.store.getCard(id);
    if (!c || c.userId !== u.profile.id) throw notFound('Карта');
    return c;
  }

  async listCards(u: UserRecord): Promise<Card[]> {
    const cards = this.store.listCards(u.profile.id).filter((c) => c.status !== 'closed');
    await Promise.all(cards.map((c) => this.syncCard(c)));
    return cards.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map(strip);
  }

  async getCard(u: UserRecord, id: string): Promise<Card> {
    return strip(await this.syncCard(this.ownCard(u, id)));
  }

  async issueCard(u: UserRecord, req: IssueCardRequest): Promise<Card> {
    const cards = this.store.listCards(u.profile.id);
    const check = checkCanIssue(u.profile, cards, req.tariffId);
    if (!check.ok) throw new AppError(check.code, check.message);

    // В продакшене: сначала платёж за выпуск/подписку (check.chargeRubMinor),
    // выпуск — только после вебхука об успешной оплате.
    if (check.chargeReason === 'subscription') this.setSubscription(u, true);

    const holderName = toCardholderName(u.profile.firstName, u.profile.lastName);
    const remote = await this.providers.cards.issueCard({
      customerRef: u.customerRef,
      brand: req.brand,
      currency: req.currency,
      holderName,
      idempotencyKey: randomUUID(),
    });

    const card: CardRecord = {
      id: `card_${randomUUID().slice(0, 12)}`,
      userId: u.profile.id,
      externalId: remote.externalId,
      brand: req.brand,
      currency: req.currency,
      status: remote.status,
      design: req.design,
      label: req.label.trim() || 'Новая карта',
      last4: remote.last4,
      holderName,
      expMonth: remote.expMonth,
      expYear: remote.expYear,
      balanceMinor: remote.balanceMinor,
      tariffId: req.tariffId,
      limits: { ...DEFAULT_LIMITS[req.currency] },
      createdAt: new Date().toISOString(),
      readyAt: new Date(Date.now() + 3_000).toISOString(),
    };
    this.store.saveCard(card);
    return strip(card);
  }

  async revealCard(u: UserRecord, id: string) {
    const c = this.ownCard(u, id);
    return this.providers.cards.createRevealSession(c.externalId);
  }

  async cardAction(u: UserRecord, id: string, action: 'freeze' | 'unfreeze' | 'close'): Promise<Card> {
    const c = this.ownCard(u, id);
    const p = this.providers.cards;
    const remote =
      action === 'freeze' ? await p.freezeCard(c.externalId) : action === 'unfreeze' ? await p.unfreezeCard(c.externalId) : await p.closeCard(c.externalId);
    c.status = remote.status;
    this.store.saveCard(c);
    return strip(c);
  }

  async updateLimits(u: UserRecord, id: string, limits: CardLimits): Promise<Card> {
    const c = this.ownCard(u, id);
    await this.providers.cards.setLimits(c.externalId, limits);
    c.limits = { ...limits };
    this.store.saveCard(c);
    return strip(c);
  }

  listTransactions(u: UserRecord, q: TransactionsQuery) {
    let list = this.store.listTransactions(u.profile.id);
    if (q.cardId) list = list.filter((t) => t.cardId === q.cardId);
    if (q.type && q.type !== 'all') list = list.filter((t) => t.type === q.type);
    if (q.limit) list = list.slice(0, q.limit);
    return list.map(({ userId: _u, ...t }) => t);
  }

  // ── Пополнения ─────────────────────────────────────────────────

  async createTopUp(u: UserRecord, req: TopUpRequest): Promise<TopUp> {
    const card = this.ownCard(u, req.cardId);
    await this.syncCard(card);
    if (card.status !== 'active') throw new AppError('CARD_NOT_ACTIVE', 'Карта должна быть активна');
    const err = validateTopUpAmount(req.method, req.amountRubMinor);
    if (err) throw new AppError('INVALID_AMOUNT', err);

    const rate = await this.providers.payments.getRate(card.currency);
    const tariffId = u.profile.subscription.active ? 'subscription' : 'one_time';
    const quote = computeTopUpQuote(req.amountRubMinor, card.currency, tariffId, req.method, rate);
    const id = `top_${randomUUID().slice(0, 12)}`;

    const payment = await this.providers.payments.createPayment({
      orderId: id,
      amountRubMinor: req.amountRubMinor,
      method: req.method,
      description: `Пополнение карты •• ${card.last4}`,
      idempotencyKey: id,
    });

    const rec: TopUpRecord = {
      id,
      userId: u.profile.id,
      externalId: payment.externalId,
      cardId: card.id,
      method: req.method,
      status: payment.status,
      quote,
      paymentUrl: payment.paymentUrl,
      qrPayload: payment.qrPayload,
      createdAt: new Date().toISOString(),
      expiresAt: payment.expiresAt,
    };
    this.store.saveTopUp(rec);
    return strip(rec);
  }

  private ownTopUp(u: UserRecord, id: string): TopUpRecord {
    const t = this.store.getTopUp(id);
    if (!t || t.userId !== u.profile.id) throw notFound('Платёж');
    return t;
  }

  async getTopUp(u: UserRecord, id: string): Promise<TopUp> {
    const t = this.ownTopUp(u, id);
    if (t.status === 'awaiting_payment') {
      const remote = await this.providers.payments.getPayment(t.externalId);
      await this.handlePaymentEvent({ externalId: t.externalId, status: remote.status });
    }
    return strip(t);
  }

  async simulateTopUp(u: UserRecord, id: string): Promise<TopUp> {
    const sim = this.providers.payments.simulatePayment;
    if (!sim) throw new AppError('NOT_AVAILABLE', 'Доступно только в демо-режиме', 404);
    const t = this.ownTopUp(u, id);
    await sim.call(this.providers.payments, t.externalId);
    return strip(t);
  }

  /** Единая точка обработки статусов платежа — из вебхука или in-process события */
  async handlePaymentEvent(e: PaymentEvent) {
    const t = this.store.findTopUpByExternalId(e.externalId);
    if (!t || t.status === e.status) return;
    // Идемпотентность: финальные статусы не меняем
    if (t.status === 'succeeded' || t.status === 'failed' || t.status === 'expired') return;

    t.status = e.status;
    this.store.saveTopUp(t);

    if (e.status === 'succeeded') {
      const card = this.store.getCard(t.cardId);
      if (!card) return;
      const remote = await this.providers.cards.creditCard(card.externalId, t.quote.creditedMinor, t.id);
      card.balanceMinor = remote.balanceMinor;
      this.store.saveCard(card);
      this.store.addTransaction({
        id: `tx_${randomUUID().slice(0, 12)}`,
        userId: t.userId,
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
  }
}
