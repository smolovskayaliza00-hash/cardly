import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, CheckCircle2, Crown, ShieldAlert } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TARIFFS,
  checkCanIssue,
  formatMoney,
  toCardholderName,
  type Card,
  type CardBrand,
  type CardCurrency,
  type CardDesign,
  type TariffId,
} from '@cardapp/shared';
import { useCard, useCards, useIssueCard, useMe } from '../api/hooks';
import { BrandMark, CARD_DESIGNS, CardVisual } from '../components/CardVisual';
import { MainButton, MainButtonSpacer } from '../components/MainButton';
import { PageHeader } from '../components/PageHeader';
import { Badge, Button, DemoBadge, Panel, Segmented } from '../components/ui';
import { haptic } from '../lib/telegram';

const LABELS = ['Подписки', 'Путешествия', 'Покупки', 'Реклама', 'Сервисы'];
const STEPS = ['Карта', 'Тариф', 'Оплата'];

function Option({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={() => {
        haptic.selection();
        onClick();
      }}
      className={clsx(
        'relative rounded-2xl border-2 bg-surface p-4 text-left transition',
        selected ? 'border-gold' : 'border-line',
        className,
      )}
    >
      {selected && (
        <span className="gold-fill absolute top-3 right-3 flex size-5 items-center justify-center rounded-full">
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}
      {children}
    </button>
  );
}

function IssuedView({ cardId }: { cardId: string }) {
  const navigate = useNavigate();
  const { data: card } = useCard(cardId);
  const ready = card?.status === 'active';

  return (
    <div className="flex min-h-[80dvh] flex-col items-center px-6 pt-10 text-center">
      <motion.div
        className="w-full max-w-[360px]"
        initial={{ scale: 0.6, rotateX: 50, opacity: 0, y: 60 }}
        animate={{ scale: 1, rotateX: 0, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 110, damping: 14 }}
        style={{ perspective: 1000 }}
      >
        {card && <CardVisual card={card} />}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={ready ? 'ready' : 'wait'}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mt-10"
        >
          {ready ? (
            <>
              <CheckCircle2 className="mx-auto mb-3 size-12 text-success" />
              <h1 className="font-display text-[28px] font-bold tracking-tight">Карта готова</h1>
              <p className="mt-2 text-[15px] text-muted">Пополните её, чтобы начать оплачивать покупки</p>
            </>
          ) : (
            <>
              <h1 className="font-display text-[28px] font-bold tracking-tight">Выпускаем карту…</h1>
              <p className="mt-2 text-[15px] text-muted">Обычно это занимает меньше минуты</p>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {ready && (
        <div className="mt-8 w-full space-y-2">
          <Button size="lg" block onClick={() => navigate(`/topup?cardId=${cardId}`, { replace: true })}>
            Пополнить
          </Button>
          <Button size="lg" variant="surface" block onClick={() => navigate(`/cards/${cardId}`, { replace: true })}>
            Открыть карту
          </Button>
        </div>
      )}
    </div>
  );
}

export function IssueCard() {
  const navigate = useNavigate();
  const { data: me } = useMe();
  const { data: cards = [] } = useCards();
  const issue = useIssueCard();

  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<CardBrand>('visa');
  const [currency, setCurrency] = useState<CardCurrency>('USD');
  const [design, setDesign] = useState<CardDesign>('gold');
  const [label, setLabel] = useState('Подписки');
  const [tariffId, setTariffId] = useState<TariffId | null>(null);
  const [issuedId, setIssuedId] = useState<string | null>(null);

  const effectiveTariff: TariffId = tariffId ?? (me?.subscription.active ? 'subscription' : 'one_time');
  const check = me ? checkCanIssue(me, cards, effectiveTariff) : null;

  const preview: Card = useMemo(
    () => ({
      id: 'preview',
      brand,
      currency,
      design,
      label: label || 'Новая карта',
      status: 'active',
      last4: '••••',
      holderName: me ? toCardholderName(me.firstName, me.lastName) : 'CARD HOLDER',
      expMonth: 1,
      expYear: 2030,
      balanceMinor: 0,
      tariffId: effectiveTariff,
      limits: { perTransaction: 0, daily: 0, monthly: 0 },
      createdAt: '',
    }),
    [brand, currency, design, label, me, effectiveTariff],
  );

  if (issuedId) return <IssuedView cardId={issuedId} />;

  const submit = () => {
    issue.mutate(
      { brand, currency, design, label, tariffId: effectiveTariff },
      {
        onSuccess: (c) => {
          haptic.success();
          setIssuedId(c.id);
        },
      },
    );
  };

  let mainText = 'Далее';
  let mainDisabled = false;
  let onMain = () => setStep(step + 1);
  if (step === 2) {
    if (!check?.ok) {
      mainText = check?.code === 'KYC_REQUIRED' ? 'Пройти верификацию' : 'Сменить тариф';
      onMain = () => (check?.code === 'KYC_REQUIRED' ? navigate('/kyc') : setStep(1));
    } else {
      mainText = check.chargeRubMinor ? `Оплатить ${formatMoney(check.chargeRubMinor, 'RUB')} · демо` : 'Выпустить карту';
      onMain = submit;
    }
  }
  if (step === 0 && !label.trim()) mainDisabled = true;

  return (
    <div>
      <PageHeader back title="Новая карта" />

      {/* прогресс шагов */}
      <div className="flex gap-2 px-5 pb-4">
        {STEPS.map((s, i) => (
          <button
            key={s}
            disabled={i > step}
            onClick={() => setStep(i)}
            className="flex-1 text-left disabled:cursor-default"
          >
            <div className={clsx('h-1 rounded-full transition-colors', i <= step ? 'bg-gold' : 'bg-surface-3')} />
            <div className={clsx('mt-1.5 text-[12px] font-semibold', i === step ? 'text-ink' : 'text-faint')}>{s}</div>
          </button>
        ))}
      </div>

      <div className="px-5">
        <motion.div layout className="mx-auto max-w-[360px] pb-6">
          <CardVisual card={preview} showBalance={false} />
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Платёжная система</div>
                  <div className="grid grid-cols-2 gap-3">
                    {(['visa', 'mastercard'] as const).map((b) => (
                      <Option key={b} selected={brand === b} onClick={() => setBrand(b)} className="flex h-20 items-center">
                        <BrandMark brand={b} color="var(--app-text)" />
                      </Option>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Валюта</div>
                  <Segmented
                    value={currency}
                    onChange={setCurrency}
                    options={[
                      { value: 'USD', label: 'USD · Доллар' },
                      { value: 'EUR', label: 'EUR · Евро' },
                    ]}
                  />
                </div>

                <div>
                  <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Дизайн</div>
                  <div className="flex gap-3">
                    {CARD_DESIGNS.map((d) => (
                      <button
                        key={d.id}
                        onClick={() => {
                          haptic.selection();
                          setDesign(d.id);
                        }}
                        className="flex flex-1 flex-col items-center gap-1.5"
                      >
                        <span
                          className={clsx(
                            'aspect-[1.586] w-full rounded-lg border-2 transition',
                            design === d.id ? 'border-gold' : 'border-transparent',
                          )}
                          style={{ background: d.bg }}
                        />
                        <span className={clsx('text-[11px] font-medium', design === d.id ? 'text-ink' : 'text-muted')}>
                          {d.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[13px] font-semibold tracking-wider text-muted uppercase">Название</div>
                  <input
                    value={label}
                    maxLength={20}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Например, Подписки"
                    className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none focus:border-gold"
                  />
                  <div className="no-scrollbar mt-2 flex gap-2 overflow-x-auto">
                    {LABELS.map((l) => (
                      <button
                        key={l}
                        onClick={() => setLabel(l)}
                        className={clsx(
                          'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium',
                          label === l ? 'bg-gold/15 text-gold' : 'bg-surface-2 text-muted',
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-3">
                {(['one_time', 'subscription'] as const).map((id) => {
                  const t = TARIFFS[id];
                  const included = id === 'subscription' && me?.subscription.active;
                  return (
                    <Option key={id} selected={effectiveTariff === id} onClick={() => setTariffId(id)} className="w-full">
                      <div className="flex items-center gap-2">
                        {id === 'subscription' && <Crown className="size-4 text-gold" />}
                        <span className="text-[17px] font-semibold">{t.title}</span>
                        {included && <Badge tone="success">Активна</Badge>}
                        {!included && t.highlighted && <Badge tone="gold">Выгодно</Badge>}
                      </div>
                      <div className="mt-1 text-[22px] font-bold tracking-tight">
                        {included ? 'Включено' : formatMoney(t.priceMinor, 'RUB')}
                        {!included && (
                          <span className="text-[14px] font-medium text-muted">
                            {t.period === 'month' ? ' / месяц' : ' за карту'}
                          </span>
                        )}
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {t.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-[14px] text-muted">
                            <Check className="mt-0.5 size-4 shrink-0 text-gold" /> {f}
                          </li>
                        ))}
                      </ul>
                    </Option>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <Panel className="divide-y divide-line">
                  <SummaryRow label="Карта" value={`${brand === 'visa' ? 'Visa' : 'Mastercard'} · ${currency}`} />
                  <SummaryRow label="Название" value={label} />
                  <SummaryRow label="Тариф" value={TARIFFS[effectiveTariff].title} />
                  <SummaryRow
                    label="К оплате"
                    value={
                      check?.ok
                        ? check.chargeRubMinor
                          ? `${formatMoney(check.chargeRubMinor, 'RUB')}${check.chargeReason === 'subscription' ? ' / мес' : ''}`
                          : 'Бесплатно'
                        : '—'
                    }
                    strong
                  />
                </Panel>

                {check && !check.ok && (
                  <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/8 p-4">
                    <ShieldAlert className="size-5 shrink-0 text-warning" />
                    <div className="text-[14px]">{check.message}</div>
                  </div>
                )}

                <div className="flex items-start gap-3 rounded-2xl bg-surface-2 p-4 text-[13px] leading-snug text-muted">
                  <DemoBadge className="shrink-0" />
                  <span>
                    Оплата выпуска пройдёт через СБП у платёжного партнёра. В прототипе деньги не списываются и платёжные
                    данные не запрашиваются.
                  </span>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <MainButtonSpacer />
      <MainButton text={mainText} onClick={onMain} disabled={mainDisabled} loading={issue.isPending} />
    </div>
  );
}

function SummaryRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5 text-[15px]">
      <span className="text-muted">{label}</span>
      <span className={clsx('tabular', strong ? 'text-[17px] font-bold' : 'font-medium')}>{value}</span>
    </div>
  );
}
