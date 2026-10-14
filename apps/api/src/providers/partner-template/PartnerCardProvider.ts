import type { CardLimits, CardReveal } from '@cardapp/shared';
import { ProviderError, type CardProvider, type IssueCardInput, type ProviderCard } from '../types';

/**
 * ШАБЛОН адаптера к реальному эмитенту. Не используется, пока CARD_PROVIDER=mock.
 *
 * Порядок работы при подключении партнёра:
 *  1. Скопировать папку в providers/<имя-партнёра>/.
 *  2. Сопоставить эндпоинты партнёра с методами ниже (см. docs/provider-integration.md).
 *  3. Маппить статусы партнёра в CardStatus.
 *  4. Передавать Idempotency-Key во все мутирующие запросы.
 *  5. Добавить вариант в providers/index.ts и CARD_PROVIDER в config.ts.
 */
export class PartnerCardProvider implements CardProvider {
  readonly name = 'partner';

  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      throw new ProviderError(`PARTNER_${res.status}`, `Ошибка партнёра: ${res.status}`);
    }
    return (await res.json()) as T;
  }

  // Пример маппинга — структура ответа зависит от конкретного API
  private map(raw: { id: string; state: string; last4: string; exp_month: number; exp_year: number; balance: number }): ProviderCard {
    const status =
      raw.state === 'ACTIVE' ? 'active' : raw.state === 'BLOCKED' ? 'frozen' : raw.state === 'CLOSED' ? 'closed' : 'issuing';
    return {
      externalId: raw.id,
      status,
      last4: raw.last4,
      expMonth: raw.exp_month,
      expYear: raw.exp_year,
      balanceMinor: raw.balance,
    };
  }

  async issueCard(input: IssueCardInput): Promise<ProviderCard> {
    void this.request;
    void this.map;
    void input;
    throw new ProviderError('NOT_IMPLEMENTED', 'Интеграция с партнёром ещё не реализована');
  }
  async getCard(_externalId: string): Promise<ProviderCard> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async freezeCard(_externalId: string): Promise<ProviderCard> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async unfreezeCard(_externalId: string): Promise<ProviderCard> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async closeCard(_externalId: string): Promise<ProviderCard> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async setLimits(_externalId: string, _limits: CardLimits): Promise<void> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async createRevealSession(_externalId: string): Promise<CardReveal> {
    // Ожидаемая реализация: партнёр выдаёт одноразовый URL защищённого виджета
    // return { kind: 'widget', url: data.widget_url, expiresAt: data.expires_at };
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
  async creditCard(_externalId: string, _amountMinor: number, _reference: string): Promise<ProviderCard> {
    throw new ProviderError('NOT_IMPLEMENTED', 'Не реализовано');
  }
}
