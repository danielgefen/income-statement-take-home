import test from 'node:test';
import assert from 'node:assert/strict';
import { convertCents, InvalidCurrencyError } from '../server/currency.js';
import { loadLedger, validateLedger } from '../server/ledger.js';
import { calculateIncomeStatement, serializeStatement } from '../server/statement.js';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const period = { start: '2026-01-01', end: '2026-03-31' };
const sections = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];

test('conversion preserves large values and rounds signed half-cent ties away from zero', () => {
  assert.equal(convertCents(5n, '0.90'), 5n);
  assert.equal(convertCents(-5n, '0.90'), -5n);
  assert.equal(convertCents(3n, '0.80'), 2n);
  assert.equal(convertCents(-3n, '0.80'), -2n);
  assert.equal(convertCents(0n, '0.80'), 0n);
  assert.equal(convertCents(9007199254740993n, '0.90'), 8106479329266894n);
  assert.equal(convertCents(-9007199254740993n, '0.80'), -7205759403792794n);
});

test('explicit USD returns the original report without conversion metadata', () => {
  assert.deepEqual(calculateIncomeStatement(ledger, { ...period, currency: 'USD' }),
    calculateIncomeStatement(ledger, period));
});

for (const [currency, rate, expected, software] of [
  ['EUR', '0.90', ['34065.45', '12845.48', '21219.97', '61290.06', '-40070.09', '37.96', '-40032.13'],
    ['1079.97', '90.00', '-90.00', '989.97']],
  ['GBP', '0.80', ['30280.40', '11418.20', '18862.20', '54480.06', '-35617.86', '33.74', '-35584.12'],
    ['959.98', '80.00', '-80.00', '879.98']],
]) {
  test(`${currency} Q1 amounts, details, and formulas reconcile without changing the ledger`, () => {
    const original = structuredClone(ledger);
    const result = calculateIncomeStatement(ledger, { ...period, currency });
    for (const section of sections) {
      for (const row of result[section].accounts) {
        assert.equal(row.calculation.lines.reduce((sum, line) => sum + line.contribution, 0n)
          + row.calculation.roundingAdjustment, row.amount);
      }
      assert.equal(result[section].accounts.reduce((sum, row) => sum + row.amount, 0n), result[section].total);
    }
    const report = serializeStatement(result);
    assert.equal(report.currency, currency);
    assert.deepEqual(report.exchangeRate, { source: 'USD', target: currency, rate });
    assert.deepEqual([report.revenue.total, report.costOfGoodsSold.total, report.grossProfit,
      report.operatingExpenses.total, report.operatingIncome, report.otherIncome.total, report.netIncome], expected);
    const row = report.operatingExpenses.accounts.find(row => row.number === '6200');
    assert.deepEqual([row.calculation.lines[0].debit, row.calculation.lines[1].credit,
      row.calculation.lines[1].contribution, row.amount], software);
    assert.deepEqual(report.calculations.netIncome.operands.map(item => item.amount), [expected[4], expected[5]]);
    assert.deepEqual(report.calculations.grossProfit.operands.map(item => item.amount), [expected[0], expected[1]]);
    assert.deepEqual(report.calculations.operatingIncome.operands.map(item => item.amount), [expected[2], expected[3]]);
    assert.deepEqual(ledger, original);
    assert.doesNotThrow(() => JSON.stringify(report));
  });
}

for (const reversed of [false, true]) {
  test(`account-level rounding exposes a ${reversed ? 'negative' : 'positive'} detail adjustment`, () => {
    const source = structuredClone(ledger);
    source.journal_entries = [0, 1].map(index => ({
      id: `tiny-${index}`, date: period.start, status: 'posted', memo: '', lines: [
        { account: '4000', debit: reversed ? '0.03' : '0.00', credit: reversed ? '0.00' : '0.03' },
        { account: '1000', debit: reversed ? '0.00' : '0.03', credit: reversed ? '0.03' : '0.00' },
      ],
    }));
    validateLedger(source);
    const report = serializeStatement(calculateIncomeStatement(source, { ...period, currency: 'GBP' }));
    const row = report.revenue.accounts.find(row => row.number === '4000');
    assert.equal(row.amount, reversed ? '-0.05' : '0.05');
    assert.deepEqual(row.calculation.lines.map(line => line.contribution), reversed ? ['-0.02', '-0.02'] : ['0.02', '0.02']);
    assert.equal(row.calculation.roundingAdjustment, reversed ? '-0.01' : '0.01');
    assert.equal(report.netIncome, row.amount);
  });
}

test('conversion of an empty period retains zero accounts and zero adjustments', () => {
  const result = calculateIncomeStatement(ledger, { start: '2030-01-01', end: '2030-01-01', currency: 'EUR' });
  for (const section of sections) for (const row of result[section].accounts) {
    assert.equal(row.amount, 0n);
    assert.equal(row.calculation.roundingAdjustment, 0n);
    assert.deepEqual(row.calculation.lines, []);
  }
  assert.equal(result.netIncome, 0n);
});

test('unsupported currency values are rejected by the calculator', () => {
  for (const currency of ['JPY', '', 'eur', 'constructor', null, ['EUR']]) {
    assert.throws(() => calculateIncomeStatement(ledger, { ...period, currency }), InvalidCurrencyError);
  }
});

test('USD demonstration rates cannot be applied to a non-USD source ledger', () => {
  const source = { ...ledger, currency: 'CAD' };
  assert.equal(calculateIncomeStatement(source, period).currency, 'CAD');
  assert.throws(() => calculateIncomeStatement(source, { ...period, currency: 'EUR' }), InvalidCurrencyError);
});
