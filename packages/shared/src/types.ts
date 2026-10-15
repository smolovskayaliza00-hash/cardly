/**
 * Доменная модель, общая для Mini App и бэкенда.
 *
 * Все денежные суммы хранятся в минорных единицах (центы, копейки) целыми числами,
 * чтобы избежать ошибок округления с плавающей точкой.
 */

export type CardBrand = 'visa' | 'mastercard';
export type CardCurrency = 'USD' | 'EUR';
export type Currency = CardCurrency | 'RUB';
export type CardStatus = 'issuing' | 'active' | 'frozen' | 'closed';
export type CardDesign = 'graphite' | 'gold' | 'obsidian' | 'champagne';

export interface CardLimits {
  /** Лимит на одну операцию, минорные единицы валюты карты */
  perTransaction: number;
  daily: number;
  monthly: number;
}

export interface Card {
  id: string;
  brand: CardBrand;
  currency: CardCurrency;
  status: CardStatus;
  design: CardDesign;
  label: string;
  last4: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  balanceMinor: number;
  tariffId: TariffId;
  limits: CardLimits;
  createdAt: string;
  /** Пока карта выпускается — ориентировочное время готовности */
  readyAt?: string;
}

/**
 * Реквизиты карты.
 *
 * В прототипе — заведомо фиктивные данные (`kind: 'demo'`).
 * В продакшене реквизиты НЕ должны проходить через наш сервер:
 * партнёр отдаёт одноразовый токен/URL защищённого виджета (`kind: 'widget'`),
 * который отображается во iframe. Так проект остаётся вне scope PCI DSS.
 */
export type CardReveal =
  | { kind: 'demo'; pan: string; cvv: string; expiry: string; expiresAt: string }
  | { kind: 'widget'; url: string; expiresAt: string };

export type TariffId = 'one_time' | 'subscription';

export interface Tariff {
  id: TariffId;
  title: string;
  subtitle: string;
  priceMinor: number;
  priceCurrency: 'RUB';
  period: 'once' | 'month';
  /** Комиссия за пополнение, % */
  topUpFeePercent: number;
  /** Максимум активных карт */
  maxCards: number;
  features: string[];
  highlighted?: boolean;
}

export type TransactionType = 'purchase' | 'topup' | 'fee' | 'refund' | 'subscription';
export type TransactionStatus = 'pending' | 'completed' | 'declined';
export type MerchantCategory =
  | 'subscriptions'
  | 'travel'
  | 'shopping'
  | 'software'
  | 'games'
  | 'ads'
  | 'food'
  | 'topup'
  | 'fee';

export interface Transaction {
  id: string;
  cardId: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Со знаком: списания отрицательные, зачисления положительные */
  amountMinor: number;
  currency: CardCurrency;
  merchant: string;
  category: MerchantCategory;
  createdAt: string;
  /** Для пополнений — сумма в рублях */
  originalAmount?: { amountMinor: number; currency: Currency };
  declineReason?: string;
}

export type TopUpMethod = 'sbp' | 'sberpay' | 'tpay' | 'usdt';

export interface TopUpMethodInfo {
  id: TopUpMethod;
  title: string;
  description: string;
  /** Дополнительная комиссия способа, % */
  extraFeePercent: number;
  available: boolean;
  minRubMinor: number;
  maxRubMinor: number;
}

export type TopUpStatus = 'awaiting_payment' | 'processing' | 'succeeded' | 'failed' | 'expired';

export interface TopUpQuote {
  amountRubMinor: number;
  feeRubMinor: number;
  feePercent: number;
  /** Рублей за 1 единицу валюты карты */
  rate: number;
  creditedMinor: number;
  currency: CardCurrency;
}

export interface TopUp {
  id: string;
  cardId: string;
  method: TopUpMethod;
  status: TopUpStatus;
  quote: TopUpQuote;
  /** Ссылка на платёжную страницу/приложение банка (от платёжного партнёра) */
  paymentUrl?: string;
  /** Payload для QR СБП (от платёжного партнёра) */
  qrPayload?: string;
  createdAt: string;
  expiresAt: string;
}

export type KycDocumentType = 'passport_ru' | 'passport_intl' | 'id_card' | 'residence_permit';

export interface KycStartRequest {
  country: string;
  documentType: KycDocumentType;
  consent: true;
}

export type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  kycStatus: KycStatus;
  /** Данные заявки на верификацию (без самих документов — их хранит KYC-провайдер) */
  kyc?: { country: string; documentType: KycDocumentType; submittedAt: string };
  /** Активная подписка (если есть) */
  subscription: { active: boolean; renewsAt?: string };
  createdAt: string;
}

export interface IssueCardRequest {
  brand: CardBrand;
  currency: CardCurrency;
  tariffId: TariffId;
  design: CardDesign;
  label: string;
}

export interface TopUpRequest {
  cardId: string;
  method: TopUpMethod;
  amountRubMinor: number;
}

export interface TransactionsQuery {
  cardId?: string;
  type?: TransactionType | 'all';
  limit?: number;
}

export type DemoResetMode = 'seeded' | 'fresh';

export interface ApiErrorBody {
  error: { code: string; message: string };
}
