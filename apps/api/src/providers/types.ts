import type {
  CardBrand,
  CardCurrency,
  CardLimits,
  CardReveal,
  CardStatus,
  TopUpMethod,
  TopUpStatus,
} from '@cardapp/shared';

/**
 * ─────────────────────────────────────────────────────────────────────
 *  Контракты поставщиков. Чтобы подключить реального партнёра, достаточно
 *  реализовать эти интерфейсы (см. providers/partner-template) и указать
 *  CARD_PROVIDER / PAYMENT_PROVIDER в .env. Остальной код не меняется.
 * ─────────────────────────────────────────────────────────────────────
 */

/** Карта в терминах поставщика */
export interface ProviderCard {
  externalId: string;
  status: CardStatus;
  last4: string;
  expMonth: number;
  expYear: number;
  balanceMinor: number;
}

export interface IssueCardInput {
  /** Наш идентификатор клиента у партнёра (после KYC) */
  customerRef: string;
  brand: CardBrand;
  currency: CardCurrency;
  holderName: string;
  /** Повторный запрос с тем же ключом не должен выпускать вторую карту */
  idempotencyKey: string;
}

export interface CardProvider {
  readonly name: string;
  issueCard(input: IssueCardInput): Promise<ProviderCard>;
  getCard(externalId: string): Promise<ProviderCard>;
  freezeCard(externalId: string): Promise<ProviderCard>;
  unfreezeCard(externalId: string): Promise<ProviderCard>;
  closeCard(externalId: string): Promise<ProviderCard>;
  setLimits(externalId: string, limits: CardLimits): Promise<void>;
  /**
   * Сессия показа реквизитов. Реальный партнёр должен возвращать
   * `{ kind: 'widget', url }` — защищённый iframe, PAN/CVV не проходят через наш сервер.
   */
  createRevealSession(externalId: string): Promise<CardReveal>;
  /** Зачисление средств на карту после успешной оплаты */
  creditCard(externalId: string, amountMinor: number, reference: string): Promise<ProviderCard>;
}

export interface CreatePaymentInput {
  orderId: string;
  amountRubMinor: number;
  method: TopUpMethod;
  description: string;
  idempotencyKey: string;
}

export interface ProviderPayment {
  externalId: string;
  status: TopUpStatus;
  paymentUrl?: string;
  qrPayload?: string;
  expiresAt: string;
}

export interface PaymentEvent {
  externalId: string;
  status: TopUpStatus;
}

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<ProviderPayment>;
  getPayment(externalId: string): Promise<ProviderPayment>;
  /**
   * Проверяет подпись вебхука и разбирает событие.
   * Должен бросать ошибку, если подпись неверна.
   */
  parseWebhook(headers: Record<string, string | string[] | undefined>, rawBody: string): PaymentEvent;
  /** Курс конвертации RUB → валюта карты (₽ за единицу) */
  getRate(currency: CardCurrency): Promise<number>;
  /** Только mock: имитирует оплату пользователем */
  simulatePayment?(externalId: string): Promise<void>;
  /** In-process события (mock). Реальные партнёры шлют вебхуки. */
  onEvent?(handler: (e: PaymentEvent) => void): void;
}

export class ProviderError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
