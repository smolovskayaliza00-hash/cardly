import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownLeft,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Info,
  Snowflake,
  Sun,
  Trash2,
} from 'lucide-react';
import { useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  LIMIT_BOUNDS,
  TARIFFS,
  formatMoney,
  type Card,
  type CardLimits,
  type CardReveal,
} from '@cardapp/shared';
import { useCard, useCardAction, useRevealCard, useTransactions, useUpdateLimits } from '../api/hooks';
import { CardVisual } from '../components/CardVisual';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { TransactionList, TransactionListSkeleton } from '../components/TransactionList';
import { Badge, Button, EmptyState, Panel, SectionTitle, Skeleton } from '../components/ui';
import { formatDate } from '../lib/dates';
import { haptic } from '../lib/telegram';
import { toast } from '../store/ui';

type DemoReveal = Extract<CardReveal, { kind: 'demo' }>;

const STATUS: Record<Card['status'], { label: string; tone: 'success' | 'info' | 'warning' | 'danger' }> = {
  active: { label: 'Активна', tone: 'success' },
  frozen: { label: 'Заморожена', tone: 'info' },
  issuing: { label: 'Выпускается', tone: 'warning' },
  closed: { label: 'Закрыта', tone: 'danger' },
};

function ActionButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: typeof Eye;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => {
        haptic.impact('light');
        onClick();
      }}
      className="flex flex-col items-center gap-2 disabled:opacity-40"
    >
      <span
        className={clsx(
          'flex size-14 items-center justify-center rounded-[20px] border transition active:scale-95',
          active ? 'gold-fill border-transparent' : 'border-line bg-surface text-gold',
        )}
      >
        <Icon className="size-[22px]" />
      </span>
      <span className="text-[12px] font-medium text-muted">{label}</span>
    </button>
  );
}

function LimitsSheet({ card, open, onClose }: { card: Card; open: boolean; onClose: () => void }) {
  const [limits, setLimits] = useState<CardLimits>(card.limits);
  const update = useUpdateLimits();
  useEffect(() => {
    if (open) setLimits(card.limits);
  }, [open, card.limits]);

  const rows: { key: keyof CardLimits; label: string }[] = [
    { key: 'perTransaction', label: 'На одну операцию' },
    { key: 'daily', label: 'В сутки' },
    { key: 'monthly', label: 'В месяц' },
  ];

  return (
    <Sheet open={open} onClose={onClose} title="Лимиты">
      <div className="space-y-6 pb-2">
        {rows.map(({ key, label }) => {
          const b = LIMIT_BOUNDS[key];
          const fill = ((limits[key] - b.min) / (b.max - b.min)) * 100;
          return (
            <div key={key}>
              <div className="mb-3 flex items-baseline justify-between">
                <span className="text-[15px] text-muted">{label}</span>
                <span className="tabular text-[17px] font-semibold">{formatMoney(limits[key], card.currency)}</span>
              </div>
              <input
                type="range"
                className="range"
                min={b.min}
                max={b.max}
                step={b.step}
                value={limits[key]}
                style={{ '--fill': `${fill}%` } as CSSProperties}
                onChange={(e) => {
                  haptic.selection();
                  setLimits({ ...limits, [key]: Number(e.target.value) });
                }}
              />
            </div>
          );
        })}
        <Button
          size="lg"
          block
          loading={update.isPending}
          onClick={() =>
            update.mutate(
              { id: card.id, limits },
              {
                onSuccess: () => {
                  haptic.success();
                  toast('Лимиты сохранены', 'success');
                  onClose();
                },
              },
            )
          }
        >
          Сохранить
        </Button>
      </div>
    </Sheet>
  );
}

