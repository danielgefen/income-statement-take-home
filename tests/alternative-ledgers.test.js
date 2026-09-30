import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../server/app.js';
import { validateLedger } from '../server/ledger.js';
import { formatAmount } from '../shared/money.js';

const groups = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];
const account = (number, type, subtype) => ({ number, name: number, type, subtype, is_active: false });
const entry = (id, debitAccount, creditAccount, amount, date = '2028-02-29', status = 'posted') => ({
  id, date, status, memo: 'Alternative chart transaction', lines: [
    { account: debitAccount, debit: amount, credit: '0.00' },
    { account: creditAccount, debit: '0.00', credit: amount },
  ],
});

function alternativeLedger(journal_entries = []) {
  return {
    company: 'Alternative Company', currency: 'USD',
    accounts: [
      account('B', 'asset', 'balance_sheet'),
      account('__proto__', 'revenue', 'operating_revenue'),
      account('42', 'revenue', 'contra_revenue'),
      account('005', 'expense', 'cogs'),
      account('constructor', 'expense', 'operating_expense'),
      account('A-7', 'revenue', 'other_income'),
    ],
    journal_entries,
  };
}

async function request(t, ledger, start = '2028-02-29', end = start) {
  validateLedger(ledger);
  const server = createApp(ledger).listen(0, '127.0.0.1');
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  await once(server, 'listening');
  const response = await fetch(`http://127.0.0.1:${server.address().port}/income-statement?${new URLSearchParams({ start, end })}`);
  assert.equal(response.status, 200);
  return response.json();
}

// Catches account-number assumptions, floating-point aggregation/JSON conversion,
// inactive filtering, and sign errors. Expected figures were tabulated by hand.
test('a different chart preserves every cent and signed result through HTTP and display', async t => {
  const ledger = alternativeLedger([
    entry('sale', 'B', '__proto__', '90071992547409.93'),
    entry('sale-reversal', '__proto__', 'B', '0.01'),
    entry('contra-reversal', 'B', '42', '0.03'),
    entry('cogs-reversal', 'B', '005', '0.05'),
    entry('expense', 'constructor', 'B', '0.07'),
    entry('other-reversal', 'A-7', 'B', '0.09'),
  ]);
  const report = await request(t, ledger);
  assert.equal(report.company, 'Alternative Company');
  assert.equal(report.currency, 'USD');
  for (const [group, expected] of [
    ['revenue', [['42', '0.03'], ['__proto__', '90071992547409.92']]],
    ['costOfGoodsSold', [['005', '-0.05']]],
    ['operatingExpenses', [['constructor', '0.07']]],
    ['otherIncome', [['A-7', '-0.09']]],
  ]) {
    // Sort only for comparison; display ordering is a separate concern.
    assert.deepEqual(report[group].accounts.map(row => [row.number, row.amount]).sort(), expected.sort());
  }
  assert.equal(report.revenue.total, '90071992547409.95');
  assert.equal(report.costOfGoodsSold.total, '-0.05');
  assert.equal(report.grossProfit, '90071992547410.00');
  assert.equal(report.operatingExpenses.total, '0.07');
  assert.equal(report.operatingIncome, '90071992547409.93');
  assert.equal(report.otherIncome.total, '-0.09');
  assert.equal(report.netIncome, '90071992547409.84');
  assert.equal(formatAmount(report.netIncome), '90,071,992,547,409.84');
  assert.equal(formatAmount(report.otherIncome.total), '(0.09)');
});

// Catches hard-coded sample periods, exclusive boundaries and omitted status filters.
test('an alternate chart includes a leap-day period and excludes adjacent, draft and void entries', async t => {
  const ledger = alternativeLedger([
    entry('before', 'B', '__proto__', '100.00', '2028-02-28'),
    entry('first', 'B', '__proto__', '12.34', '2028-02-29'),
    entry('last', 'constructor', 'B', '2.03', '2028-03-01'),
    entry('after', 'B', '__proto__', '200.00', '2028-03-02'),
    entry('draft', 'B', '__proto__', '400.00', '2028-02-29', 'draft'),
    entry('void', 'constructor', 'B', '800.00', '2028-03-01', 'void'),
  ]);
  const report = await request(t, ledger, '2028-02-29', '2028-03-01');
  assert.deepEqual(report.period, { start: '2028-02-29', end: '2028-03-01' });
  assert.equal(report.revenue.total, '12.34');
  assert.equal(report.costOfGoodsSold.total, '0.00');
  assert.equal(report.grossProfit, '12.34');
  assert.equal(report.operatingExpenses.total, '2.03');
  assert.equal(report.operatingIncome, '10.31');
  assert.equal(report.otherIncome.total, '0.00');
  assert.equal(report.netIncome, '10.31');
});

// Catches reductions without a zero seed and assumptions about fixed account counts.
test('an empty chart returns empty sections and exact zero totals', async t => {
  const report = await request(t, { company: 'Empty', currency: 'USD', accounts: [], journal_entries: [] });
  for (const group of groups) {
    assert.deepEqual(report[group].accounts, []);
    assert.equal(report[group].total, '0.00');
  }
  for (const field of ['grossProfit', 'operatingIncome', 'netIncome']) assert.equal(report[field], '0.00');
});

test('a chart containing only sales keeps absent expense and other-income sections empty', async t => {
  const ledger = alternativeLedger([entry('sale', 'B', '__proto__', '1.23')]);
  ledger.accounts = ledger.accounts.filter(row => ['B', '__proto__'].includes(row.number));
  const report = await request(t, ledger);
  assert.deepEqual(report.revenue.accounts.map(row => [row.number, row.amount]), [['__proto__', '1.23']]);
  assert.equal(report.revenue.total, '1.23');
  for (const group of groups.slice(1)) {
    assert.deepEqual(report[group].accounts, []);
    assert.equal(report[group].total, '0.00');
  }
  for (const field of ['grossProfit', 'operatingIncome', 'netIncome']) assert.equal(report[field], '1.23');
});
