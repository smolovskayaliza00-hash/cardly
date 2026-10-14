import { motion } from 'framer-motion';
import { CreditCard, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { TARIFFS } from '@cardapp/shared';
import { useCards, useMe } from '../api/hooks';
import { CardVisual } from '../components/CardVisual';
import { PageHeader } from '../components/PageHeader';
import { Button, EmptyState, Skeleton } from '../components/ui';

export function Cards() {
  const navigate = useNavigate();
  const { data: cards, isLoading } = useCards();
  const { data: me } = useMe();
  const tariff = me?.subscription.active ? TARIFFS.subscription : TARIFFS.one_time;
  const count = cards?.length ?? 0;

  return (
    <div>
      <PageHeader
        title="Мои карты"
        right={
          <button
            onClick={() => navigate('/issue')}
            className="gold-fill flex size-10 items-center justify-center rounded-full"
            aria-label="Выпустить карту"
          >
            <Plus className="size-5" />
          </button>
        }
      />

      <div className="px-5 pb-4 text-[14px] text-muted">
        {count} из {tariff.maxCards} по тарифу «{tariff.title}»
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="gold-fill h-full rounded-full" style={{ width: `${Math.min(100, (count / tariff.maxCards) * 100)}%` }} />
        </div>
      </div>

      <div className="space-y-4 px-5">
        {isLoading &&
          Array.from({ length: 2 }, (_, i) => <Skeleton key={i} className="aspect-[1.586] w-full rounded-[22px]" />)}

        {cards?.map((c, i) => (
          <motion.button
            key={c.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/cards/${c.id}`)}
            className="block w-full text-left"
          >
            <CardVisual card={c} />
          </motion.button>
        ))}

        {cards && !cards.length && (
          <EmptyState
            icon={<CreditCard className="size-6" />}
            title="У вас пока нет карт"
            text="Выпустите виртуальную Visa или Mastercard за пару минут"
            action={<Button onClick={() => navigate('/issue')}>Выпустить карту</Button>}
          />
        )}
      </div>
    </div>
  );
}
