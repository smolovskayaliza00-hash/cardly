import { DEFAULT_LIMITS, DEMO_RATES } from '../catalog';
import type {
  Card,
  CardCurrency,
  DemoResetMode,
  MerchantCategory,
  Transaction,
  UserProfile,
} from '../types';

/**
 * Генератор демонстрационных данных. Детерминированный (seeded PRNG),
 * чтобы прототип выглядел одинаково при каждом запуске.
 * Все номера карт и операции — вымышленные.
 */

export interface DemoState {
  user: UserProfile;
  cards: Card[];
  transactions: Transaction[];
}

export interface DemoUserInput {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f',
  х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'iu', я: 'ia',
};

export function toCardholderName(first: string, last?: string): string {
  const raw = [first, last].filter(Boolean).join(' ').toLowerCase();
  const latin = [...raw].map((ch) => TRANSLIT[ch] ?? ch).join('');
  const clean = latin.replace(/[^a-z\s-]/g, '').replace(/\s+/g, ' ').trim();
  return (clean || 'card holder').toUpperCase().slice(0, 26);
}

interface MerchantTemplate {
  name: string;
  category: MerchantCategory;
  min: number;
  max: number;
}

const MERCHANTS: Record<string, MerchantTemplate[]> = {
  subs: [
    { name: 'Netflix', category: 'subscriptions', min: 15_49, max: 15_49 },
    { name: 'Spotify', category: 'subscriptions', min: 11_99, max: 11_99 },
    { name: 'ChatGPT Plus', category: 'software', min: 20_00, max: 20_00 },
    { name: 'Apple Services', category: 'subscriptions', min: 2_99, max: 9_99 },
    { name: 'YouTube Premium', category: 'subscriptions', min: 13_99, max: 13_99 },
    { name: 'Notion', category: 'software', min: 10_00, max: 10_00 },
    { name: 'Steam', category: 'games', min: 9_99, max: 59_99 },
    { name: 'Figma', category: 'software', min: 15_00, max: 15_00 },
    { name: 'Amazon', category: 'shopping', min: 18_00, max: 140_00 },
  ],
  travel: [
    { name: 'Booking.com', category: 'travel', min: 120_00, max: 310_00 },
    { name: 'Airbnb', category: 'travel', min: 160_00, max: 420_00 },
    { name: 'Uber', category: 'travel', min: 8_00, max: 34_00 },
    { name: 'Bolt', category: 'travel', min: 6_00, max: 22_00 },
    { name: 'Zara', category: 'shopping', min: 29_90, max: 119_00 },
    { name: 'Starbucks', category: 'food', min: 4_50, max: 12_80 },
  ],
  ads: [
    { name: 'Meta Ads', category: 'ads', min: 40_00, max: 160_00 },
    { name: 'Google Ads', category: 'ads', min: 30_00, max: 120_00 },
    { name: 'TikTok Ads', category: 'ads', min: 25_00, max: 90_00 },
  ],
};

let idCounter = 0;
export function demoId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function createDemoUser(input: DemoUserInput, mode: DemoResetMode, now = new Date()): UserProfile {
  const renews = new Date(now);
  renews.setDate(renews.getDate() + 18);
  return {
    id: `usr_${input.telegramId}`,
    telegramId: input.telegramId,
    firstName: input.firstName,
    lastName: input.lastName,
    username: input.username,
    photoUrl: input.photoUrl,
    kycStatus: mode === 'seeded' ? 'approved' : 'none',
    subscription: mode === 'seeded' ? { active: true, renewsAt: renews.toISOString() } : { active: false },
    createdAt: new Date(now.getTime() - 64 * 86_400_000).toISOString(),
  };
}

