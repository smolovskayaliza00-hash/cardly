# Бот @CardlyPayBot

Вебхук для Vercel: `api/telegram.js`. Отвечает на `/start` приветствием с кнопкой открытия Mini App.

Деплой: Vercel → Import репозитория → Root Directory `apps/bot` → переменные
`BOT_TOKEN`, `WEBHOOK_SECRET`, `WEBAPP_URL` → Deploy. Затем зарегистрировать вебхук:

    curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<проект>.vercel.app/api/telegram&secret_token=<WEBHOOK_SECRET>"
