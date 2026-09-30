import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLedger } from '../server/ledger.js';
import { calculateIncomeStatement, serializeStatement } from '../server/statement.js';
import { InvalidDateRangeError } from '../server/dates.js';
import { financialReport } from './helpers/financial-report.js';

const source = JSON.parse(readFileSync(new URL('../ledger.json', import.meta.url), 'utf8'));
const expectedQ1 = JSON.parse(readFileSync(new URL('./fixtures/q1-statement.json', import.meta.url), 'utf8'));
const q1 = { start: '2026-01-01', end: '2026-03-31' };
const groups = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];

function entry(id, debitAccount, creditAccount, amount, date = '2026-02-01', status = 'posted') {
  return { id, date, status, memo: 'Test transaction', lines: [
    { account: debitAccount, debit: amount, credit: '0.00' },
    { account: creditAccount, debit: '0.00', credit: amount },
  ] };
}

function smallLedger(entries = [
  entry('sale', '1100', '4000', '100.00'),
  entry('cost', '5000', '1200', '40.00'),
]) {
  const ledger = { company: 'Example Company', currency: 'USD', accounts: structuredClone(source.accounts), journal_entries: entries };
  validateLedger(ledger);
  return ledger;
}

test('a 100 dollar sale and 40 dollar cost yield 60 dollars of profit in exact cents', () => {
  const report = calculateIncomeStatement(smallLedger(), q1);
  assert.equal(report?.revenue?.total, 10000n);
  assert.equal(report?.costOfGoodsSold?.total, 4000n);
  assert.equal(report?.grossProfit, 6000n);
  assert.equal(report?.operatingIncome, 6000n);
  assert.equal(report?.netIncome, 6000n);
});

test('matches every independently tabulated Q1 account, subtotal and profit result', () => {
  assert.deepEqual(financialReport(serializeStatement(calculateIncomeStatement(source, q1))), expectedQ1);
});

for (const [start, end, expected] of [
  ['2026-01-01', '2026-01-31', '-21529.65'],
  ['2026-02-01', '2026-02-28', '-13230.25'],
  ['2026-03-01', '2026-03-31', '-9720.24'],
]) {
  test('matches independently calculated monthly net income for ' + start, () => {
    const report = serializeStatement(calculateIncomeStatement(source, { start, end }));
    assert.equal(report?.netIncome, expected);
  });
}

test('includes both period boundaries and excludes immediately adjacent dates', () => {
  const ledger = smallLedger([
    entry('before', '1100', '4000', '17.00', '2025-12-31'),
    entry('first', '1100', '4000', '100.00', '2026-01-01'),
    entry('last', '5000', '1200', '40.00', '2026-03-31'),
    entry('after', '1100', '4000', '19.00', '2026-04-01'),
  ]);
  assert.equal(calculateIncomeStatement(ledger, q1)?.netIncome, 6000n);
  assert.equal(calculateIncomeStatement(ledger, { start: '2026-01-01', end: '2026-01-01' })?.netIncome, 10000n);
  assert.equal(calculateIncomeStatement(ledger, { start: '2026-03-31', end: '2026-03-31' })?.netIncome, -4000n);
});

test('excludes draft revenue and void expenses', () => {
  const ledger = smallLedger();
  ledger.journal_entries.push(
    entry('draft', '1100', '4000', '999.00', '2026-02-01', 'draft'),
    entry('void', '5000', '1200', '888.00', '2026-02-01', 'void'),
  );
  assert.equal(calculateIncomeStatement(ledger, q1)?.netIncome, 6000n);
});

test('subtracts returns and expense credits while preserving negative account amounts', () => {
  const ledger = smallLedger();
  ledger.journal_entries.push(
    entry('return', '4900', '1100', '10.00'),
    entry('salary', '6000', '1000', '20.00'),
    entry('vendor-credit', '2000', '6200', '5.00'),
  );
  const report = calculateIncomeStatement(ledger, q1);
  assert.equal(report?.revenue?.total, 9000n);
  assert.equal(report.operatingExpenses.accounts.find(a => a.number === '6200').amount, -500n);
  assert.equal(report.operatingExpenses.total, 1500n);
  assert.equal(report.netIncome, 3500n);
});

test('handles reversals on ordinary revenue and expense accounts', () => {
  const ledger = smallLedger();
  ledger.journal_entries.push(
    entry('reverse-sale', '4000', '1100', '10.00'),
    entry('reverse-cost', '1200', '5000', '10.00'),
  );
  const report = calculateIncomeStatement(ledger, q1);
  assert.equal(report?.revenue?.total, 9000n);
  assert.equal(report.costOfGoodsSold.total, 3000n);
});

test('includes historical expenses from an inactive account', () => {
  const ledger = smallLedger();
  ledger.journal_entries.push(entry('legacy-marketing', '6300', '2000', '10.00'));
  const report = calculateIncomeStatement(ledger, q1);
  assert.equal(report?.operatingExpenses?.total, 1000n);
  assert.equal(report.netIncome, 5000n);
});

test('preserves all lines of a sale with an embedded discount', () => {
  const report = serializeStatement(calculateIncomeStatement(source, { start: '2026-03-02', end: '2026-03-02' }));
  assert.equal(report?.revenue?.total, '14850.00');
  assert.equal(report.revenue.accounts.find(a => a.number === '4000').amount, '15000.00');
  assert.equal(report.revenue.accounts.find(a => a.number === '4900').amount, '-150.00');
});

for (const date of ['2026-01-10', '2026-02-15', '2030-01-01']) {
  test('returns all nine zero accounts for a period with no income-statement activity: ' + date, () => {
    const report = serializeStatement(calculateIncomeStatement(source, { start: date, end: date }));
    assert.equal(report?.netIncome, '0.00');
    const rows = groups.flatMap(group => report[group].accounts);
    assert.equal(rows.length, 9);
    for (const row of rows) assert.equal(row.amount, '0.00');
    for (const group of groups) assert.equal(report[group].total, '0.00');
  });
}

test('takes new accounts in chart order without changing the ledger', () => {
  const ledger = smallLedger();
  ledger.accounts.unshift({ number: '7100', name: 'New income', type: 'revenue', subtype: 'other_income', is_active: true });
  ledger.journal_entries.push(entry('new-income', '1000', '7100', '7.25'));
  const before = structuredClone(ledger);
  const report = calculateIncomeStatement(ledger, q1);
  assert.equal(report?.netIncome, 6725n);
  assert.deepEqual(report.otherIncome.accounts.map(a => a.number), ['7100', '7000']);
  assert.equal(groups.flatMap(group => report[group].accounts).length, 10);
  assert.deepEqual(ledger, before);
});

test('keeps an account visible when posted activity cancels to zero', () => {
  const ledger = smallLedger([
    entry('sale', '1100', '4000', '100.00'),
    entry('reversal', '4000', '1100', '100.00'),
  ]);
  const report = calculateIncomeStatement(ledger, q1);
  assert.equal(report?.revenue?.total, 0n);
  assert.equal(report.revenue.accounts.find(a => a.number === '4000').amount, 0n);
});

test('rejects invalid dates even when the calculator is called without HTTP', () => {
  assert.throws(() => calculateIncomeStatement(source, { start: '2026-02-29', end: '2026-03-31' }), InvalidDateRangeError);
});
