import { parseLedgerAmount, centsToDecimal } from '../shared/money.js';
import { validateDateRange } from './dates.js';
import { exchangeRate, convertCents } from './currency.js';

const sectionForSubtype = new Map([
  ['operating_revenue', 'revenue'], ['contra_revenue', 'revenue'],
  ['cogs', 'costOfGoodsSold'], ['operating_expense', 'operatingExpenses'],
  ['other_income', 'otherIncome'],
]);
const sections = ['revenue', 'costOfGoodsSold', 'operatingExpenses', 'otherIncome'];

// The ledger is validated at startup. This function has no I/O or mutable global state.
export function calculateIncomeStatement(ledger, { start, end, currency = ledger.currency }) {
  const period = validateDateRange(start, end);
  const conversion = exchangeRate(ledger.currency, currency);
  const report = { company: ledger.company, currency, period };
  if (conversion) report.exchangeRate = conversion;
  for (const section of sections) report[section] = { accounts: [], total: 0n };
  const rows = new Map();
  for (const account of ledger.accounts) {
    const section = sectionForSubtype.get(account.subtype);
    if (!section) continue;
    const row = {
      number: account.number, name: account.name, amount: 0n,
      calculation: { rule: account.type === 'revenue' ? 'credits-minus-debits' : 'debits-minus-credits', lines: [] },
    };
    report[section].accounts.push(row);
    rows.set(account.number, { row, type: account.type });
  }
  for (const [entryIndex, entry] of ledger.journal_entries.entries()) {
    if (entry.status !== 'posted' || entry.date < start || entry.date > end) continue;
    for (const [lineIndex, line] of entry.lines.entries()) {
      const account = rows.get(line.account);
      if (!account) continue;
      const debit = parseLedgerAmount(line.debit);
      const credit = parseLedgerAmount(line.credit);
      const contribution = account.type === 'revenue' ? credit - debit : debit - credit;
      account.row.amount += contribution;
      account.row.calculation.lines.push({
        entryIndex, entryId: entry.id, date: entry.date, memo: entry.memo, status: entry.status,
        lineNumber: lineIndex + 1, debit: line.debit, credit: line.credit,
        contribution,
      });
    }
  }
  for (const section of sections) {
    if (conversion) for (const row of report[section].accounts) {
      // Convert the exact account sum once, avoiding per-line rounding drift.
      row.amount = convertCents(row.amount, conversion.rate);
      let displayedSum = 0n;
      for (const line of row.calculation.lines) {
        line.debit = centsToDecimal(convertCents(parseLedgerAmount(line.debit), conversion.rate));
        line.credit = centsToDecimal(convertCents(parseLedgerAmount(line.credit), conversion.rate));
        line.contribution = convertCents(line.contribution, conversion.rate);
        displayedSum += line.contribution;
      }
      row.calculation.roundingAdjustment = row.amount - displayedSum;
    }
    report[section].total = report[section].accounts.reduce((sum, row) => sum + row.amount, 0n);
  }
  report.grossProfit = report.revenue.total - report.costOfGoodsSold.total;
  report.operatingIncome = report.grossProfit - report.operatingExpenses.total;
  report.netIncome = report.operatingIncome + report.otherIncome.total;
  report.calculations = {
    grossProfit: { operation: 'subtract', operands: [
      { label: 'Total revenue', amount: report.revenue.total },
      { label: 'Total cost of goods sold', amount: report.costOfGoodsSold.total },
    ] },
    operatingIncome: { operation: 'subtract', operands: [
      { label: 'Gross profit', amount: report.grossProfit },
      { label: 'Total operating expenses', amount: report.operatingExpenses.total },
    ] },
    netIncome: { operation: 'add', operands: [
      { label: 'Operating income', amount: report.operatingIncome },
      { label: 'Total other income', amount: report.otherIncome.total },
    ] },
  };
  return report;
}

export function serializeStatement(statement) {
  const result = { ...statement };
  for (const section of sections) {
    result[section] = {
      accounts: statement[section].accounts.map(row => ({
        ...row, amount: centsToDecimal(row.amount),
        calculation: { ...row.calculation,
          ...(row.calculation.roundingAdjustment !== undefined && {
            roundingAdjustment: centsToDecimal(row.calculation.roundingAdjustment),
          }),
          lines: row.calculation.lines.map(line => ({
          ...line, contribution: centsToDecimal(line.contribution),
        })) },
      })),
      total: centsToDecimal(statement[section].total),
    };
  }
  for (const field of ['grossProfit', 'operatingIncome', 'netIncome']) result[field] = centsToDecimal(statement[field]);
  result.calculations = Object.fromEntries(Object.entries(statement.calculations).map(([key, calculation]) => [key, {
    ...calculation, operands: calculation.operands.map(operand => ({ ...operand, amount: centsToDecimal(operand.amount) })),
  }]));
  return result;
}
