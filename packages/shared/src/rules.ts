import { DEMO_RATES, TARIFFS, TOPUP_METHODS } from './catalog';
import type { Card, CardCurrency, TariffId, TopUpMethod, TopUpQuote, UserProfile } from './types';

/** Бизнес-правила, одинаковые для клиента (предпросмотр) и сервера (источник истины). */

export function computeTopUpQuote(
  amountRubMinor: number,
  currency: CardCurrency,
  tariffId: TariffId,
  method: TopUpMethod,
  rate: number = DEMO_RATES[currency],
): TopUpQuote {
  const methodInfo = TOPUP_METHODS.find((m) => m.id === method);
  const feePercent = TARIFFS[tariffId].topUpFeePercent + (methodInfo?.extraFeePercent ?? 0);
  const amount = Math.max(0, Math.round(amountRubMinor));
  const feeRubMinor = Math.round((amount * feePercent) / 100);
  const creditedMinor = Math.floor((amount - feeRubMinor) / rate);
  return { amountRubMinor: amount, feeRubMinor, feePercent, rate, creditedMinor, currency };
}

export type IssueCheck =
  | { ok: true; chargeRubMinor: number; chargeReason: 'card' | 'subscription' | 'included' }
  | { ok: false; code: 'KYC_REQUIRED' | 'CARD_LIMIT_REACHED'; message: string };

export function checkCanIssue(user: UserProfile, cards: Card[], tariffId: TariffId): IssueCheck {
  if (user.kycStatus !== 'approved') {
    return { ok: false, code: 'KYC_REQUIRED', message: 'Для выпуска карты пройдите верификацию' };
  }
  const tariff = TARIFFS[tariffId];
  const active = cards.filter((c) => c.status !== 'closed').length;
  if (active >= tariff.maxCards) {
    return {
      ok: false,
      code: 'CARD_LIMIT_REACHED',
      message: `По тарифу «${tariff.title}» можно иметь до ${tariff.maxCards} карт`,
    };
  }
  if (tariffId === 'subscription') {
    return user.subscription.active
      ? { ok: true, chargeRubMinor: 0, chargeReason: 'included' }
      : { ok: true, chargeRubMinor: tariff.priceMinor, chargeReason: 'subscription' };
  }
  return { ok: true, chargeRubMinor: tariff.priceMinor, chargeReason: 'card' };
}

export function validateTopUpAmount(method: TopUpMethod, amountRubMinor: number): string | null {
  const info = TOPUP_METHODS.find((m) => m.id === method);
  if (!info || !info.available) return 'Способ пополнения недоступен';
  if (amountRubMinor < info.minRubMinor) return `Минимум ${info.minRubMinor / 100} ₽`;
  if (amountRubMinor > info.maxRubMinor) return `Максимум ${info.maxRubMinor / 100} ₽`;
  return null;
}
