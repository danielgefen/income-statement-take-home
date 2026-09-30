import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';
import { loadLedger } from '../server/ledger.js';
import { calculateIncomeStatement, serializeStatement } from '../server/statement.js';

let vite, Statement, AccountCalculation, FormulaCalculation;
before(async () => {
  vite = await createServer({ configFile: false, plugins: [react()],
    server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' });
  ({ default: Statement, AccountCalculation, FormulaCalculation } = await vite.ssrLoadModule('/client/Statement.jsx'));
});
after(async () => { await vite?.close(); });
const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
const report = serializeStatement(calculateIncomeStatement(ledger, { start: '2026-01-01', end: '2026-03-31' }));
const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test('every account and total has a named, initially collapsed disclosure button', () => {
  const html = render(Statement, { report });
  assert.equal((html.match(/aria-expanded="false"/g) ?? []).length, 16);
  assert.match(html, /aria-label="1,099.97: Show calculation for Software"/);
  assert.match(html, /aria-label="\(44,480.14\): Show calculation for Net income"/);
  const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(controls).size, 16);
  for (const id of controls) assert.ok(html.includes(`id="${id}"`), 'each control names its detail region');
});

test('software detail displays source identity, raw money, sign rule, credit and reconciled total', () => {
  assert.equal(typeof AccountCalculation, 'function');
  const account = report.operatingExpenses.accounts.find(row => row.number === '6200');
  const html = render(AccountCalculation, { account });
  for (const text of ['Debits − credits', 'JE-018', '2026-03-10', 'Software subscriptions',
    'JE-020', '2026-03-20', 'posted', 'source entry 18', 'source entry 20', 'Debit', 'Credit', 'Contribution', '1,199.97', '(100.00)', '1,099.97']) {
    assert.ok(html.includes(text), text);
  }
});

test('empty explanation is explicit and source memo is rendered as text, not HTML', () => {
  assert.equal(typeof AccountCalculation, 'function');
  const account = structuredClone(report.revenue.accounts[0]);
  account.calculation.lines = [];
  account.amount = '0.00';
  assert.match(render(AccountCalculation, { account }), /No posted lines for this account in this period/);
  account.calculation.lines = [{ ...report.revenue.accounts[0].calculation.lines[0], memo: '<script>bad()</script>' }];
  const html = render(AccountCalculation, { account });
  assert.ok(html.includes('&lt;script&gt;bad()&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));
});

test('net-income formula displays addition of negative operating income and positive interest', () => {
  assert.equal(typeof FormulaCalculation, 'function');
  const html = render(FormulaCalculation, { calculation: report.calculations.netIncome, label: 'Net income', amount: report.netIncome });
  for (const text of ['Operating income', 'Total other income', '(44,522.32)', '42.18', '+', '(44,480.14)']) assert.ok(html.includes(text), text);
});
