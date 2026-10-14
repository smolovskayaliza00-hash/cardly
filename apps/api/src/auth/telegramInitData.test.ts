import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InitDataError, signInitData, validateInitData } from './telegramInitData';

const TOKEN = '123456:TEST-TOKEN';
const user = JSON.stringify({ id: 42, first_name: 'Test' });

test('принимает корректно подписанную initData', () => {
  const now = Date.now();
  const raw = signInitData({ auth_date: String(Math.floor(now / 1000)), user, query_id: 'AAA' }, TOKEN);
  const res = validateInitData(raw, TOKEN, 3600, now);
  assert.equal(res.user.id, 42);
});

test('отклоняет подделанные данные', () => {
  const raw = signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user }, TOKEN);
  const tampered = raw.replace('Test', 'Evil');
  assert.throws(() => validateInitData(tampered, TOKEN, 3600), InitDataError);
});

test('отклоняет подпись другого бота', () => {
  const raw = signInitData({ auth_date: String(Math.floor(Date.now() / 1000)), user }, 'other:token');
  assert.throws(() => validateInitData(raw, TOKEN, 3600), InitDataError);
});

test('отклоняет устаревшую initData', () => {
  const old = Math.floor(Date.now() / 1000) - 7200;
  const raw = signInitData({ auth_date: String(old), user }, TOKEN);
  assert.throws(() => validateInitData(raw, TOKEN, 3600), /устарела/);
});
