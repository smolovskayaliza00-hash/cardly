import type { ApiErrorBody } from '@cardapp/shared';
import { getInitData } from '../lib/telegram';
import { ApiError, type ApiClient } from './types';

/**
 * REST-клиент к apps/api. Аутентификация — подписанная Telegram initData
 * в заголовке `Authorization: tma <initData>`; сервер проверяет подпись токеном бота.
 */
export function createHttpClient(baseUrl: string): ApiClient {
  async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {};
    const initData = getInitData();
    if (initData) headers.Authorization = `tma ${initData}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(data?.error.code ?? 'HTTP_ERROR', data?.error.message ?? `Ошибка ${res.status}`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  const qs = (params: Record<string, string | number | undefined>) => {
    const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '') as [string, string][];
    return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : '';
  };

  return {
    mode: 'http',
    getMe: () => request('GET', '/me'),
    startKyc: (req) => request('POST', '/kyc/start', req),
    setSubscription: (active) => request('POST', '/me/subscription', { active }),
    getTariffs: () => request('GET', '/tariffs'),
    getTopUpMethods: () => request('GET', '/topup-methods'),
    getCards: () => request('GET', '/cards'),
    getCard: (id) => request('GET', `/cards/${id}`),
    issueCard: (req) => request('POST', '/cards', req),
    revealCard: (id) => request('POST', `/cards/${id}/reveal`),
    freezeCard: (id) => request('POST', `/cards/${id}/freeze`),
    unfreezeCard: (id) => request('POST', `/cards/${id}/unfreeze`),
    updateLimits: (id, limits) => request('PATCH', `/cards/${id}/limits`, limits),
    closeCard: (id) => request('POST', `/cards/${id}/close`),
    getTransactions: (q = {}) => request('GET', `/transactions${qs({ cardId: q.cardId, type: q.type, limit: q.limit })}`),
    createTopUp: (req) => request('POST', '/topups', req),
    getTopUp: (id) => request('GET', `/topups/${id}`),
    simulateTopUpPayment: (id) => request('POST', `/topups/${id}/simulate`),
    resetDemo: (mode) => request('POST', '/demo/reset', { mode }),
  };
}
