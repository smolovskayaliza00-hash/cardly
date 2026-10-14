import clsx from 'clsx';
import { motion } from 'framer-motion';
import { ArrowDownLeft, ChevronRight, Crown, Eye, EyeOff, KeyRound, Plus, ShieldAlert, Sparkles } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEMO_RATES, formatMoney, type Card } from '@cardapp/shared';
import { useCards, useMe, useTransactions } from '../api/hooks';
import { CardVisual } from '../components/CardVisual';
import { TransactionList, TransactionListSkeleton } from '../components/TransactionList';
import { DemoBadge, EmptyState, SectionTitle, Skeleton } from '../components/ui';
import { haptic } from '../lib/telegram';
import { useUi } from '../store/ui';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

export function Avatar({ name, photo, size = 40 }: { name: string; photo?: string; size?: number }) {
  return photo ? (
    <img src={photo} alt="" className="rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <div
      className="gold-fill flex items-center justify-center rounded-full font-bold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function totalInUsd(cards: Card[]) {
  return cards.reduce(
    (sum, c) => sum + (c.currency === 'USD' ? c.balanceMinor : Math.round((c.balanceMinor * DEMO_RATES.EUR) / DEMO_RATES.USD)),
    0,
  );
}

function CardCarousel({ cards, onActive }: { cards: Card[]; onActive: (i: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const navigate = useNavigate();

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const w = el.firstElementChild?.clientWidth ?? 1;
    const i = Math.round(el.scrollLeft / (w + 12));
    if (i !== active) {
      setActive(i);
      onActive(i);
      haptic.selection();
    }
  };

  return (
    <>
      <div
        ref={ref}
        onScroll={onScroll}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-5 pt-1 pb-4"
      >
        {cards.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/cards/${c.id}`)}
            className="w-[86%] shrink-0 snap-center text-left"
          >
            <CardVisual card={c} />
          </motion.button>
        ))}
        <button
          onClick={() => navigate('/issue')}
          className="flex aspect-[1.586] w-[86%] shrink-0 snap-center flex-col items-center justify-center gap-3 rounded-[22px] border-2 border-dashed border-line text-muted active:bg-surface"
        >
          <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-gold">
            <Plus className="size-6" />
          </span>
          <span className="text-[15px] font-semibold">Новая карта</span>
        </button>
      </div>
      <div className="-mt-1 mb-5 flex justify-center gap-1.5">
        {[...cards, null].map((_, k) => (
          <span
            key={k}
            className={clsx('h-1.5 rounded-full transition-all', k === active ? 'w-5 bg-gold' : 'w-1.5 bg-surface-3')}
          />
        ))}
      </div>
    </>
  );
}

function QuickAction({ icon: Icon, label, onClick }: { icon: typeof Plus; label: string; onClick: () => void }) {
  return (
    <button
      onClick={() => {
        haptic.impact('light');
        onClick();
      }}
      className="flex flex-col items-center gap-2"
    >
      <span className="flex size-14 items-center justify-center rounded-[20px] border border-line bg-surface text-gold transition active:scale-95 active:bg-surface-2">
        <Icon className="size-[22px]" strokeWidth={2} />
      </span>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </button>
  );
}

export function Home() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: cards, isLoading } = useCards();
  const { data: txs, isLoading: txLoading } = useTransactions({ limit: 5 });
  const { hideBalance, toggleHideBalance } = useUi();
  const [activeIdx, setActiveIdx] = useState(0);

  const activeCards = useMemo(() => cards ?? [], [cards]);
  const current = activeCards[activeIdx];
  const total = totalInUsd(activeCards);

  return (
    <div>
      {/* Шапка */}
      <header className="flex items-center gap-3 px-5 pt-4 pb-2">
        {me ? <Avatar name={me.firstName} photo={me.photoUrl} /> : <Skeleton className="size-10 rounded-full" />}
        <div className="min-w-0 flex-1">
          <div className="text-[13px] text-muted">{greeting()}</div>
          <div className="truncate text-[17px] font-semibold">{me?.firstName ?? '…'}</div>
        </div>
        <DemoBadge />
        <button
          onClick={() => {
            haptic.selection();
            toggleHideBalance();
          }}
          className="flex size-10 items-center justify-center rounded-full bg-surface text-muted active:bg-surface-2"
          aria-label="Скрыть баланс"
        >
          {hideBalance ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      </header>

      {/* Общий баланс */}
      <section className="px-5 pt-3 pb-5">
        <div className="text-[13px] font-medium text-muted">Всего на картах</div>
        {isLoading ? (
          <Skeleton className="mt-2 h-11 w-48" />
        ) : (
          <div className="font-display tabular mt-1 text-[42px] leading-tight font-bold tracking-tight">
            {hideBalance ? '••••••' : <span className="gold-text">≈ {formatMoney(total, 'USD')}</span>}
          </div>
        )}
        {!!activeCards.length && (
          <div className="mt-1 text-[13px] text-faint">
            {activeCards.length} {activeCards.length === 1 ? 'карта' : activeCards.length < 5 ? 'карты' : 'карт'} ·
            по демо-курсу
          </div>
        )}
      </section>

      {/* Карты */}
      {isLoading ? (
        <div className="px-5 pb-6">
          <Skeleton className="aspect-[1.586] w-[86%] rounded-[22px]" />
        </div>
      ) : activeCards.length ? (
        <CardCarousel cards={activeCards} onActive={setActiveIdx} />
      ) : (
        <div className="px-5 pb-6">
          <button
            onClick={() => navigate('/issue')}
            className="relative flex aspect-[1.586] w-full flex-col items-center justify-center gap-3 overflow-hidden rounded-[22px] border border-gold/30 bg-surface"
          >
            <div className="absolute inset-0 bg-[radial-gradient(80%_60%_at_50%_0%,var(--app-glow),transparent)]" />
            <span className="gold-fill relative flex size-14 items-center justify-center rounded-2xl">
              <Plus className="size-7" />
            </span>
            <span className="relative text-[17px] font-semibold">Выпустить первую карту</span>
            <span className="relative text-[13px] text-muted">Visa или Mastercard · USD / EUR</span>
          </button>
        </div>
      )}

      {/* Быстрые действия */}
      <section className="grid grid-cols-4 px-5 pb-6">
        <QuickAction
          icon={ArrowDownLeft}
          label="Пополнить"
          onClick={() => navigate(current ? `/topup?cardId=${current.id}` : '/topup')}
        />
        <QuickAction icon={Plus} label="Выпустить" onClick={() => navigate('/issue')} />
        <QuickAction
          icon={KeyRound}
          label="Реквизиты"
          onClick={() => (current ? navigate(`/cards/${current.id}`) : navigate('/issue'))}
        />
        <QuickAction icon={Crown} label="Тарифы" onClick={() => navigate('/tariffs')} />
      </section>

      {/* Баннеры */}
      <div className="space-y-3 px-5 pb-6">
        {me && me.kycStatus !== 'approved' && (
          <Link
            to="/kyc"
            className="flex items-center gap-3 rounded-3xl border border-warning/25 bg-warning/8 p-4 active:opacity-80"
          >
            <ShieldAlert className="size-6 shrink-0 text-warning" />
            <div className="flex-1">
              <div className="text-[15px] font-semibold">
                {me.kycStatus === 'pending' ? 'Проверяем документы' : 'Пройдите верификацию'}
              </div>
              <div className="text-[13px] text-muted">Нужна для выпуска карт</div>
            </div>
            <ChevronRight className="size-4 text-faint" />
          </Link>
        )}
        {me && !me.subscription.active && (
          <Link
            to="/tariffs"
            className="relative flex items-center gap-3 overflow-hidden rounded-3xl border border-gold/25 bg-surface p-4 active:opacity-80"
          >
            <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,var(--app-glow),transparent)]" />
            <Sparkles className="relative size-6 shrink-0 text-gold" />
            <div className="relative flex-1">
              <div className="text-[15px] font-semibold">Премиум: комиссия 2%</div>
              <div className="text-[13px] text-muted">Выпуск карт включён в подписку</div>
            </div>
            <ChevronRight className="relative size-4 text-faint" />
          </Link>
        )}
      </div>

      {/* Последние операции */}
      <section className="px-4">
        <SectionTitle
          action={
            <Link to="/history" className="text-[14px] font-medium text-gold">
              Все
            </Link>
          }
        >
          Последние операции
        </SectionTitle>
        {txLoading ? (
          <TransactionListSkeleton />
        ) : txs?.length ? (
          <TransactionList transactions={txs} cards={activeCards} grouped={false} />
        ) : (
          <div className="rounded-3xl border border-line bg-surface">
            <EmptyState icon={<ArrowDownLeft className="size-6" />} title="Операций пока нет" text="Здесь появятся покупки и пополнения" />
          </div>
        )}
      </section>
    </div>
  );
}
