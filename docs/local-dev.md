# Локальный запуск

## Требования

- Node.js ≥ 20.12 (рекомендуется 20 LTS)
- pnpm 9: `npm i -g pnpm@9`

## Установка

```bash
cd cardapp
pnpm install
```

## Вариант 1. Только интерфейс (mock)

```bash
pnpm dev
```

Откройте http://localhost:5173. Все данные генерируются в браузере и сохраняются в
`localStorage`. Сбросить их можно в «Профиль → Демо-режим».

Совет: в Chrome DevTools включите режим устройства (⌘⇧M) и выберите iPhone.

## Вариант 2. Интерфейс + бэкенд

```bash
cp apps/api/.env.example apps/api/.env   # DEV_SKIP_AUTH=true уже включён
pnpm dev:api                              # терминал 1 → http://localhost:8787
pnpm dev:http                             # терминал 2 → http://localhost:5173
```

Vite проксирует `/api` на `:8787`. Без Telegram-подписи сервер пускает вас как демо-пользователя
(только при `DEV_SKIP_AUTH=true`). Данные хранятся в памяти и сбрасываются при перезапуске.

Проверка:

```bash
curl localhost:8787/api/health
curl localhost:8787/api/cards
```

## Проверки

```bash
pnpm typecheck
pnpm test
pnpm build && pnpm preview   # production-сборка на http://localhost:4173
```

## С телефона в той же Wi-Fi сети

Vite слушает все интерфейсы. Откройте на iPhone `http://<IP-компьютера>:5173`
(IP показан в выводе `pnpm dev`, строка `Network`). Внутри Telegram так не получится,
нужен HTTPS (см. [iphone-telegram.md](iphone-telegram.md)).
