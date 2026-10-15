// Уведомления пользователю от бота по событиям из Mini App.
// Принимает подписанную Telegram initData (проверяется токеном бота), поэтому
// написать можно только самому себе и только одним из фиксированных шаблонов.
import { createHmac, timingSafeEqual } from 'node:crypto';

const WEBAPP_URL = process.env.WEBAPP_URL || 'https://smolovskayaliza00-hash.github.io/cardly/';
const ALLOWED_ORIGIN = 'https://smolovskayaliza00-hash.github.io';
const MAX_AGE_SEC = 24 * 3600;

const TEMPLATES = {
  kyc_approved: (level) =>
    `✅ <b>Верификация пройдена</b>\n\nУровень: ${level === 'extended' ? 'расширенный' : 'базовый'}. Теперь вам доступен выпуск карт.`,
  kyc_resubmission: () =>
    `🔁 <b>Нужно переснять документ</b>\n\nФото размыто или с бликом. Откройте приложение и загрузите его ещё раз.`,
  kyc_rejected: () =>
    `❌ <b>Верификация не пройдена</b>\n\nНапишите в поддержку: @lizzaa99 — поможем разобраться.`,
};

function validate(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete('hash');
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
  const expected = createHmac('sha256', secret).update(dcs).digest();
  if (!timingSafeEqual(expected, Buffer.from(hash, 'hex'))) return null;
  if (Date.now() / 1000 - Number(params.get('auth_date')) > MAX_AGE_SEC) return null;
  try {
    return JSON.parse(params.get('user'));
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).send('method not allowed');

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).send('bad json');
    }
  }
  const user = validate(body?.initData || '');
  if (!user?.id) return res.status(401).send('unauthorized');
  const tpl = TEMPLATES[body?.event];
  if (!tpl) return res.status(400).send('unknown event');

  const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: user.id,
      text: tpl(body.level),
      parse_mode: 'HTML',
      reply_markup: { inline_keyboard: [[{ text: '💳 Открыть Cardly Pay', web_app: { url: WEBAPP_URL } }]] },
    }),
  }).then((x) => x.json());
  return res.status(r.ok ? 200 : 502).json({ ok: r.ok });
}
