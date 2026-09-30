import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLedger, validateLedger } from '../server/ledger.js';
import { calculateIncomeStatement, serializeStatement } from '../server/statement.js';

const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const q1 = { start: '2026-01-01', end: '2026-03-31' };
const groups = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];
const reportFor = (period = q1, source = ledger) => serializeStatement(calculateIncomeStatement(source, period));

test('software explanation preserves both original lines and the signed vendor credit', () => {
  const row = reportFor().operatingExpenses.accounts.find(row => row.number === '6200');
  assert.deepEqual(row.calculation, {
    rule: 'debits-minus-credits',
    lines: [
      { entryIndex: 17, entryId: 'JE-018', date: '2026-03-10', memo: 'Software subscriptions', status: 'posted',
        lineNumber: 1, debit: '1199.97', credit: '0.00', contribution: '1199.97' },
      { entryIndex: 19, entryId: 'JE-020', date: '2026-03-20', memo: 'Credit from software vendor for overbilling', status: 'posted',
        lineNumber: 2, debit: '0.00', credit: '100.00', contribution: '-100.00' },
    ],
  });
  assert.equal(row.amount, '1099.97');
});

test('revenue and discounts explain their own lines within a multi-line entry', () => {
  const report = reportFor({ start: '2026-03-02', end: '2026-03-02' });
  const product = report.revenue.accounts.find(row => row.number === '4000');
  const discount = report.revenue.accounts.find(row => row.number === '4900');
  assert.equal(product.calculation?.rule, 'credits-minus-debits');
  assert.deepEqual(product.calculation.lines.map(({ entryId, lineNumber, contribution }) => ({ entryId, lineNumber, contribution })),
    [{ entryId: 'JE-016', lineNumber: 3, contribution: '15000.00' }]);
  assert.deepEqual(discount.calculation.lines.map(({ entryId, lineNumber, contribution }) => ({ entryId, lineNumber, contribution })),
    [{ entryId: 'JE-016', lineNumber: 2, contribution: '-150.00' }]);
});

test('profit explanations expose the actual exact operands and operations', () => {
  assert.deepEqual(reportFor().calculations, {
    grossProfit: { operation: 'subtract', operands: [
      { label: 'Total revenue', amount: '37850.50' }, { label: 'Total cost of goods sold', amount: '14272.75' },
    ] },
    operatingIncome: { operation: 'subtract', operands: [
      { label: 'Gross profit', amount: '23577.75' }, { label: 'Total operating expenses', amount: '68100.07' },
    ] },
    netIncome: { operation: 'add', operands: [
      { label: 'Operating income', amount: '-44522.32' }, { label: 'Total other income', amount: '42.18' },
    ] },
  });
});

test('traces reconcile every row, include inactive history, and omit nonposted and outside-period entries', () => {
  const report = calculateIncomeStatement(ledger, q1);
  const ids = new Set();
  for (const group of groups) for (const row of report[group].accounts) {
    assert.ok(row.calculation, 'every row has an explanation');
    assert.equal(row.calculation.lines.reduce((sum, line) => sum + line.contribution, 0n), row.amount);
    for (const line of row.calculation.lines) {
      ids.add(line.entryId);
      assert.equal(line.status, 'posted');
      assert.ok(line.date >= q1.start && line.date <= q1.end);
      const original = ledger.journal_entries[line.entryIndex];
      assert.equal(original.id, line.entryId);
      assert.equal(original.lines[line.lineNumber - 1].account, row.number);
    }
  }
  assert.ok(ids.has('JE-008'));
  assert.ok(ids.has('JE-007'));
  assert.ok(ids.has('JE-023'));
  for (const id of ['JE-001', 'JE-004', 'JE-009', 'JE-013', 'JE-019', 'JE-024', 'JE-025']) assert.ok(!ids.has(id), id);
});

test('a balance-sheet-only period has empty explanations for every account', () => {
  const report = reportFor({ start: '2026-01-10', end: '2026-01-10' });
  for (const group of groups) for (const row of report[group].accounts) {
    assert.deepEqual(row.calculation?.lines, []);
    assert.equal(row.amount, '0.00');
  }
});

test('duplicate IDs and cancelling lines retain distinct source locations and exact large amounts', () => {
  const source = structuredClone(ledger);
  source.journal_entries = [
    { id: 'same', date: q1.start, status: 'posted', memo: '', lines: [
      { account: '1000', debit: '90071992547409.93', credit: '0.00' },
      { account: '4000', debit: '0.00', credit: '90071992547409.93' },
    ] },
    { id: 'same', date: q1.end, status: 'posted', memo: '', lines: [
      { account: '4000', debit: '90071992547409.93', credit: '0.00' },
      { account: '1000', debit: '0.00', credit: '90071992547409.93' },
    ] },
  ];
  validateLedger(source);
  const row = reportFor(q1, source).revenue.accounts.find(row => row.number === '4000');
  assert.equal(row.amount, '0.00');
  assert.ok(row.calculation);
  assert.deepEqual(row.calculation.lines.map(line => [line.entryIndex, line.lineNumber, line.contribution]),
    [[0, 2, '90071992547409.93'], [1, 1, '-90071992547409.93']]);
});
