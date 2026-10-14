import type { Config } from '../config';
import { MockCardProvider } from './mock/MockCardProvider';
import { MockPaymentProvider } from './mock/MockPaymentProvider';
import { PartnerCardProvider } from './partner-template/PartnerCardProvider';
import { PartnerPaymentProvider } from './partner-template/PartnerPaymentProvider';
import type { CardProvider, PaymentProvider } from './types';

export interface Providers {
  cards: CardProvider;
  payments: PaymentProvider;
}

export function createProviders(config: Config): Providers {
  const cards: CardProvider =
    config.CARD_PROVIDER === 'partner'
      ? new PartnerCardProvider(config.PARTNER_API_URL, config.PARTNER_API_KEY)
      : new MockCardProvider();

  const payments: PaymentProvider =
    config.PAYMENT_PROVIDER === 'partner'
      ? new PartnerPaymentProvider(config.PARTNER_API_URL, config.PARTNER_API_KEY, config.PARTNER_WEBHOOK_SECRET)
      : new MockPaymentProvider();

  return { cards, payments };
}

export * from './types';
