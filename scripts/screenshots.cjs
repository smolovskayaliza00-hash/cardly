// Скриншоты всех экранов в размере iPhone (Playwright).
// Запуск: pnpm build && pnpm preview  (в другом терминале)
//         npm i playwright@1.48.2 && npx playwright install --with-deps chromium  (во временной папке)
//         node scripts/screenshots.cjs http://localhost:4173/   → снимки в scripts/shots/
const { chromium, devices } = require('playwright');
const path = require('path');

const BASE = process.argv[2] || 'http://localhost:4173/';
const OUT = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'ru-RU', deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  let n = 0;
  const shot = async (name, full = false) => {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: full });
  };
  const go = async (hash) => {
    await page.goto(`${BASE}#${hash}`);
    await page.waitForTimeout(400);
  };
  const click = (text) => page.getByText(text, { exact: true }).first().click();

  // Онбординг
  await page.goto(BASE);
  await shot('onboarding-1');
  await click('Далее');
  await shot('onboarding-2');
  await click('Далее');
  await shot('onboarding-3');
  await page.getByText('Я понимаю', { exact: false }).click();
  await click('Начать');
  await shot('home');
  await shot('home-full', true);

  await go('/cards');
  await shot('cards', true);

  await go('/cards/card_demo_1');
  await shot('card-details');
  await click('Реквизиты');
  await page.waitForTimeout(1200);
  await shot('card-reveal');
  await page.getByText('Лимиты', { exact: true }).click();
  await shot('card-limits');
  await page.keyboard.press('Escape');

  await go('/issue');
  await shot('issue-1');
  await click('Далее');
  await shot('issue-2', true);
  await click('Далее');
  await shot('issue-3');
  await page.getByRole('button', { name: /Выпустить карту|Оплатить/ }).last().click();
  await page.waitForTimeout(600);
  await shot('issue-progress');
  await page.waitForTimeout(3500);
  await shot('issue-done');

  await go('/topup?cardId=card_demo_1');
  await shot('topup', true);
  await page.getByRole('button', { name: /Пополнить на/ }).click();
  await page.waitForTimeout(1500);
  await shot('topup-qr', true);
  await click('Симулировать оплату');
  await page.waitForTimeout(800);
  await shot('topup-processing');
  await page.waitForTimeout(4000);
  await shot('topup-success');

  await go('/history');
  await shot('history');
  await go('/tariffs');
  await shot('tariffs', true);
  await go('/profile');
  await shot('profile', true);

  // Светлая тема
  await click('Светлая');
  await go('/');
  await shot('home-light');
  await go('/profile');
  await click('Тёмная');

  // Новый пользователь
  await click('Начать как новый пользователь');
  await page.waitForTimeout(1500);
  await shot('fresh-home');
  await go('/kyc');
  await shot('kyc');

  console.log('errors:', errors.length ? errors : 'none');
  await browser.close();
})();
