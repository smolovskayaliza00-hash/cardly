import clsx from 'clsx';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Globe2, ShieldCheck, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Card } from '@cardapp/shared';
import { BRAND } from '../app/brand';
import { CardVisual } from '../components/CardVisual';
import { MainButton } from '../components/MainButton';
import { Toaster } from '../components/Toast';
import { haptic } from '../lib/telegram';
import { useApplyTheme } from '../lib/theme';
import { useUi } from '../store/ui';

const sample = (over: Partial<Card>): Card => ({
  id: 'x',
  brand: 'visa',
  currency: 'USD',
  status: 'active',
  design: 'gold',
  label: 'Aurum',
  last4: '4821',
  holderName: 'YOUR NAME',
  expMonth: 9,
  expYear: 2029,
  balanceMinor: 0,
  tariffId: 'subscription',
  limits: { perTransaction: 0, daily: 0, monthly: 0 },
  createdAt: '',
  ...over,
});

function HeroCards() {
  const cards = [
    { c: sample({ design: 'obsidian', brand: 'mastercard', last4: '7390' }), r: -14, x: -38, y: 18 },
    { c: sample({ design: 'graphite', last4: '1057' }), r: 9, x: 34, y: 6 },
    { c: sample({ design: 'gold' }), r: -3, x: 0, y: -10 },
  ];
  return (
    <div className="relative mx-auto h-[250px] w-full max-w-[340px]">
      {cards.map(({ c, r, x, y }, i) => (
        <motion.div
          key={i}
          className="absolute inset-x-6 top-10"
          initial={{ opacity: 0, y: 60, rotate: 0 }}
          animate={{ opacity: 1, y, x, rotate: r }}
          transition={{ delay: 0.1 + i * 0.12, type: 'spring', stiffness: 120, damping: 16 }}
        >
          <CardVisual card={c} showBalance={false} />
        </motion.div>
      ))}
    </div>
  );
}

function IconHero({ icon: Icon }: { icon: typeof Zap }) {
  return (
    <div className="flex h-[250px] items-center justify-center">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 160, damping: 14 }}
        className="relative flex size-36 items-center justify-center rounded-[40px] border border-line bg-surface"
      >
        <div className="absolute inset-0 rounded-[40px] bg-[radial-gradient(circle_at_50%_30%,var(--app-glow),transparent_70%)]" />
        <Icon className="relative size-16 text-gold" strokeWidth={1.5} />
      </motion.div>
    </div>
  );
}

const SLIDES = [
  {
    hero: <HeroCards />,
    title: 'Виртуальные карты\nVisa и Mastercard',
    text: 'Выпуск за пару минут прямо в Telegram. Для подписок, путешествий и покупок в зарубежных сервисах.',
  },
  {
    hero: <IconHero icon={Zap} />,
    title: 'Пополнение\nчерез СБП',
    text: 'Пополняйте карту в рублях по QR-коду или из приложения банка. Курс и комиссия видны заранее.',
  },
  {
    hero: <IconHero icon={ShieldCheck} />,
    title: 'Полный контроль\nи безопасность',
    text: 'Заморозка в одно касание, лимиты, история операций. Реквизиты показываются только вам.',
  },
];

export function Onboarding() {
  useApplyTheme();
  const navigate = useNavigate();
  const setOnboarded = useUi((s) => s.setOnboarded);
  const [i, setI] = useState(0);
  const [accepted, setAccepted] = useState(false);
  const last = i === SLIDES.length - 1;

  const next = () => {
    if (!last) {
      haptic.impact('light');
      setI(i + 1);
      return;
    }
    haptic.success();
    setOnboarded(true);
    navigate('/', { replace: true });
  };

  const slide = SLIDES[i]!;

  return (
    <div className="app-glow mx-auto flex min-h-dvh max-w-[520px] flex-col px-6 pt-6">
      <Toaster />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="gold-fill flex size-8 items-center justify-center rounded-xl text-[15px] font-black">A</div>
          <span className="font-display text-[17px] font-bold tracking-tight">{BRAND.name}</span>
        </div>
        {!last && (
          <button className="text-[15px] font-medium text-muted" onClick={() => setI(SLIDES.length - 1)}>
            Пропустить
          </button>
        )}
      </div>

      <motion.div
        className="flex flex-1 flex-col"
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -60 && !last) setI(i + 1);
          if (info.offset.x > 60 && i > 0) setI(i - 1);
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.25 }}
            className="mt-6 flex flex-col"
          >
            {slide.hero}
            <h1 className="font-display mt-8 text-[32px] leading-[1.1] font-bold tracking-tight whitespace-pre-line">
              {slide.title}
            </h1>
            <p className="mt-3 text-[16px] leading-relaxed text-muted">{slide.text}</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <div className="mt-6 mb-4 flex justify-center gap-1.5">
        {SLIDES.map((_, k) => (
          <span
            key={k}
            className={clsx('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-gold' : 'w-1.5 bg-surface-3')}
          />
        ))}
      </div>

      {last && (
        <button
          onClick={() => {
            haptic.selection();
            setAccepted(!accepted);
          }}
          className="mb-4 flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-left"
        >
          <span
            className={clsx(
              'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border',
              accepted ? 'gold-fill border-transparent' : 'border-faint',
            )}
          >
            {accepted && <Check className="size-3.5" strokeWidth={3} />}
          </span>
          <span className="text-[13px] leading-snug text-muted">
            Я понимаю, что это <b className="text-ink">демонстрационный прототип</b>: реальные карты не выпускаются,
            платежи не проводятся, данные вымышленные.
          </span>
        </button>
      )}

      <div className="flex items-center gap-2 pb-2 text-[12px] text-faint">
        <Globe2 className="size-3.5" /> Доступность услуги зависит от страны и требований партнёра-эмитента
      </div>
      <div className="h-24" />
      <MainButton text={last ? 'Начать' : 'Далее'} onClick={next} disabled={last && !accepted} />
    </div>
  );
}
