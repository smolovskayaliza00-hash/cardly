import { createHmac, timingSafeEqual } from 'node:crypto';
import type { CardCurrency } from '@cardapp/shared';
import {
  ProviderError,
  type CreatePaymentInput,
  type PaymentEvent,
  type PaymentProvider,
  type ProviderPayment,
} from '../types';

/**
 * ШАБЛОН адаптера к платёжному партнёру (приём СБП / SberPay / T-Pay).
 * Показывает обязательные элементы: идемпотентность, проверку подписи вебхука, таймауты.
 */
export class PartnerPaymentProvider implements PaymentProvider {
  readonly name = 'partner';

  constructor(
    private baseUrl: string,
    private apiKey: string,
    private webhookSecret: string,
  ) {}

  async createPayment(_input: CreatePaymentInput): Promise<ProviderPayment> {
    void this.baseUrl;
    void this.apiKey;
    throw new ProviderError('NOT_IMPLEMENTED', 'Интеграция с платёжным партнёром ещё не реализована');
  }

  async getPayment(_externalId: string): Promise<ProviderPayment> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }

  /** Пример проверки HMAC-SHA256 подписи. Имя заголовка и формат — по документации партнёра. */
  parseWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): PaymentEvent {
    const signature = headers['x-signature'];
    if (typeof signature !== 'string' || !this.webhookSecret) {
      throw new ProviderError('BAD_SIGNATURE', 'Нет подписи');
    }
    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new ProviderError('BAD_SIGNATURE', 'Неверная подпись');

    const body = JSON.parse(rawBody) as { payment_id: string; status: string };
    const status =
      body.status === 'PAID' ? 'succeeded' : body.status === 'FAILED' ? 'failed' : body.status === 'EXPIRED' ? 'expired' : 'processing';
    return { externalId: body.payment_id, status };
  }

  async getRate(_currency: CardCurrency): Promise<number> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
}
