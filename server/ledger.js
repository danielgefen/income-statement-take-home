import { readFileSync } from 'node:fs';
import { parseLedgerAmount } from '../shared/money.js';
import { validateDateRange } from './dates.js';

const classifications = new Map([
  ['asset', ['balance_sheet']], ['liability', ['balance_sheet']],
  ['equity', ['balance_sheet']],
  ['revenue', ['operating_revenue', 'contra_revenue', 'other_income']],
  ['expense', ['cogs', 'operating_expense']],
]);

export function validateLedger(ledger) {
  if (!ledger || !Array.isArray(ledger.accounts) || !Array.isArray(ledger.journal_entries)) {
    throw new Error('Invalid ledger: accounts and journal_entries must be arrays.');
  }
  const accounts = new Set();
  for (const account of ledger.accounts) {
    if (!account || typeof account.number !== 'string' || !account.number) throw new Error('Invalid ledger account number.');
    if (accounts.has(account.number)) throw new Error(`Duplicate account ${account.number}.`);
    if (!classifications.get(account.type)?.includes(account.subtype)) {
      throw new Error(`Account ${account.number}: unsupported classification.`);
    }
    accounts.add(account.number);
  }
  for (const entry of ledger.journal_entries) {
    const context = `Entry ${entry?.id ?? '(missing id)'}`;
    if (!['posted', 'draft', 'void'].includes(entry?.status)) throw new Error(`${context}: invalid status.`);
    try { validateDateRange(entry.date, entry.date); }
    catch { throw new Error(`${context}: invalid date.`); }
    if (!Array.isArray(entry.lines) || entry.lines.length < 2) throw new Error(`${context}: at least two lines required.`);
    let balance = 0n;
    for (const line of entry.lines) {
      if (!accounts.has(line?.account)) throw new Error(`${context}: unknown account ${line?.account}.`);
      let debit, credit;
      try {
        debit = parseLedgerAmount(line.debit);
        credit = parseLedgerAmount(line.credit);
      } catch { throw new Error(`${context}, account ${line.account}: invalid amount.`); }
      if (debit !== 0n && credit !== 0n) throw new Error(`${context}: a line cannot have both a debit and credit.`);
      balance += debit - credit;
    }
    if (balance !== 0n) throw new Error(`${context}: debits and credits do not balance.`);
  }
}

export function loadLedger(filePath) {
  const ledger = JSON.parse(readFileSync(filePath, 'utf8'));
  validateLedger(ledger);
  return ledger;
}
