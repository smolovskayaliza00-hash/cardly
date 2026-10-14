import clsx from 'clsx';
import {
  ArrowDownLeft,
  Code2,
  Coffee,
  Gamepad2,
  Megaphone,
  Plane,
  Receipt,
  Repeat,
  ShoppingBag,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { formatMoney, type Card, type MerchantCategory, type Transaction } from '@cardapp/shared';
import { formatDayHeader, formatTime, formatDateTime } from '../lib/dates';
import { Money } from './Money';
import { Sheet } from './Sheet';
import { Badge } from './ui';

const CATEGORY: Record<MerchantCategory, { icon: LucideIcon; label: string }> = {
  subscriptions: { icon: Repeat, label: 'Подписки' },
  travel: { icon: Plane, label: 'Путешествия' },
  shopping: { icon: ShoppingBag, label: 'Покупки' },
  software: { icon: Code2, label: 'Сервисы' },
  games: { icon: Gamepad2, label: 'Игры' },
  ads: { icon: Megaphone, label: 'Реклама' },
  food: { icon: Coffee, label: 'Кафе' },
  topup: { icon: ArrowDownLeft, label: 'Пополнение' },
  fee: { icon: Receipt, label: 'Комиссия' },
};

const STATUS_LABEL = { pending: 'В обработке', completed: 'Выполнена', declined: 'Отклонена' } as const;

function TxIcon({ tx }: { tx: Transaction }) {
  const Icon = CATEGORY[tx.category].icon;
  const incoming = tx.amountMinor > 0;
  return (
    <div
      className={clsx(
        'flex size-10 shrink-0 items-center justify-center rounded-2xl',
        incoming ? 'bg-success/12 text-success' : 'bg-surface-2 text-gold',
      )}
    >
      <Icon className="size-[18px]" strokeWidth={2} />
    </div>
  );
}

function TxRow({ tx, card, onClick }: { tx: Transaction; card?: Card; onClick: () => void }) {
  const declined = tx.status === 'declined';
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-surface-2">
      <TxIcon tx={tx} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-medium">{tx.merchant}</div>
        <div className="truncate text-[13px] text-muted">
          {tx.status === 'pending' ? (
            <span className="text-warning">В обработке</span>
          ) : declined ? (
            <span className="text-danger">Отклонена</span>
          ) : (
            CATEGORY[tx.category].label
          )}
          {card && <> · •• {card.last4}</>}
        </div>
      </div>
      <div className="text-right">
        <div
          className={clsx(
            'text-[15px] font-semibold',
            tx.amountMinor > 0 && 'text-success',
            declined && 'text-faint line-through',
          )}
        >
          <Money minor={tx.amountMinor} currency={tx.currency} sign />
        </div>
        <div className="text-[12px] text-faint">{formatTime(tx.createdAt)}</div>
      </div>
    </button>
  );
}

export function TransactionList({
  transactions,
  cards,
  grouped = true,
}: {
  transactions: Transaction[];
  cards?: Card[];
  grouped?: boolean;
}) {
  const [selected, setSelected] = useState<Transaction | null>(null);
  const cardById = useMemo(() => new Map(cards?.map((c) => [c.id, c])), [cards]);

  const groups = useMemo(() => {
    if (!grouped) return [{ key: 'all', title: '', items: transactions }];
    const map = new Map<string, Transaction[]>();
    for (const tx of transactions) {
      const key = new Date(tx.createdAt).toDateString();
      const list = map.get(key) ?? [];
      list.push(tx);
      map.set(key, list);
    }
    return [...map.entries()].map(([key, items]) => ({ key, title: formatDayHeader(items[0]!.createdAt), items }));
  }, [transactions, grouped]);

  const selCard = selected ? cardById.get(selected.cardId) : undefined;

  return (
    <>
      {groups.map((g) => (
        <div key={g.key} className="mb-3">
          {g.title && <div className="px-5 pt-2 pb-1 text-[13px] font-semibold text-muted">{g.title}</div>}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface">
            {g.items.map((tx) => (
              <TxRow key={tx.id} tx={tx} card={cardById.get(tx.cardId)} onClick={() => setSelected(tx)} />
            ))}
          </div>
        </div>
      ))}

      <Sheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="pb-4">
            <div className="flex flex-col items-center pt-2 pb-6 text-center">
              <TxIcon tx={selected} />
              <div className="mt-3 text-[15px] text-muted">{selected.merchant}</div>
              <div
                className={clsx(
                  'tabular font-display mt-1 text-[34px] font-semibold tracking-tight',
                  selected.amountMinor > 0 && 'text-success',
                )}
              >
                {formatMoney(selected.amountMinor, selected.currency, { sign: true })}
              </div>
              <div className="mt-2">
                <Badge
                  tone={selected.status === 'completed' ? 'success' : selected.status === 'pending' ? 'warning' : 'danger'}
                >
                  {STATUS_LABEL[selected.status]}
                </Badge>
              </div>
            </div>
            <dl className="divide-y divide-line overflow-hidden rounded-2xl bg-surface-2 text-[15px]">
              <DetailRow label="Дата" value={formatDateTime(selected.createdAt)} />
              <DetailRow label="Категория" value={CATEGORY[selected.category].label} />
              {selCard && <DetailRow label="Карта" value={`${selCard.label} •• ${selCard.last4}`} />}
              {selected.originalAmount && (
                <DetailRow
                  label="Списано"
                  value={formatMoney(selected.originalAmount.amountMinor, selected.originalAmount.currency)}
                />
              )}
              {selected.declineReason && <DetailRow label="Причина" value={selected.declineReason} />}
              <DetailRow label="ID операции" value={<span className="font-mono text-[12px]">{selected.id}</span>} />
            </dl>
          </div>
        )}
      </Sheet>
    </>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function TransactionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-line bg-surface">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <div className="skeleton size-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-32 rounded" />
            <div className="skeleton h-3 w-20 rounded" />
          </div>
          <div className="skeleton h-4 w-16 rounded" />
        </div>
      ))}
    </div>
  );
}