export function createDemoState(input: DemoUserInput, mode: DemoResetMode, now = new Date()): DemoState {
  const user = createDemoUser(input, mode, now);
  if (mode === 'fresh') return { user, cards: [], transactions: [] };

  const holderName = toCardholderName(input.firstName, input.lastName);
  const expYear = now.getFullYear() + 3;
  const created = (daysAgo: number) => new Date(now.getTime() - daysAgo * 86_400_000).toISOString();

  const cards: Card[] = [
    {
      id: 'card_demo_1',
      brand: 'visa',
      currency: 'USD',
      status: 'active',
      design: 'gold',
      label: 'Подписки',
      last4: '4821',
      holderName,
      expMonth: 9,
      expYear,
      balanceMinor: 1_248_50,
      tariffId: 'subscription',
      limits: { ...DEFAULT_LIMITS.USD },
      createdAt: created(60),
    },
    {
      id: 'card_demo_2',
      brand: 'mastercard',
      currency: 'EUR',
      status: 'active',
      design: 'graphite',
      label: 'Путешествия',
      last4: '7390',
      holderName,
      expMonth: 3,
      expYear: expYear + 1,
      balanceMinor: 320_00,
      tariffId: 'subscription',
      limits: { ...DEFAULT_LIMITS.EUR },
      createdAt: created(41),
    },
    {
      id: 'card_demo_3',
      brand: 'visa',
      currency: 'USD',
      status: 'frozen',
      design: 'obsidian',
      label: 'Реклама',
      last4: '1057',
      holderName,
      expMonth: 12,
      expYear,
      balanceMinor: 86_12,
      tariffId: 'subscription',
      limits: { ...DEFAULT_LIMITS.USD, daily: 1_000_00 },
      createdAt: created(22),
    },
  ];

  const rand = mulberry32(42);
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)] as T;
  const transactions: Transaction[] = [];
  let seq = 0;

  const plan: Array<{ card: Card; pool: MerchantTemplate[]; count: number; days: number }> = [
    { card: cards[0]!, pool: MERCHANTS.subs!, count: 18, days: 34 },
    { card: cards[1]!, pool: MERCHANTS.travel!, count: 11, days: 30 },
    { card: cards[2]!, pool: MERCHANTS.ads!, count: 7, days: 20 },
  ];

  for (const { card, pool, count, days } of plan) {
    for (let i = 0; i < count; i++) {
      const m = pick(pool);
      const amount = Math.round(m.min + rand() * (m.max - m.min));
      const ts = now.getTime() - rand() * days * 86_400_000 - 3_600_000;
      const declined = rand() < 0.06;
      transactions.push({
        id: `tx_seed_${++seq}`,
        cardId: card.id,
        type: 'purchase',
        status: declined ? 'declined' : 'completed',
        amountMinor: -amount,
        currency: card.currency,
        merchant: m.name,
        category: m.category,
        createdAt: new Date(ts).toISOString(),
        declineReason: declined ? 'Недостаточно средств' : undefined,
      });
    }
    // пополнения
    for (let i = 0; i < 3; i++) {
      const rub = [5_000_00, 10_000_00, 15_000_00, 25_000_00][Math.floor(rand() * 4)]!;
      const rate = DEMO_RATES[card.currency as CardCurrency];
      const credited = Math.floor((rub * 0.98) / rate);
      const ts = now.getTime() - (i * days) / 3 * 86_400_000 - rand() * 86_400_000 - 7_200_000;
      transactions.push({
        id: `tx_seed_${++seq}`,
        cardId: card.id,
        type: 'topup',
        status: 'completed',
        amountMinor: credited,
        currency: card.currency,
        merchant: 'Пополнение через СБП',
        category: 'topup',
        createdAt: new Date(ts).toISOString(),
        originalAmount: { amountMinor: rub, currency: 'RUB' },
      });
    }
  }

  // одна свежая операция в обработке
  transactions.push({
    id: `tx_seed_${++seq}`,
    cardId: cards[0]!.id,
    type: 'purchase',
    status: 'pending',
    amountMinor: -24_99,
    currency: 'USD',
    merchant: 'App Store',
    category: 'subscriptions',
    createdAt: new Date(now.getTime() - 25 * 60_000).toISOString(),
  });

  transactions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { user, cards, transactions };
}
