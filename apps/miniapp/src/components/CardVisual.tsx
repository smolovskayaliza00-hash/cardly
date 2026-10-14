import clsx from 'clsx';
import { Loader2, Snowflake } from 'lucide-react';
import type { Card, CardBrand, CardDesign, CardReveal } from '@cardapp/shared';
import { BRAND } from '../app/brand';
import { Money } from './Money';

const DESIGNS: Record<CardDesign, { bg: string; ink: string; sub: string; name: string }> = {
  gold: {
    bg: 'linear-gradient(135deg, #f6e7bd 0%, #d9b676 30%, #b08944 62%, #e9d199 100%)',
    ink: '#2a1f0c',
    sub: 'rgba(42,31,12,0.62)',
    name: 'Золото',
  },
  graphite: {
    bg: 'linear-gradient(140deg, #45454e 0%, #23232a 45%, #18181d 70%, #34343c 100%)',
    ink: '#f4f1ea',
    sub: 'rgba(244,241,234,0.6)',
    name: 'Графит',
  },
  obsidian: {
    bg: 'linear-gradient(135deg, #0b0b0e 0%, #17140f 55%, #3a2c16 100%)',
    ink: '#e9cf94',
    sub: 'rgba(233,207,148,0.6)',
    name: 'Обсидиан',
  },
  champagne: {
    bg: 'linear-gradient(135deg, #fbf5ea 0%, #ecdcc0 45%, #d2b98f 100%)',
    ink: '#2b241a',
    sub: 'rgba(43,36,26,0.58)',
    name: 'Шампань',
  },
};

export const CARD_DESIGNS = (Object.keys(DESIGNS) as CardDesign[]).map((id) => ({ id, ...DESIGNS[id] }));

export function BrandMark({ brand, color, className }: { brand: CardBrand; color?: string; className?: string }) {
  if (brand === 'mastercard') {
    return (
      <svg viewBox="0 0 48 30" className={clsx('h-7', className)} aria-label="Mastercard">
        <circle cx="17" cy="15" r="13" fill="#EB001B" />
        <circle cx="31" cy="15" r="13" fill="#F79E1B" />
        <path d="M24 4.2a13 13 0 0 1 0 21.6 13 13 0 0 1 0-21.6z" fill="#FF5F00" />
      </svg>
    );
  }
  return (
    <span
      className={clsx('font-display text-[26px] leading-none font-black tracking-tight italic', className)}
      style={{ color }}
      aria-label="Visa"
    >
      VISA
    </span>
  );
}

function Chip() {
  return (
    <svg viewBox="0 0 46 34" className="h-[30px] w-[40px]" aria-hidden>
      <defs>
        <linearGradient id="chip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f5e1a8" />
          <stop offset="0.5" stopColor="#c9a256" />
          <stop offset="1" stopColor="#f0d48e" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="44" height="32" rx="6" fill="url(#chip)" stroke="rgba(0,0,0,0.25)" strokeWidth="0.8" />
      <path
        d="M1 12h13M1 22h13M32 12h13M32 22h13M14 1v32M32 1v32M14 17h18"
        stroke="rgba(60,40,10,0.45)"
        strokeWidth="0.9"
        fill="none"
      />
    </svg>
  );
}

function Contactless({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round">
      <path d="M8.5 7.5a6 6 0 0 1 0 9" />
      <path d="M12 5a10 10 0 0 1 0 14" />
      <path d="M15.5 3a13 13 0 0 1 0 18" opacity="0.8" />
    </svg>
  );
}

export function CardVisual({
  card,
  size = 'lg',
  reveal,
  showBalance = true,
  className,
}: {
  card: Pick<Card, 'brand' | 'design' | 'label' | 'last4' | 'holderName' | 'currency' | 'balanceMinor' | 'status' | 'expMonth' | 'expYear'>;
  size?: 'lg' | 'sm';
  reveal?: Extract<CardReveal, { kind: 'demo' }> | null;
  showBalance?: boolean;
  className?: string;
}) {
  const d = DESIGNS[card.design];
  const sm = size === 'sm';

  return (
    <div
      className={clsx(
        'card-sheen relative aspect-[1.586] w-full overflow-hidden select-none',
        sm ? 'rounded-2xl' : 'rounded-[22px]',
        'shadow-[0_20px_40px_-16px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.25)]',
        className,
      )}
      style={{ background: d.bg, color: d.ink }}
    >
      {/* световые блики и текстура */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(90% 70% at 85% 0%, rgba(255,255,255,0.28), transparent 55%), radial-gradient(70% 60% at 0% 100%, rgba(0,0,0,0.22), transparent 60%)',
        }}
      />
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        <defs>
          <pattern id={`lines-${card.design}`} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="14" stroke={d.ink} strokeWidth="0.5" />
          </pattern>
        </defs>
        <circle cx="105%" cy="115%" r="62%" fill={`url(#lines-${card.design})`} />
      </svg>

      <div className={clsx('relative flex h-full flex-col justify-between', sm ? 'p-3.5' : 'p-5')}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <div className={clsx('font-semibold tracking-wide', sm ? 'text-[11px]' : 'text-[13px]')} style={{ color: d.sub }}>
              {card.label}
            </div>
            {showBalance && (
              <div className={clsx('tabular font-display font-semibold tracking-tight', sm ? 'text-[18px]' : 'text-[28px]')}>
                <Money minor={card.balanceMinor} currency={card.currency} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!sm && (
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase" style={{ color: d.sub }}>
                {BRAND.short}
              </span>
            )}
            <Contactless color={d.sub} />
          </div>
        </div>

        {!sm && !reveal && <Chip />}

        {reveal ? (
          <div className="font-mono">
            <div className="text-[19px] tracking-[0.12em]">{reveal.pan}</div>
            <div className="mt-1.5 flex gap-6 text-[13px]">
              <span>
                <span style={{ color: d.sub }}>EXP </span>
                {reveal.expiry}
              </span>
              <span>
                <span style={{ color: d.sub }}>CVV </span>
                {reveal.cvv}
              </span>
            </div>
          </div>
        ) : null}

        <div className="flex items-end justify-between">
          <div className="min-w-0">
            {!reveal && (
              <div className={clsx('tabular font-mono whitespace-nowrap', sm ? 'text-[12px] tracking-[0.08em]' : 'text-[15px] tracking-[0.18em]')}>
                {sm ? '••' : '••••'} {card.last4}
              </div>
            )}
            {!sm && (
              <div className="mt-1 truncate text-[11px] font-semibold tracking-[0.14em]" style={{ color: d.sub }}>
                {card.holderName}
              </div>
            )}
          </div>
          <BrandMark brand={card.brand} color={d.ink} className={sm ? 'scale-75 origin-bottom-right' : ''} />
        </div>
      </div>

      {card.status === 'frozen' && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(170,200,230,0.28)] backdrop-blur-[3px]">
          <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 text-[13px] font-semibold text-white">
            <Snowflake className="size-4" /> Заморожена
          </div>
        </div>
      )}
      {card.status === 'issuing' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px]">
          <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-[13px] font-semibold text-white">
            <Loader2 className="size-4 animate-spin" /> Выпускается…
          </div>
        </div>
      )}
    </div>
  );
}
