import type { CardLimits, CardReveal } from '@cardapp/shared';
import { ProviderError, type CardProvider, type IssueCardInput, type ProviderCard } from '../types';

/**
 * Демо-эмитент. Ничего не выпускает: хранит фиктивные карты в памяти.
 * Номера — тестовые (4242…/5555…), не являются реальными картами.
 */
interface MockCardRecord extends ProviderCard {
  brand: IssueCardInput['brand'];
  readyAt: number;
}

export class MockCardProvider implements CardProvider {
  readonly name = 'mock';
  private cards = new Map<string, MockCardRecord>();
  private byIdempotencyKey = new Map<string, string>();

  constructor(private issueDelayMs = 2_500) {}

  private get(externalId: string): MockCardRecord {
    const c = this.cards.get(externalId);
    if (!c) throw new ProviderError('CARD_NOT_FOUND', 'Карта не найдена у поставщика');
    if (c.status === 'issuing' && Date.now() >= c.readyAt) c.status = 'active';
    return c;
  }

  private view(c: MockCardRecord): ProviderCard {
    const { externalId, status, last4, expMonth, expYear, balanceMinor } = c;
    return { externalId, status, last4, expMonth, expYear, balanceMinor };
  }

  /** Для сидирования демо-данных */
  seed(card: ProviderCard & { brand: IssueCardInput['brand'] }) {
    this.cards.set(card.externalId, { ...card, readyAt: 0 });
  }

  async issueCard(input: IssueCardInput) {
    const existing = this.byIdempotencyKey.get(input.idempotencyKey);
    if (existing) return this.view(this.get(existing));

    const now = new Date();
    const rec: MockCardRecord = {
      externalId: `mock_card_${Math.random().toString(36).slice(2, 10)}`,
      status: 'issuing',
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      expMonth: now.getMonth() + 1,
      expYear: now.getFullYear() + 3,
      balanceMinor: 0,
      brand: input.brand,
      readyAt: Date.now() + this.issueDelayMs,
    };
    this.cards.set(rec.externalId, rec);
    this.byIdempotencyKey.set(input.idempotencyKey, rec.externalId);
    return this.view(rec);
  }

  async getCard(externalId: string) {
    return this.view(this.get(externalId));
  }

  async freezeCard(externalId: string) {
    const c = this.get(externalId);
    if (c.status === 'active') c.status = 'frozen';
    return this.view(c);
  }

  async unfreezeCard(externalId: string) {
    const c = this.get(externalId);
    if (c.status === 'frozen') c.status = 'active';
    return this.view(c);
  }

  async closeCard(externalId: string) {
    const c = this.get(externalId);
    c.status = 'closed';
    return this.view(c);
  }

  async setLimits(externalId: string, _limits: CardLimits) {
    this.get(externalId);
  }

  async createRevealSession(externalId: string): Promise<CardReveal> {
    const c = this.get(externalId);
    if (c.status === 'issuing' || c.status === 'closed') {
      throw new ProviderError('CARD_NOT_READY', 'Реквизиты недоступны');
    }
    const prefix = c.brand === 'visa' ? '4242 4242 4242' : '5555 5555 5555';
    return {
      kind: 'demo',
      pan: `${prefix} ${c.last4}`,
      cvv: '000',
      expiry: `${String(c.expMonth).padStart(2, '0')}/${String(c.expYear).slice(-2)}`,
      expiresAt: new Date(Date.now() + 30_000).toISOString(),
    };
  }

  async creditCard(externalId: string, amountMinor: number, _reference: string) {
    const c = this.get(externalId);
    c.balanceMinor += amountMinor;
    return this.view(c);
  }
}
