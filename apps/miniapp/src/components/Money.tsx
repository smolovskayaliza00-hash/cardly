import { formatMoney, type Currency } from '@cardapp/shared';
import { useUi } from '../store/ui';

/** Сумма с учётом режима «скрыть баланс» */
export function Money({
  minor,
  currency,
  sign,
  alwaysVisible,
}: {
  minor: number;
  currency: Currency;
  sign?: boolean;
  alwaysVisible?: boolean;
}) {
  const hidden = useUi((s) => s.hideBalance) && !alwaysVisible;
  if (hidden) return <span>••••</span>;
  return <span className="tabular">{formatMoney(minor, currency, { sign })}</span>;
}
