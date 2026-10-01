import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createApp } from '../server/app.js';
import { loadLedger } from '../server/ledger.js';
import { financialReport } from './helpers/financial-report.js';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const expectedQ1 = JSON.parse(readFileSync(new URL('./fixtures/q1-statement.json', import.meta.url), 'utf8'));

for (const [currency, expected] of [['EUR', '-40032.13'], ['GBP', '-35584.12']]) {
  test(`GET returns a converted ${currency} report`, async t => {
    const response = await request(t, `?start=2026-01-01&end=2026-03-31&currency=${currency}`);
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.equal(report.currency, currency);
    assert.equal(report.netIncome, expected);
    assert.equal(typeof report.revenue.accounts[0].calculation.roundingAdjustment, 'string');
  });
}

for (const currencyQuery of ['currency=JPY', 'currency=', 'currency=EUR&currency=GBP',
  'currency=EUR' + '&x=1'.repeat(998) + '&currency=GBP']) {
  test(`GET rejects invalid currency selection: ${currencyQuery.slice(0, 45)}`, async t => {
    const response = await request(t, `?start=2026-01-01&end=2026-03-31&${currencyQuery}`);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_CURRENCY');
  });
}

async function request(t, query) {
  const server = createApp(ledger).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  return fetch(`http://127.0.0.1:${server.address().port}/income-statement${query}`);
}

test('GET returns the complete exact Q1 statement as JSON', async t => {
  const response = await request(t, '?start=2026-01-01&end=2026-03-31');
  assert.equal(response.status, 200);
  assert.deepEqual(financialReport(await response.json()), expectedQ1);
});

for (const [start, end, netIncome] of [
  ['2026-03-01', '2026-03-31', '-9720.24'],
  ['2030-01-01', '2030-01-31', '0.00'],
  ['2026-01-10', '2026-01-10', '0.00'],
]) {
  test('GET calculates the requested range starting ' + start, async t => {
    const response = await request(t, `?start=${start}&end=${end}`);
    assert.equal(response.status, 200);
    const report = await response.json();
    assert.deepEqual(report.period, { start, end });
    assert.equal(report.netIncome, netIncome);
    if (netIncome === '0.00') {
      const accounts = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'].flatMap(key => report[key].accounts);
      assert.equal(accounts.length, 9);
      for (const account of accounts) assert.equal(account.amount, '0.00');
    }
  });
}

for (const query of [
  '', '?start=2026-01-01', '?end=2026-03-31',
  '?start=2026-02-29&end=2026-03-31',
  '?start=2026-03-31&end=2026-01-01',
  '?start=2026-01-01&start=2026-02-01&end=2026-03-31',
  '?start=2026-01-01&end=2026-03-31&end=2026-04-01',
  '?start=2026-01-01&end=2026-03-31' + '&x=1'.repeat(998) + '&start=2026-02-01',
]) {
  test('GET rejects an invalid date query: ' + (query.length > 200 ? 'duplicate date beyond parser limit' : query), async t => {
    const response = await request(t, query);
    assert.equal(response.status, 400);
    const body = await response.json();
    assert.equal(body.error.code, 'INVALID_DATE_RANGE');
    assert.equal(typeof body.error.message, 'string');
    assert.ok(body.error.message.length > 0);
  });
}
