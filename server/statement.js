import { parseLedgerAmount, centsToDecimal } from '../shared/money.js';
import { validateDateRange } from './dates.js';

const sectionForSubtype = new Map([
  ['operating_revenue', 'revenue'], ['contra_revenue', 'revenue'],
  ['cogs', 'costOfGoodsSold'], ['operating_expense', 'operatingExpenses'],
  ['other_income', 'otherIncome'],
]);
const sections = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];

// The ledger is validated at startup. This function has no I/O or mutable global state.
export function calculateIncomeStatement(ledger, { start, end }) {
  const period = validateDateRange(start, end);
  const report = { company: ledger.company, currency: ledger.currency, period };
  for (const section of sections) report[section] = { accounts: [], total: 0n };
  const rows = new Map();
  for (const account of ledger.accounts) {
    const section = sectionForSubtype.get(account.subtype);
    if (!section) continue;
    const row = { number: account.number, name: account.name, amount: 0n };
    report[section].accounts.push(row);
    rows.set(account.number, { row, type: account.type });
  }
  for (const entry of ledger.journal_entries) {
    if (entry.status !== 'posted' || entry.date < start || entry.date > end) continue;
    for (const line of entry.lines) {
      const account = rows.get(line.account);
      if (!account) continue;
      const debit = parseLedgerAmount(line.debit);
      const credit = parseLedgerAmount(line.credit);
      account.row.amount += account.type === 'revenue' ? credit - debit : debit - credit;
    }
  }
  for (const section of sections) {
    report[section].accounts.sort((a, b) => a.number.localeCompare(b.number, 'en', { numeric: true }));
    report[section].total = report[section].accounts.reduce((sum, row) => sum + row.amount, 0n);
  }
  report.grossProfit = report.revenue.total - report.costOfGoodsSold.total;
  report.operatingIncome = report.grossProfit - report.operatingExpenses.total;
  report.netIncome = report.operatingIncome + report.otherIncome.total;
  return report;
}

export function serializeStatement(statement) {
  const result = { ...statement };
  for (const section of sections) {
    result[section] = {
      accounts: statement[section].accounts.map(row => ({ ...row, amount: centsToDecimal(row.amount) })),
      total: centsToDecimal(statement[section].total),
    };
  }
  for (const field of ['grossProfit', 'operatingIncome', 'netIncome']) result[field] = centsToDecimal(statement[field]);
  return result;
}
