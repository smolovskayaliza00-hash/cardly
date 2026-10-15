import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown, Crown } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, TOPUP_METHODS } from '@cardapp/shared';
import { useMe, useSetSubscription, useTariffs } from '../api/hooks';
import { PageHeader } from '../components/PageHeader';
import { Sheet } from '../components/Sheet';
import { Badge, Button, DemoBadge, SectionTitle, Skeleton } from '../components/ui';
import { formatDate } from '../lib/dates';
import { haptic } from '../lib/telegram';
import { toast } from '../store/ui';

const FAQ = [
  {
    q: 'Чем отличаются тарифы?',
    a: '«Разовый» — платите за выпуск каждой карты один раз, без абонентской платы. «Премиум» — ежемесячная подписка: выпуск карт включён, комиссия за пополнение ниже.',
  },
  {
    q: 'Как пополнить карту?',
    a: `Через ${TOPUP_METHODS.filter((m) => m.available).map((m) => m.title).join(', ')}. Сумма в рублях конвертируется в валюту карты по курсу партнёра.`,
  },
  {
    q: 'Можно ли отменить подписку?',
    a: 'Да, в любой момент. Карты продолжат работать до конца оплаченного периода, далее — по условиям тарифа «Разовый».',
  },
  {
    q: 'Безопасно ли это?',
    a: 'Реквизиты карт хранит и показывает лицензированный партнёр-эмитент. Наше приложение не хранит номера карт и CVV.',
  },
];

export function Tariffs() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: tariffs } = useTariffs();
  const setSub = useSetSubscription();
  const [open, setOpen] = useState<number | null>(0);
  const [confirm, setConfirm] = useState<'on' | 'off' | null>(null);
  const subActive = me?.subscription.active ?? false;

  return (
    <div>
      <PageHeader back title="Тарифы" right={<DemoBadge />} />

      <div className="space-y-3 px-5">
        {!tariffs && <Skeleton className="h-64 w-full rounded-3xl" />}
        {tariffs?.map((t) => {
          const current = t.id === 'subscription' ? subActive : !subActive;
          return (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx(
                'relative overflow-hidden rounded-3xl border p-5',
                t.highlighted ? 'border-gold/40 bg-surface' : 'border-line bg-surface',
              )}
            >
              {t.highlighted && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_60%_at_100%_0%,var(--app-glow),transparent)]" />
              )}
              <div className="relative">
                <div className="flex items-center gap-2">
                  {t.highlighted && <Crown className="size-5 text-gold" />}
                  <span className="text-[20px] font-bold">{t.title}</span>
                  {current && <Badge tone="success">Текущий</Badge>}
                </div>
                <div className="text-[14px] text-muted">{t.subtitle}</div>
                <div className="font-display mt-3 text-[32px] font-bold tracking-tight">
                  {formatMoney(t.priceMinor, 'RUB')}
                  <span className="text-[15px] font-medium text-muted">{t.period === 'month' ? ' / месяц' : ' за карту'}</span>
                </div>
                <ul className="mt-4 space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[15px]">
                      <Check className="mt-0.5 size-4 shrink-0 text-gold" /> {f}
                    </li>
                  ))}
                </ul>
                {t.id === 'one_time' && (
                  <div className="mt-5">
                    {subActive ? (
                      <Button variant="surface" block onClick={() => setConfirm('off')}>
                        Перейти на «Разовый»
                      </Button>
                    ) : (
                      <Button block onClick={() => navigate('/issue?tariff=one_time')}>
                        Выпустить карту · {formatMoney(t.priceMinor, 'RUB')}
                      </Button>
                    )}
                  </div>
                )}
                {t.id === 'subscription' && (
                  <div className="mt-5">
                    {subActive ? (
                      <>
                        {me?.subscription.renewsAt && (
                          <div className="mb-3 text-[13px] text-muted">
                            Продление {formatDate(me.subscription.renewsAt)}
                          </div>
                        )}
                        <Button variant="surface" block onClick={() => setConfirm('off')}>
                          Отменить подписку
                        </Button>
                      </>
                    ) : (
                      <Button block onClick={() => setConfirm('on')}>
                        Подключить Премиум
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-5 pt-8">
        <SectionTitle>Вопросы</SectionTitle>
        <div className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
          {FAQ.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => {
                  haptic.selection();
                  setOpen(open === i ? null : i);
                }}
                className="flex w-full items-center gap-3 px-4 py-4 text-left text-[15px] font-medium"
              >
                <span className="flex-1">{f.q}</span>
                <ChevronDown className={clsx('size-4 text-faint transition', open === i && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="px-4 pb-4 text-[14px] leading-relaxed text-muted">{f.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>

      <Sheet
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm === 'on' ? 'Подключить Премиум?' : 'Отменить подписку?'}
      >
        <p className="mb-6 text-[15px] leading-relaxed text-muted">
          {confirm === 'on'
            ? 'В рабочей версии будет создан платёж через СБП и включено автопродление по правилам партнёра. Сейчас это демо — деньги не списываются.'
            : 'Подписка будет отключена, вы перейдёте на «Разовый»: без ежемесячной платы, выпуск — 1 990 ₽ за карту. В демо-режиме это произойдёт сразу.'}
        </p>
        <div className="space-y-2 pb-2">
          <Button
            size="lg"
            block
            variant={confirm === 'on' ? 'gold' : 'danger'}
            loading={setSub.isPending}
            onClick={() =>
              setSub.mutate(confirm === 'on', {
                onSuccess: () => {
                  haptic.success();
                  toast(confirm === 'on' ? 'Премиум подключён' : 'Подписка отменена', 'success');
                  setConfirm(null);
                },
              })
            }
          >
            {confirm === 'on' ? 'Подключить · 690 ₽/мес · демо' : 'Отменить подписку'}
          </Button>
          <Button size="lg" variant="surface" block onClick={() => setConfirm(null)}>
            Назад
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
