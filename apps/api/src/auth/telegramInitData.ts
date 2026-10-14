import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Проверка подписи Telegram Mini App initData.
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key = HMAC_SHA256(key = "WebAppData", data = bot_token)
 *   hash       = hex(HMAC_SHA256(key = secret_key, data = data_check_string))
 *
 * data_check_string — все поля, кроме hash, отсортированные по ключу, в виде key=value через \n.
 */

export interface TelegramInitUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

export interface ValidatedInitData {
  user: TelegramInitUser;
  authDate: Date;
  startParam?: string;
}

export class InitDataError extends Error {}

export function validateInitData(raw: string, botToken: string, maxAgeSec: number, now = Date.now()): ValidatedInitData {
  if (!raw) throw new InitDataError('initData пуста');
  if (!botToken) throw new InitDataError('BOT_TOKEN не настроен');

  const params = new URLSearchParams(raw);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) throw new InitDataError('Нет подписи');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) throw new InitDataError('Неверная подпись');

  const authDate = Number(params.get('auth_date'));
  if (!authDate) throw new InitDataError('Нет auth_date');
  if (now / 1000 - authDate > maxAgeSec) throw new InitDataError('initData устарела');

  const userRaw = params.get('user');
  if (!userRaw) throw new InitDataError('Нет пользователя');
  const user = JSON.parse(userRaw) as TelegramInitUser;

  return { user, authDate: new Date(authDate * 1000), startParam: params.get('start_param') ?? undefined };
}

/** Утилита для тестов: подписывает initData так же, как Telegram */
export function signInitData(fields: Record<string, string>, botToken: string): string {
  const dataCheckString = Object.entries(fields)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = createHmac('sha256', secret).update(dataCheckString).digest('hex');
  return new URLSearchParams({ ...fields, hash }).toString();
}
