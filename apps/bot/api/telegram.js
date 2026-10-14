// Вебхук Telegram-бота @CardlyPayBot (Vercel Serverless Function, без зависимостей).
// Переменные окружения: BOT_TOKEN, WEBHOOK_SECRET, WEBAPP_URL.

const WEBAPP_URL = process.env.WEBAPP_URL || 'https://smolovskayaliza00-hash.github.io/cardly/';

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

const openButton = { inline_keyboard: [[{ text: '💳 Открыть Cardly Pay', web_app: { url: WEBAPP_URL } }]] };

const WELCOME = (name) =>
  `Привет, ${name}! 👋\n\n` +
  `<b>Cardly Pay</b> — виртуальные карты Visa и Mastercard прямо в Telegram.\n\n` +
  `• Выпуск карты за пару минут\n` +
  `• Пополнение через СБП\n` +
  `• Баланс, история и управление картами\n\n` +
  `<i>Сейчас это демо-версия: карты не выпускаются, платежи не проводятся.</i>`;

const HELP =
  `Нажмите кнопку ниже, чтобы открыть приложение.\n\n` +
  `/start — приветствие\n/help — помощь\n\nПоддержка: @lizzaa99`;

export default async function handler(req, res) {
  // Однократная настройка: GET /api/telegram?setup=<WEBHOOK_SECRET> регистрирует вебхук на этот адрес
  if (req.method === 'GET') {
    if (process.env.WEBHOOK_SECRET && req.query?.setup === process.env.WEBHOOK_SECRET) {
      const url = `https://${req.headers.host}/api/telegram`;
      const r = await tg('setWebhook', { url, secret_token: process.env.WEBHOOK_SECRET, allowed_updates: ['message'] });
      await tg('setMyCommands', { commands: [{ command: 'start', description: 'Открыть Cardly Pay' }, { command: 'help', description: 'Помощь' }] });
      return res.status(200).send(r.ok ? `Готово! Бот подключён к ${url}` : `Ошибка: ${r.description}`);
    }
    return res.status(200).send('ok');
  }
  // Проверка, что запрос пришёл от Telegram (secret_token из setWebhook)
  if (process.env.WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('unauthorized');
  }

  const msg = req.body?.message;
  if (msg?.text && msg.chat?.type === 'private') {
    const name = msg.from?.first_name || 'друг';
    const text = msg.text.startsWith('/start') ? WELCOME(name) : HELP;
    await tg('sendMessage', { chat_id: msg.chat.id, text, parse_mode: 'HTML', reply_markup: openButton });
  }
  return res.status(200).json({ ok: true });
}
