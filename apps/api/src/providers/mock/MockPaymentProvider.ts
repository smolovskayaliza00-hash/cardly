import { DEMO_RATES, type CardCurrency } from '@cardapp/shared';
import {
  ProviderError,
  type CreatePaymentInput,
  type PaymentEvent,
  type PaymentProvider,
  type ProviderPayment,
} from '../types';

/**
 * Демо-платёжный шлюз. Деньги не принимает, платёжные данные не запрашивает.
 * QR-payload заведомо невалиден для СБП.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';
  private payments = new Map<string, ProviderPayment>();
  private byIdempotencyKey = new Map<string, string>();
  private handlers: ((e: PaymentEvent) => void)[] = [];

  constructor(private processingDelayMs = 2_500) {}

  async createPayment(input: CreatePaymentInput) {
    const existing = this.byIdempotencyKey.get(input.idempotencyKey);
    if (existing) return this.getPayment(existing);

    const externalId = `mock_pay_${Math.random().toString(36).slice(2, 10)}`;
    const p: ProviderPayment = {
      externalId,
      status: 'awaiting_payment',
      qrPayload: `DEMO-NOT-A-PAYMENT:${externalId}`,
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    };
    this.payments.set(externalId, p);
    this.byIdempotencyKey.set(input.idempotencyKey, externalId);
    return { ...p };
  }

  async getPayment(externalId: string) {
    const p = this.payments.get(externalId);
    if (!p) throw new ProviderError('PAYMENT_NOT_FOUND', 'Платёж не найден');
    if (p.status === 'awaiting_payment' && Date.parse(p.expiresAt) < Date.now()) {
      p.status = 'expired';
      this.emit({ externalId, status: 'expired' });
    }
    return { ...p };
  }

  parseWebhook(_headers: Record<string, string | string[] | undefined>, rawBody: string): PaymentEvent {
    // У mock-шлюза нет подписи; реальный провайдер ОБЯЗАН проверять HMAC/подпись
    const body = JSON.parse(rawBody) as PaymentEvent;
    if (!this.payments.has(body.externalId)) throw new ProviderError('PAYMENT_NOT_FOUND', 'Неизвестный платёж');
    return body;
  }

  async getRate(currency: CardCurrency) {
    return DEMO_RATES[currency];
  }

  async simulatePayment(externalId: string) {
    const p = this.payments.get(externalId);
    if (!p || p.status !== 'awaiting_payment') return;
    p.status = 'processing';
    this.emit({ externalId, status: 'processing' });
    setTimeout(() => {
      p.status = 'succeeded';
      this.emit({ externalId, status: 'succeeded' });
    }, this.processingDelayMs);
  }

  onEvent(handler: (e: PaymentEvent) => void) {
    this.handlers.push(handler);
  }

  private emit(e: PaymentEvent) {
    for (const h of this.handlers) h(e);
  }
}
