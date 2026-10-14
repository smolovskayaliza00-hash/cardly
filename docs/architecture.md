# Архитектура

## Общая схема

```
┌──────────────────────┐   initData (подпись)   ┌──────────────────────┐
│  Telegram Mini App   │ ─────────────────────▶ │     apps/api         │
│  (apps/miniapp)      │ ◀───────────────────── │  Fastify + Zod       │
│                      │     REST /api/*        │                      │
│  ApiClient           │                        │  AppService          │
│   ├ mockClient ◀─ прототип / GitHub Pages     │   ├ Store (память→PG)│
│   └ httpClient ─────────────────────────────▶ │   └ Providers        │
└──────────────────────┘                        │      ├ CardProvider ─┼──▶ Эмитент карт
                                                │      └ PaymentProv. ─┼──▶ Приём СБП
                                                │  /api/webhooks/* ◀───┼─── вебхуки партнёров
                                                └──────────────────────┘
```

## Принципы

1. **Mini App не обращается к партнёрам напрямую.** Ключи API хранятся только на сервере.
2. **Аутентификация через Telegram initData.** Клиент шлёт `Authorization: tma <initData>`,
   сервер проверяет HMAC-подпись токеном бота и срок действия (`apps/api/src/auth`).
   `initDataUnsafe` на клиенте используется только для отображения.
3. **Адаптеры поставщиков.** `CardProvider` и `PaymentProvider` (`apps/api/src/providers/types.ts`)
   описывают все операции. Новый партнёр — это новый класс, сервисы не меняются.
4. **Реквизиты карт не проходят через наш сервер.** `CardReveal` бывает `demo` (прототип)
   и `widget` (одноразовый URL защищённого iframe партнёра). Это держит проект вне scope PCI DSS.
5. **Деньги — в минорных единицах** (центы, копейки), целыми числами.
6. **Общий код в `packages/shared`:** типы, тарифы, расчёт комиссии (`computeTopUpQuote`),
   правила выпуска (`checkCanIssue`). Клиент показывает предварительный расчёт,
   источник истины — сервер.
7. **Идемпотентность:** `Idempotency-Key` в мутирующих запросах к партнёрам. Финальные
   статусы платежа повторным вебхуком не меняются.

## Потоки

### Выпуск карты (целевой)
1. Клиент: `POST /api/cards` → сервер проверяет KYC и лимит тарифа.
2. Сервер создаёт платёж за выпуск или подписку (`PaymentProvider.createPayment`).
3. Пользователь оплачивает через СБП, приходит вебхук `succeeded`.
4. Сервер вызывает `CardProvider.issueCard`, карта `issuing` → `active` (вебхук или опрос).

В прототипе шаги 2–3 пропущены (оплата «демо»).

### Пополнение
1. `POST /api/topups` → сервер получает курс партнёра, считает комиссию, создаёт платёж.
2. Клиент показывает QR / ссылку на банк и опрашивает `GET /api/topups/:id`.
3. Вебхук `succeeded` → `CardProvider.creditCard` → транзакция в истории.

## Фронтенд

- **Роутинг:** `createHashRouter`, стабильно работает в WebView и на статическом хостинге.
- **Данные:** TanStack Query (кэш, опрос статусов `issuing` / `processing`, инвалидация после мутаций).
- **UI-состояние:** Zustand с `persist` (тема, скрытие баланса, онбординг).
- **Telegram:** `src/lib/telegram.ts` — типизированная обёртка над `window.Telegram.WebApp`
  с проверкой версий. `MainButton` / `BackButton` — хуки в `src/lib/useTelegramButtons.ts`.
- **Тема:** CSS-переменные в `src/index.css` (тёмная и светлая), Tailwind 4 `@theme inline`.
- **Режим API:** `VITE_API_MODE=mock|http`.

## Бэкенд

| Эндпоинт | Назначение |
|---|---|
| `GET /api/health` | статус и активные поставщики |
| `GET /api/me` | профиль |
| `POST /api/kyc/start` | начать верификацию |
| `POST /api/me/subscription` | подписка вкл/выкл |
| `GET /api/tariffs`, `GET /api/topup-methods` | справочники |
| `GET/POST /api/cards`, `GET /api/cards/:id` | карты |
| `POST /api/cards/:id/{reveal,freeze,unfreeze,close}` | действия |
| `PATCH /api/cards/:id/limits` | лимиты |
| `GET /api/transactions?cardId&type&limit` | история |
| `POST /api/topups`, `GET /api/topups/:id` | пополнения |
| `POST /api/webhooks/payments` | вебхук платёжного партнёра (подпись!) |
| `POST /api/topups/:id/simulate`, `POST /api/demo/reset` | только при mock-поставщиках |
