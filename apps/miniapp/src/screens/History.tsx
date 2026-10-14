import clsx from 'clsx';
import { ArrowDownLeft, ArrowUpRight, Search, SearchX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { formatMoney, type CardCurrency, type TransactionType } from '@cardapp/shared';
import { useCards, useTransactions } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { TransactionList, TransactionListSkeleton } from '../components/TransactionList';
import { EmptyState, Segmented } from '../components/ui';
import { haptic } from '../lib/telegram';
import { useUi } from '../store/ui';

type Filter = 'all' | Extract<TransactionType, 'purchase' | 'topup'>;

export function History() {
  const [type, setType] = useState<Filter>('all');
  const [cardId, setCardId] = useState<string | undefined>();
  const [q, setQ] = useState('');
  const hidden = useUi((s) => s.hideBalance);
  const { data: cards } = useCards();
  const { data: txs, isLoading } = useTransactions({ type, cardId });

  const filtered = useMemo(
    () => (txs ?? []).filter((t) => !q || t.merchant.toLowerCase().includes(q.toLowerCase())),
    [txs, q],
  );

  // сводка за 30 дней по валютам
  const summary = useMemo(() => {
    const since = Date.now() - 30 * 86_400_000;
    const out: Record<CardCurrency, { in: number; out: number }> = { USD: { in: 0, out: 0 }, EUR: { in: 0, out: 0 } };
    for (const t of txs ?? []) {
      if (t.status !== 'completed' || Date.parse(t.createdAt) < since) continue;
      if (t.amountMinor > 0) out[t.currency].in += t.amountMinor;
      else out[t.currency].out += -t.amountMinor;
    }
    return out;
  }, [txs]);

  const fmt = (k: 'in' | 'out') => {
    if (hidden) return '••••';
    const parts = (['USD', 'EUR'] as const).filter((c) => summary[c][k] > 0);
    if (!parts.length) return '—';
    return parts.map((c) => <div key={c}>{formatMoney(summary[c][k], c)}</div>);
  };

  return (
    <div>
      <PageHeader title="История" />

      <div className="grid grid-cols-2 gap-3 px-5 pb-4">
        <div className="rounded-3xl border border-line bg-surface p-4">
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <ArrowUpRight className="size-4 text-gold" /> Расходы, 30 дн.
          </div>
          <div className="tabular mt-1 text-[15px] font-semibold">{fmt('out')}</div>
        </div>
        <div className="rounded-3xl border border-line bg-surface p-4">
          <div className="flex items-center gap-1.5 text-[13px] text-muted">
            <ArrowDownLeft className="size-4 text-success" /> Пополнения
          </div>
          <div className="tabular mt-1 text-[15px] font-semibold">{fmt('in')}</div>
        </div>
      </div>

      <div className="space-y-3 px-5 pb-4">
        <div className="relative">
          <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по операциям"
            className="h-11 w-full rounded-2xl bg-surface-2 pr-4 pl-10 text-[15px] outline-none placeholder:text-faint"
          />
        </div>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'Все' },
            { value: 'purchase', label: 'Покупки' },
            { value: 'topup', label: 'Пополнения' },
          ]}
        />
        <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5">
          {[{ id: undefined, label: 'Все карты' }, ...(cards ?? []).map((c) => ({ id: c.id, label: `${c.label} •• ${c.last4}` }))].map(
            (c) => (
              <button
                key={c.id ?? 'all'}
                onClick={() => {
                  haptic.selection();
                  setCardId(c.id);
                }}
                className={clsx(
                  'shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium whitespace-nowrap',
                  cardId === c.id ? 'bg-gold/15 text-gold' : 'bg-surface-2 text-muted',
                )}
              >
                {c.label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="px-4">
        {isLoading ? (
          <TransactionListSkeleton rows={6} />
        ) : filtered.length ? (
          <TransactionList transactions={filtered} cards={cards} />
        ) : (
          <EmptyState icon={<SearchX className="size-6" />} title="Ничего не найдено" text="Попробуйте изменить фильтры" />
        )}
      </div>
    </div>
  );
}
