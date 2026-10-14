import clsx from 'clsx';
import { Check, Info, QrCode, Smartphone, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  computeTopUpQuote,
  formatMoney,
  validateTopUpAmount,
  type TopUpMethod,
} from '@cardapp/shared';
import { useCards, useCreateTopUp, useMe, useTopUpMethods } from '../api/hooks';
import { CardVisual } from '../components/CardVisual';
import { MainButton, MainButtonSpacer } from '../components/MainButton';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, DemoBadge, EmptyState, Panel, SectionTitle } from '../components/ui';
import { haptic } from '../lib/telegram';

const PRESETS = [5_000, 10_000, 25_000, 50_000];
const METHOD_ICON: Record<TopUpMethod, typeof QrCode> = {
  sbp: QrCode,
  sberpay: Smartphone,
  tpay: Smartphone,
  usdt: Wallet,
};

export function TopUp() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data: me } = useMe();
  const { data: cards } = useCards();
  const { data: methods } = useTopUpMethods();
  const create = useCreateTopUp();

  const activeCards = useMemo(() => (cards ?? []).filter((c) => c.status === 'active'), [cards]);
  const [cardId, setCardId] = useState<string | null>(params.get('cardId'));
  const [amountRub, setAmountRub] = useState('10000');
  const [method, setMethod] = useState<TopUpMethod>('sbp');

  useEffect(() => {
    if (activeCards.length && !activeCards.some((c) => c.id === cardId)) setCardId(activeCards[0]!.id);
  }, [activeCards, cardId]);

  const card = activeCards.find((c) => c.id === cardId);
  const amountMinor = (Number(amountRub.replace(/\D/g, '')) || 0) * 100;
  const tariffId = me?.subscription.active ? 'subscription' : 'one_time';
  const quote = card ? computeTopUpQuote(amountMinor, card.currency, tariffId, method) : null;
  const error = validateTopUpAmount(method, amountMinor);

  if (cards && !activeCards.length) {
    return (
      <div>
        <PageHeader back title="Пополнение" />
        <EmptyState
          icon={<Wallet className="size-6" />}
          title="Нет активных карт"
          text="Выпустите карту или разморозьте существующую"
          action={<Button onClick={() => navigate('/issue')}>Выпустить карту</Button>}
        />
      </div>
    );
  }

  const submit = () => {
    if (!card || error) return;
    create.mutate(
      { cardId: card.id, method, amountRubMinor: amountMinor },
      {
        onSuccess: (t) => {
          haptic.success();
          navigate(`/topup/${t.id}`, { replace: true });
        },
      },
    );
  };

  return (
    <div>
      <PageHeader back title="Пополнение" right={<DemoBadge />} />

      {/* выбор карты */}
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-5 pb-5">
        {activeCards.map((c) => (
          <button
            key={c.id}
            onClick={() => {
              haptic.selection();
              setCardId(c.id);
            }}
            className={clsx(
              'w-[150px] shrink-0 rounded-[18px] p-0.5 transition',
              c.id === cardId ? 'bg-gold' : 'bg-transparent opacity-60',
            )}
          >
            <CardVisual card={c} size="sm" />
          </button>
        ))}
      </div>

      <div className="px-5">
        {/* сумма */}
        <Panel className="p-5 text-center">
          <div className="text-[13px] font-medium text-muted">Сумма пополнения</div>
          <div className="mt-1 flex items-baseline justify-center gap-1">
            <input
              inputMode="numeric"
              value={Number(amountRub || 0).toLocaleString('ru-RU')}
              onChange={(e) => setAmountRub(e.target.value.replace(/\D/g, '').slice(0, 7))}
              className="font-display tabular w-full min-w-0 bg-transparent text-center text-[40px] font-bold tracking-tight outline-none"
              aria-label="Сумма в рублях"
            />
          </div>
          <div className="-mt-1 text-[20px] font-semibold text-muted">₽</div>
          <div className="mt-4 grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  haptic.selection();
                  setAmountRub(String(p));
                }}
                className={clsx(
                  'rounded-xl py-2 text-[13px] font-semibold',
                  amountMinor === p * 100 ? 'bg-gold/15 text-gold' : 'bg-surface-2 text-muted',
                )}
              >
                {p.toLocaleString('ru-RU')}
              </button>
            ))}
          </div>
          {error && amountMinor > 0 && <div className="mt-3 text-[13px] text-danger">{error}</div>}
        </Panel>

        {/* способ */}
        <div className="mt-6">
          <SectionTitle>Способ оплаты</SectionTitle>
          <Panel className="divide-y divide-line overflow-hidden">
            {methods?.map((m) => {
              const Icon = METHOD_ICON[m.id];
              const selected = m.id === method;
              return (
                <button
                  key={m.id}
                  disabled={!m.available}
                  onClick={() => {
                    haptic.selection();
                    setMethod(m.id);
                  }}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left disabled:opacity-45"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-gold">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 text-[15px] font-medium">
                      {m.title}
                      {m.id === 'sbp' && <Badge tone="gold">Без доп. комиссии</Badge>}
                    </span>
                    <span className="block truncate text-[13px] text-muted">{m.description}</span>
                  </span>
                  <span
                    className={clsx(
                      'flex size-6 items-center justify-center rounded-full border-2',
                      selected ? 'gold-fill border-transparent' : 'border-faint',
                    )}
                  >
                    {selected && <Check className="size-3.5" strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </Panel>
        </div>

        {/* расчёт */}
        {quote && card && (
          <Panel className="mt-6 divide-y divide-line">
            <Row label={`Комиссия ${quote.feePercent}%`} value={formatMoney(quote.feeRubMinor, 'RUB')} />
            <Row
              label="Курс"
              value={`1 ${card.currency === 'USD' ? '$' : '€'} = ${quote.rate.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} ₽`}
            />
            <Row label="Зачислим на карту" value={`≈ ${formatMoney(quote.creditedMinor, card.currency)}`} strong />
          </Panel>
        )}

        <div className="mt-4 flex items-start gap-2 px-1 text-[12px] leading-snug text-faint">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          Курс и комиссия демонстрационные. В рабочей версии курс фиксируется партнёром на момент создания платежа.
        </div>
      </div>

      <MainButtonSpacer />
      <MainButton
        text={quote && !error ? `Пополнить на ${formatMoney(amountMinor, 'RUB')}` : 'Пополнить'}
        onClick={submit}
        disabled={!card || !!error}
        loading={create.isPending}
      />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className={clsx('tabular', strong ? 'text-[17px] font-bold text-gold' : 'font-medium')}>{value}</span>
    </div>
  );
}
