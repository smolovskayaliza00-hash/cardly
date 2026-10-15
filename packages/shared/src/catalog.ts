import type { CardCurrency, CardLimits, KycLevel, Tariff, TariffId, TopUpMethodInfo } from './types';

/**
 * Тарифы. Цены и комиссии — демонстрационные, задаются бизнесом
 * после согласования с платёжным партнёром.
 */
export const TARIFFS: Record<TariffId, Tariff> = {
  one_time: {
    id: 'one_time',
    title: 'Разовый',
    subtitle: 'Платите только за выпуск',
    priceMinor: 1_990_00,
    priceCurrency: 'RUB',
    period: 'once',
    topUpFeePercent: 4,
    maxCards: 3,
    features: [
      'Оплата за каждую карту один раз',
      'Без ежемесячной платы',
      'Комиссия за пополнение 4%',
      'До 3 активных карт',
    ],
  },
  subscription: {
    id: 'subscription',
    title: 'Премиум',
    subtitle: 'Подписка для активных',
    priceMinor: 690_00,
    priceCurrency: 'RUB',
    period: 'month',
    topUpFeePercent: 2,
    maxCards: 5,
    highlighted: true,
    features: [
      'Выпуск карт включён в подписку',
      'Комиссия за пополнение 2%',
      'До 5 активных карт',
      'Приоритетная поддержка',
    ],
  },
};

export const TARIFF_LIST: Tariff[] = [TARIFFS.one_time, TARIFFS.subscription];

export const TOPUP_METHODS: TopUpMethodInfo[] = [
  {
    id: 'sbp',
    title: 'СБП',
    description: 'По QR-коду или в приложении банка',
    extraFeePercent: 0,
    available: true,
    minRubMinor: 1_000_00,
    maxRubMinor: 300_000_00,
  },
  {
    id: 'sberpay',
    title: 'SberPay',
    description: 'Подтверждение в СберБанк Онлайн',
    extraFeePercent: 0.5,
    available: true,
    minRubMinor: 1_000_00,
    maxRubMinor: 150_000_00,
  },
  {
    id: 'tpay',
    title: 'T-Pay',
    description: 'Подтверждение в приложении Т-Банка',
    extraFeePercent: 0.5,
    available: true,
    minRubMinor: 1_000_00,
    maxRubMinor: 150_000_00,
  },
  {
    id: 'usdt',
    title: 'USDT',
    description: 'Скоро',
    extraFeePercent: 1,
    available: false,
    minRubMinor: 5_000_00,
    maxRubMinor: 1_000_000_00,
  },
];

/** Демонстрационные курсы (₽ за единицу валюты). В продакшене — от партнёра. */
export const DEMO_RATES: Record<CardCurrency, number> = {
  USD: 95.4,
  EUR: 103.9,
};

export const DEFAULT_LIMITS: Record<CardCurrency, CardLimits> = {
  USD: { perTransaction: 2_000_00, daily: 5_000_00, monthly: 20_000_00 },
  EUR: { perTransaction: 2_000_00, daily: 5_000_00, monthly: 20_000_00 },
};

export const LIMIT_BOUNDS: Record<keyof CardLimits, { min: number; max: number; step: number }> = {
  perTransaction: { min: 50_00, max: 5_000_00, step: 50_00 },
  daily: { min: 100_00, max: 10_000_00, step: 100_00 },
  monthly: { min: 500_00, max: 50_000_00, step: 500_00 },
};

/** Уровни верификации и лимиты (демо-значения, финальные — по требованиям партнёра) */
export const KYC_LEVELS: Record<KycLevel, { title: string; requirements: string; topUpMonthlyRubMinor: number; maxBalanceUsdMinor: number }> = {
  basic: {
    title: 'Базовая',
    requirements: 'Документ и селфи',
    topUpMonthlyRubMinor: 300_000_00,
    maxBalanceUsdMinor: 3_000_00,
  },
  extended: {
    title: 'Расширенная',
    requirements: 'Плюс подтверждение адреса',
    topUpMonthlyRubMinor: 3_000_000_00,
    maxBalanceUsdMinor: 30_000_00,
  },
};
