import { DEMO_RATES, TARIFFS, TOPUP_METHODS } from './catalog';
import type { Card, CardCurrency, KycOutcome, TariffId, TopUpMethod, TopUpQuote, UserProfile } from './types';

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
  if (!user.kycLevel) {
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

export const KYC_REASONS: Record<Exclude<KycOutcome, 'approved'>, string> = {
  resubmission: 'Фото документа размыто или с бликом. Переснимите при хорошем освещении.',
  rejected: 'Документ не прошёл проверку. Свяжитесь с поддержкой, чтобы уточнить причину.',
};

/** Применяет результат проверки к профилю (общая логика mock-клиента и сервера) */
export function applyKycOutcome(user: UserProfile, outcome: KycOutcome) {
  user.kycStatus = outcome;
  if (outcome === 'approved') {
    if (user.kyc) delete user.kyc.reason;
    user.kycLevel = user.kyc?.level ?? 'basic';
  } else if (user.kyc) {
    user.kyc.reason = KYC_REASONS[outcome];
  }
}

export function validateTopUpAmount(method: TopUpMethod, amountRubMinor: number): string | null {
  const info = TOPUP_METHODS.find((m) => m.id === method);
  if (!info || !info.available) return 'Способ пополнения недоступен';
  if (amountRubMinor < info.minRubMinor) return `Минимум ${info.minRubMinor / 100} ₽`;
  if (amountRubMinor > info.maxRubMinor) return `Максимум ${info.maxRubMinor / 100} ₽`;
  return null;
}
