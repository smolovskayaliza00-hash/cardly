import type {
  Card,
  CardLimits,
  CardReveal,
  DemoResetMode,
  IssueCardRequest,
  KycStartRequest,
  Tariff,
  TariffId,
  TopUp,
  TopUpMethodInfo,
  TopUpRequest,
  Transaction,
  TransactionsQuery,
  UserProfile,
} from '@cardapp/shared';

/**
 * Контракт между Mini App и бэкендом.
 * Две реализации:
 *  - mockClient — всё в браузере, демо-данные в localStorage (прототип, GitHub Pages);
 *  - httpClient — REST к apps/api, который уже ходит к поставщику карт.
 * Mini App никогда не обращается к платёжному партнёру напрямую.
 */
export interface ApiClient {
  readonly mode: 'mock' | 'http';

  getMe(): Promise<UserProfile>;
  startKyc(req: KycStartRequest): Promise<UserProfile>;
  setSubscription(active: boolean): Promise<UserProfile>;

  getTariffs(): Promise<Tariff[]>;
  getTopUpMethods(): Promise<TopUpMethodInfo[]>;

  getCards(): Promise<Card[]>;
  getCard(id: string): Promise<Card>;
  issueCard(req: IssueCardRequest): Promise<Card>;
  revealCard(id: string): Promise<CardReveal>;
  freezeCard(id: string): Promise<Card>;
  unfreezeCard(id: string): Promise<Card>;
  updateLimits(id: string, limits: CardLimits): Promise<Card>;
  closeCard(id: string): Promise<Card>;

  getTransactions(query?: TransactionsQuery): Promise<Transaction[]>;

  createTopUp(req: TopUpRequest): Promise<TopUp>;
  getTopUp(id: string): Promise<TopUp>;
  /** Только демо: имитирует факт оплаты в банке */
  simulateTopUpPayment(id: string): Promise<TopUp>;

  /** Только демо: сброс данных */
  resetDemo(mode: DemoResetMode): Promise<void>;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export type { TariffId };
