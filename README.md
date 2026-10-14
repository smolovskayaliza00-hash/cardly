# Aurum Cards — Telegram Mini App (прототип)

Интерактивный прототип Telegram Mini App для оформления виртуальных карт Visa / Mastercard
с пополнением через СБП. **Работает только на демо-данных:** карты не выпускаются,
платежи не проводятся, платёжные данные пользователей не запрашиваются.

> «Aurum Cards» — рабочее название. Меняется в одном месте: `apps/miniapp/src/app/brand.ts`.

## Что внутри

| Экран | Возможности |
|---|---|
| Онбординг | 3 слайда, согласие с демо-условиями |
| Главная | общий баланс, карусель карт, быстрые действия, последние операции, баннеры KYC/подписки |
| Мои карты | список карт, лимит по тарифу |
| Карта | демо-реквизиты (автоскрытие через 30 с, копирование), заморозка, лимиты, закрытие, операции |
| Выпуск карты | Visa/Mastercard → USD/EUR → дизайн → название → тариф → оплата (демо) → анимация выпуска |
| Пополнение | выбор карты, сумма в ₽, СБП / SberPay / T-Pay, расчёт комиссии и курса, демо-QR, статусы |
| История | фильтры по типу и карте, поиск, сводка за 30 дней, детали операции |
| Тарифы | «Разовый» и «Премиум», подключение/отмена подписки (демо), FAQ |
| Профиль | KYC, тариф, скрытие баланса, тема, сброс демо-данных, режим «новый пользователь» |
| Верификация | заглушка KYC-флоу |

Интеграция с Telegram: нативные `MainButton` и `BackButton`, haptic feedback, цвета шапки,
тема Telegram, данные пользователя из `initData`. Вне Telegram (Safari, Chrome) приложение
работает в браузерном режиме со своими кнопками.

## Структура

```
cardapp/
├── apps/
│   ├── miniapp/         React 18 + TypeScript + Vite 6 + Tailwind 4 + Framer Motion
│   │   └── src/
│   │       ├── api/         ApiClient: mockClient (в браузере) | httpClient (к apps/api)
│   │       ├── app/         роутинг, оболочка, бренд
│   │       ├── components/  CardVisual, TransactionList, Sheet, MainButton, …
│   │       ├── screens/     экраны
│   │       ├── lib/         Telegram SDK-обёртка, тема, даты
│   │       └── store/       Zustand (UI-настройки, тосты)
│   └── api/             Node + Fastify 5 + Zod — каркас бэкенда
│       ├── src/auth/        проверка подписи Telegram initData (+ тесты)
│       ├── src/providers/   ★ адаптеры поставщиков: mock/ и partner-template/
│       ├── src/services/    бизнес-логика
│       ├── src/store/       хранилище (сейчас в памяти)
│       └── prisma/          черновик схемы PostgreSQL
├── packages/shared/     общие типы, тарифы, правила, демо-данные
├── docs/                документация
└── .github/workflows/   автодеплой на GitHub Pages
```

## Быстрый старт

```bash
pnpm install
pnpm dev            # Mini App на http://localhost:5173 (mock-режим)
```

Подробно — [docs/local-dev.md](docs/local-dev.md).
Просмотр на iPhone через бота — [docs/iphone-telegram.md](docs/iphone-telegram.md).

## Команды

| Команда | Что делает |
|---|---|
| `pnpm dev` | Mini App, данные в браузере (mock) |
| `pnpm dev:api` | бэкенд на :8787 |
| `pnpm dev:http` | Mini App, работающий через бэкенд (proxy `/api`) |
| `pnpm build` | production-сборка в `apps/miniapp/dist` |
| `pnpm typecheck` | проверка типов во всех пакетах |
| `pnpm test` | тесты бэкенда |

## Документация

- [Архитектура](docs/architecture.md)
- [Локальный запуск](docs/local-dev.md)
- [Просмотр на iPhone через Telegram](docs/iphone-telegram.md)
- [Подключение API поставщика карт](docs/provider-integration.md)
- [Правовые риски и комплаенс](docs/compliance.md) — **прочитать до подключения реальных денег**
- [Журнал работы](docs/progress.md) — хронология решений, статус, открытые вопросы

## Этапы

1. ✅ **Прототип:** интерфейс, демо-данные, каркас API с адаптерами
2. ⏳ Бот (grammY), PostgreSQL, деплой бэкенда
3. ⏳ Юридическая проверка → выбор партнёра → адаптер, вебхуки, KYC
4. ⏳ Тесты, мониторинг, аудит безопасности, запуск
