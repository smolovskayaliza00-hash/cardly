import { BRAND } from '../app/brand';
import { getInitData, isTelegram } from './telegram';

export type BotEvent = 'kyc_approved' | 'kyc_resubmission' | 'kyc_rejected';

/**
 * Просит бота отправить пользователю уведомление в чат.
 * Работает только внутри Telegram: сервер бота проверяет подпись initData.
 * text/plain — чтобы браузер не делал preflight-запрос CORS.
 */
export function notifyBot(event: BotEvent, extra: Record<string, string> = {}) {
  if (!isTelegram) return;
  void fetch(`${BRAND.botApiUrl}/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: JSON.stringify({ initData: getInitData(), event, ...extra }),
  }).catch(() => {
    /* уведомление не критично */
  });
}
