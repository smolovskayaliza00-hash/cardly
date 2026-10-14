# Подключение API поставщика карт

## Что нужно от партнёра (чек-лист для переговоров)

**Эмитент карт (`CardProvider`)**
- [ ] Лицензия и юрисдикция эмитента, BIN-спонсор, страны, где разрешено обслуживать клиентов
- [ ] API: создание клиента (KYC), выпуск, получение, блокировка/разблокировка, закрытие карты
- [ ] Лимиты на уровне карты; ограничения по MCC
- [ ] **Показ реквизитов через защищённый виджет / iframe** (без передачи PAN/CVV нам)
- [ ] Пополнение (funding) карты и баланс
- [ ] Вебхуки: статус карты, авторизации, клиринг, возвраты, отклонения
- [ ] Идемпотентность, песочница (sandbox), SLA, rate limits
- [ ] 3-D Secure: кто и как доставляет OTP (часто — вебхук, мы пересылаем в бот)
- [ ] KYC: собственный SDK партнёра или допустимые провайдеры (Sumsub, Onfido и т.п.)

**Приём платежей (`PaymentProvider`)**
- [ ] Право принимать СБП / SberPay / T-Pay для этого назначения платежа
- [ ] Создание платежа → QR-payload / deeplink, срок жизни
- [ ] Вебхуки с подписью (HMAC или асимметричная), повторная доставка
- [ ] Возвраты, курс конвертации (фиксация на время платежа), рекуррентные платежи для подписки

## Шаги интеграции

1. Скопируйте `apps/api/src/providers/partner-template/` в `providers/<partner>/`.
2. Реализуйте методы `CardProvider` и `PaymentProvider`:
   - маппинг статусов партнёра → `CardStatus` / `TopUpStatus`;
   - `Idempotency-Key` во всех мутирующих запросах;
   - таймауты (`AbortSignal.timeout`) и повторы только для идемпотентных операций;
   - `createRevealSession` → `{ kind: 'widget', url, expiresAt }`.
3. `parseWebhook`: проверка подписи **по сырому телу** (`req.rawBody` уже сохраняется),
   `timingSafeEqual`, защита от повторов (журнал `WebhookEvent`).
4. Зарегистрируйте провайдера в `providers/index.ts` и добавьте значение в
   `CARD_PROVIDER` / `PAYMENT_PROVIDER` (`config.ts`).
5. Секреты — в `.env` на сервере, никогда в репозитории и не во фронтенде.
6. На фронтенде: обработать `CardReveal.kind === 'widget'` (открыть iframe в `Sheet`)
   и `TopUp.paymentUrl` (кнопка «Открыть приложение банка» → `openExternalLink`).
7. Удалить или выключить демо-эндпоинты: они автоматически не регистрируются,
   если хотя бы один провайдер не `mock`.
8. Сборка Mini App с `VITE_API_MODE=http` и `VITE_API_BASE_URL=https://api.ваш-домен`.

## Где что менять

| Задача | Файл |
|---|---|
| Контракты поставщиков | `apps/api/src/providers/types.ts` |
| Выбор провайдера | `apps/api/src/providers/index.ts` |
| Бизнес-логика | `apps/api/src/services/AppService.ts` |
| Тарифы, комиссии | `packages/shared/src/catalog.ts` |
| Расчёт комиссии | `packages/shared/src/rules.ts` |
| Хранилище → PostgreSQL | `apps/api/src/store/` + `apps/api/prisma/schema.prisma` |
