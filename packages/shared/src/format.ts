import type { Currency } from './types';

const formatters = new Map<string, Intl.NumberFormat>();

function getFormatter(currency: Currency, fractionDigits: number) {
  const key = `${currency}:${fractionDigits}`;
  let f = formatters.get(key);
  if (!f) {
    f = new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    formatters.set(key, f);
  }
  return f;
}

export interface FormatMoneyOptions {
  /** Показывать «+» у положительных сумм */
  sign?: boolean;
  /** Отбрасывать копейки, если сумма целая */
  compact?: boolean;
}

export function formatMoney(minor: number, currency: Currency, opts: FormatMoneyOptions = {}): string {
  const whole = minor % 100 === 0;
  const digits = opts.compact && whole ? 0 : currency === 'RUB' && whole ? 0 : 2;
  const formatted = getFormatter(currency, digits).format(Math.abs(minor) / 100);
  if (minor < 0) return `−${formatted}`;
  if (opts.sign && minor > 0) return `+${formatted}`;
  return formatted;
}

export const CURRENCY_SYMBOL: Record<Currency, string> = { USD: '$', EUR: '€', RUB: '₽' };
