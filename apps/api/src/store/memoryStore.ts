import type { Card, TopUp, Transaction, UserProfile } from '@cardapp/shared';

/**
 * Хранилище в памяти — для прототипа. Данные теряются при перезапуске.
 * Целевая схема PostgreSQL: apps/api/prisma/schema.prisma.
 * Интерфейс Store позволяет заменить реализацию, не трогая сервисы.
 */

export interface UserRecord {
  profile: UserProfile;
  /** Идентификатор клиента у партнёра (выдаётся после KYC) */
  customerRef: string;
}

export interface CardRecord extends Card {
  userId: string;
  externalId: string;
}

export interface TopUpRecord extends TopUp {
  userId: string;
  externalId: string;
}

export interface TransactionRecord extends Transaction {
  userId: string;
}

export interface Store {
  getUser(telegramId: number): UserRecord | undefined;
  saveUser(u: UserRecord): void;

  listCards(userId: string): CardRecord[];
  getCard(id: string): CardRecord | undefined;
  saveCard(c: CardRecord): void;

  listTransactions(userId: string): TransactionRecord[];
  addTransaction(t: TransactionRecord): void;

  getTopUp(id: string): TopUpRecord | undefined;
  findTopUpByExternalId(externalId: string): TopUpRecord | undefined;
  saveTopUp(t: TopUpRecord): void;

  deleteUserData(userId: string): void;
}

export class MemoryStore implements Store {
  private users = new Map<number, UserRecord>();
  private cards = new Map<string, CardRecord>();
  private topUps = new Map<string, TopUpRecord>();
  private transactions: TransactionRecord[] = [];

  getUser(telegramId: number) {
    return this.users.get(telegramId);
  }
  saveUser(u: UserRecord) {
    this.users.set(u.profile.telegramId, u);
  }

  listCards(userId: string) {
    return [...this.cards.values()].filter((c) => c.userId === userId);
  }
  getCard(id: string) {
    return this.cards.get(id);
  }
  saveCard(c: CardRecord) {
    this.cards.set(c.id, c);
  }

  listTransactions(userId: string) {
    return this.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  addTransaction(t: TransactionRecord) {
    this.transactions.push(t);
  }

  getTopUp(id: string) {
    return this.topUps.get(id);
  }
  findTopUpByExternalId(externalId: string) {
    return [...this.topUps.values()].find((t) => t.externalId === externalId);
  }
  saveTopUp(t: TopUpRecord) {
    this.topUps.set(t.id, t);
  }

  deleteUserData(userId: string) {
    for (const [id, c] of this.cards) if (c.userId === userId) this.cards.delete(id);
    for (const [id, t] of this.topUps) if (t.userId === userId) this.topUps.delete(id);
    this.transactions = this.transactions.filter((t) => t.userId !== userId);
  }
}