export function CardDetails() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: card, isLoading } = useCard(id);
  const { data: txs, isLoading: txLoading } = useTransactions({ cardId: id });
  const reveal = useRevealCard();
  const action = useCardAction();
  const [revealed, setRevealed] = useState<DemoReveal | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [limitsOpen, setLimitsOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // Реквизиты скрываются автоматически через 30 секунд
  useEffect(() => {
    if (!revealed) return;
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((Date.parse(revealed.expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) setRevealed(null);
    }, 250);
    return () => clearInterval(t);
  }, [revealed]);

  if (isLoading || !card) {
    return (
      <div className="px-5 pt-16">
        <Skeleton className="aspect-[1.586] w-full rounded-[22px]" />
      </div>
    );
  }

  const ready = card.status === 'active' || card.status === 'frozen';
  const frozen = card.status === 'frozen';

  const toggleReveal = () => {
    if (revealed) return setRevealed(null);
    reveal.mutate(card.id, {
      onSuccess: (r) => {
        if (r.kind === 'demo') {
          setRevealed(r);
          setSecondsLeft(30);
        } else {
          // В продакшене: открыть защищённый виджет партнёра (iframe) по r.url
          toast('Откроется защищённый виджет партнёра');
        }
      },
    });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text.replace(/\s/g, ''));
      haptic.success();
      toast('Скопировано', 'success');
    } catch {
      toast('Не удалось скопировать', 'error');
    }
  };

  return (
    <div>
      <PageHeader
        back
        title={card.label}
        right={<Badge tone={STATUS[card.status].tone}>{STATUS[card.status].label}</Badge>}
      />

      <div className="px-5 pt-2" style={{ perspective: 1200 }}>
        <motion.div animate={{ rotateY: revealed ? 360 : 0 }} transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}>
          <CardVisual card={card} reveal={revealed} />
        </motion.div>

        <AnimatePresence>
          {revealed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex items-center gap-2">
                <Button variant="surface" className="flex-1" icon={<Copy className="size-4" />} onClick={() => copy(revealed.pan)}>
                  Номер
                </Button>
                <Button variant="surface" className="flex-1" icon={<Copy className="size-4" />} onClick={() => copy(revealed.cvv)}>
                  CVV
                </Button>
              </div>
              <div className="mt-2 text-center text-[12px] text-faint">
                Демо-реквизиты · скроются через {secondsLeft} с
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="grid grid-cols-4 px-5 pt-6 pb-6">
        <ActionButton
          icon={ArrowDownLeft}
          label="Пополнить"
          disabled={card.status !== 'active'}
          onClick={() => navigate(`/topup?cardId=${card.id}`)}
        />
        <ActionButton
          icon={revealed ? EyeOff : Eye}
          label={revealed ? 'Скрыть' : 'Реквизиты'}
          active={!!revealed}
          disabled={!ready || reveal.isPending}
          onClick={toggleReveal}
        />
        <ActionButton
          icon={frozen ? Sun : Snowflake}
          label={frozen ? 'Разморозить' : 'Заморозить'}
          active={frozen}
          disabled={!ready || action.isPending}
          onClick={() =>
            action.mutate(
              { id: card.id, action: frozen ? 'unfreeze' : 'freeze' },
              {
                onSuccess: () => {
                  haptic.success();
                  toast(frozen ? 'Карта разморожена' : 'Карта заморожена', 'success');
                },
              },
            )
          }
        />
        <ActionButton icon={Gauge} label="Лимиты" disabled={!ready} onClick={() => setLimitsOpen(true)} />
      </div>

      <div className="px-4">
        <Panel className="mb-6 divide-y divide-line">
          <InfoRow label="Баланс" value={formatMoney(card.balanceMinor, card.currency)} />
          <InfoRow label="Платёжная система" value={card.brand === 'visa' ? 'Visa' : 'Mastercard'} />
          <InfoRow label="Тариф" value={TARIFFS[card.tariffId].title} />
          <InfoRow label="Действует до" value={`${String(card.expMonth).padStart(2, '0')}/${card.expYear}`} />
          <InfoRow label="Выпущена" value={formatDate(card.createdAt)} />
          <button onClick={() => setInfoOpen(true)} className="flex w-full items-center gap-2 px-4 py-3.5 text-[15px] text-gold">
            <Info className="size-4" /> Где работает карта
          </button>
        </Panel>

        <SectionTitle>Операции по карте</SectionTitle>
        {txLoading ? (
          <TransactionListSkeleton />
        ) : txs?.length ? (
          <TransactionList transactions={txs} cards={[card]} />
        ) : (
          <div className="rounded-3xl border border-line bg-surface">
            <EmptyState icon={<ArrowDownLeft className="size-6" />} title="Операций пока нет" text="Пополните карту, чтобы начать" />
          </div>
        )}

        {card.status !== 'issuing' && (
          <Button variant="danger" block className="mt-6" icon={<Trash2 className="size-4" />} onClick={() => setCloseOpen(true)}>
            Закрыть карту
          </Button>
        )}
      </div>

      <LimitsSheet card={card} open={limitsOpen} onClose={() => setLimitsOpen(false)} />

      <Sheet open={closeOpen} onClose={() => setCloseOpen(false)} title="Закрыть карту?">
        <p className="mb-6 text-[15px] leading-relaxed text-muted">
          Карта •• {card.last4} перестанет работать, подписки по ней будут отклонены. В рабочей версии остаток{' '}
          {formatMoney(card.balanceMinor, card.currency)} будет возвращён по правилам партнёра.
        </p>
        <div className="space-y-2 pb-2">
          <Button
            variant="danger"
            size="lg"
            block
            loading={action.isPending}
            onClick={() =>
              action.mutate(
                { id: card.id, action: 'close' },
                {
                  onSuccess: () => {
                    haptic.warning();
                    toast('Карта закрыта');
                    navigate('/cards', { replace: true });
                  },
                },
              )
            }
          >
            Закрыть карту
          </Button>
          <Button variant="surface" size="lg" block onClick={() => setCloseOpen(false)}>
            Отмена
          </Button>
        </div>
      </Sheet>

      <Sheet open={infoOpen} onClose={() => setInfoOpen(false)} title="Где работает карта">
        <div className="space-y-3 pb-4 text-[15px] leading-relaxed text-muted">
          <p>Виртуальная карта предназначена для онлайн-оплат: подписки, сервисы, бронирования, покупки в интернет-магазинах.</p>
          <p>
            Конкретный список стран и категорий продавцов определяется партнёром-эмитентом. Для карт могут действовать
            ограничения по MCC-кодам и географии.
          </p>
          <p className="text-faint">Текст-заглушка прототипа. Финальная формулировка — после выбора партнёра.</p>
        </div>
      </Sheet>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className="tabular font-medium">{value}</span>
    </div>
  );
}
