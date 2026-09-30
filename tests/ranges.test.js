import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { calculateIncomeStatement } from '../server/statement.js';

const ledger = JSON.parse(readFileSync(new URL('../ledger.json', import.meta.url), 'utf8'));
const reference = JSON.parse(readFileSync(new URL('./fixtures/expected-contributions.json', import.meta.url), 'utf8'));
const sections = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];
const totalFields = ['revenue', 'costOfGoodsSold', 'grossProfit', 'operatingExpenses', 'operatingIncome', 'otherIncome', 'netIncome'];

// Sum reviewed literal contributions; never inspect production ledger statuses,
// account types, debits, credits, or classifications to construct expectations.
function expectedAmounts(start, end) {
  const accounts = Object.fromEntries(Object.keys(reference.accountSections).map(number => [number, 0n]));
  for (const entry of reference.entries) {
    if (entry.date < start || entry.date > end) continue;
    for (const [number, cents] of Object.entries(entry.amounts)) accounts[number] += BigInt(cents);
  }
  const totals = Object.fromEntries(sections.map(section => [section, 0n]));
  for (const [number, amount] of Object.entries(accounts)) totals[reference.accountSections[number]] += amount;
  totals.grossProfit = totals.revenue - totals.costOfGoodsSold;
  totals.operatingIncome = totals.grossProfit - totals.operatingExpenses;
  totals.netIncome = totals.operatingIncome + totals.otherIncome;
  return { accounts, totals };
}

function monetaryFields(report) {
  const accounts = {};
  const totals = {};
  for (const section of sections) {
    for (const row of report[section].accounts) {
      assert.equal(reference.accountSections[row.number], section, `account ${row.number} section`);
      assert.equal(Object.hasOwn(accounts, row.number), false, `duplicate account ${row.number}`);
      accounts[row.number] = row.amount;
    }
  }
  for (const field of totalFields) totals[field] = sections.includes(field) ? report[field].total : report[field];
  return { accounts, totals };
}

function calculate(start, end, input = ledger) {
  return monetaryFields(calculateIncomeStatement(input, { start, end }));
}

const dates = [];
for (let date = new Date('2025-12-14T00:00:00Z'); date <= new Date('2026-04-02T00:00:00Z'); date.setUTCDate(date.getUTCDate() + 1)) {
  dates.push(date.toISOString().slice(0, 10));
}

test('all 6,105 date intervals match nine independent account balances and seven totals', () => {
  assert.equal(dates.length, 110);
  assert.equal(reference.entries.length, 25);
  assert.equal(Object.keys(reference.accountSections).length, 9);
  let checked = 0;
  for (let start = 0; start < dates.length; start++) {
    for (let end = start; end < dates.length; end++) {
      assert.deepEqual(calculate(dates[start], dates[end]), expectedAmounts(dates[start], dates[end]), `${dates[start]} through ${dates[end]}`);
      checked++;
    }
  }
  assert.equal(checked, 6105);
});

// Literal totals calculated before the implementation was read.
// Order: revenue, COGS, gross profit, OpEx, operating income, other income, net.
const diagnosticRanges = [
  ['full dataset', '2025-12-15', '2026-04-01', ['5195050','1427275','3767775','6810007','-3042232','4218','-3038014']],
  ['Q1', '2026-01-01', '2026-03-31', ['3785050','1427275','2357775','6810007','-4452232','4218','-4448014']],
  ['January', '2026-01-01', '2026-01-31', ['1345075','498030','847045','3000010','-2152965','0','-2152965']],
  ['February', '2026-02-01', '2026-02-28', ['854975','328000','526975','1850000','-1323025','0','-1323025']],
  ['March', '2026-03-01', '2026-03-31', ['1585000','601245','983755','1959997','-976242','4218','-972024']],
  ['discount and COGS', '2026-03-02', '2026-03-02', ['1485000','601245','883755','0','883755','0','883755']],
  ['vendor credit', '2026-03-20', '2026-03-20', ['0','0','0','-10000','10000','0','10000']],
  ['return', '2026-02-14', '2026-02-14', ['-65025','0','-65025','0','-65025','0','-65025']],
  ['January-February boundary', '2026-01-31', '2026-02-03', ['920000','328000','592000','1850000','-1258000','0','-1258000']],
  ['February-March boundary', '2026-02-28', '2026-03-02', ['1585000','601245','983755','1850000','-866245','0','-866245']],
  ['March-April boundary', '2026-03-31', '2026-04-01', ['1010000','0','1010000','1850000','-840000','4218','-835782']],
  ['software around draft and void entries', '2026-03-10', '2026-03-20', ['0','0','0','109997','-109997','0','-109997']],
  ['year boundary', '2025-12-15', '2026-01-01', ['500000','0','500000','900000','-400000','0','-400000']],
  ['only draft and void entries', '2026-03-15', '2026-03-18', ['0','0','0','0','0','0','0']],
  ['Q1 excluding rent posting date', '2026-01-02', '2026-03-31', ['3785050','1427275','2357775','5910007','-3552232','4218','-3548014']],
];

for (const [name, start, end, cents] of diagnosticRanges) {
  test(`literal diagnostic: ${name}`, () => {
    const literalTotals = Object.fromEntries(totalFields.map((field, i) => [field, BigInt(cents[i])]));
    assert.deepEqual(expectedAmounts(start, end).totals, literalTotals, 'reviewed contributions reconcile to independent totals');
    assert.deepEqual(calculate(start, end).totals, literalTotals);
  });
}

test('entry order does not change account balances or totals', () => {
  const reversed = { ...ledger, journal_entries: [...ledger.journal_entries].reverse() };
  const interleaved = {
    ...ledger,
    journal_entries: [
      ...ledger.journal_entries.filter((_, i) => i % 2 === 1),
      ...ledger.journal_entries.filter((_, i) => i % 2 === 0),
    ],
  };
  for (const [name, start, end] of diagnosticRanges) {
    const expected = expectedAmounts(start, end);
    assert.deepEqual(calculate(start, end, reversed), expected, `${name}: reverse order`);
    assert.deepEqual(calculate(start, end, interleaved), expected, `${name}: interleaved order`);
  }
});

test('adjacent periods add to the full period at all 109 daily boundaries', () => {
  const whole = calculate(dates[0], dates.at(-1));
  for (let i = 0; i < dates.length - 1; i++) {
    const left = calculate(dates[0], dates[i]);
    const right = calculate(dates[i + 1], dates.at(-1));
    for (const group of ['accounts', 'totals']) {
      for (const [field, amount] of Object.entries(whole[group])) {
        assert.equal(left[group][field] + right[group][field], amount, `${field}: split after ${dates[i]}`);
      }
    }
  }
});
