import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateLedger, loadLedger } from '../server/ledger.js';

const ledgerPath = new URL('../ledger.json', import.meta.url);
const source = JSON.parse(readFileSync(ledgerPath, 'utf8'));

test('loads the supplied ledger without altering its accounts or entries', () => {
  assert.deepEqual(loadLedger(ledgerPath), source);
});

test('accepts the balanced supplied ledger', () => {
  assert.doesNotThrow(() => validateLedger(source));
});

const invalidCases = [
  ['missing company', l => { delete l.company; }, /company/i],
  ['object currency', l => { l.currency = {}; }, /currency/i],
  ['missing account name', l => { delete l.accounts[0].name; }, /1000.*name/i],
  ['object account name', l => { l.accounts[0].name = {}; }, /1000.*name/i],
  ['nonboolean activity flag', l => { l.accounts[0].is_active = 'false'; }, /1000.*is_active/i],
  ['missing entry id', l => { delete l.journal_entries[0].id; }, /entry.*id/i],
  ['object entry memo', l => { l.journal_entries[0].memo = {}; }, /JE-001.*memo/i],
  ['unknown account', l => { l.journal_entries[0].lines[0].account = '9999'; }, /JE-001.*9999/],
  ['duplicate account number', l => { l.accounts.push({ ...l.accounts[0] }); }, /duplicate.*1000/i],
  ['unsupported account classification', l => { l.accounts[0].subtype = 'operating_revenue'; }, /1000.*classification/i],
  ['unbalanced entry', l => { l.journal_entries[0].lines[0].debit = '4999.00'; }, /JE-001.*balanc/i],
  ['invalid monetary precision', l => { l.journal_entries[0].lines[0].debit = '5000.005'; }, /JE-001.*amount/i],
  ['both a debit and credit on one line', l => { l.journal_entries[0].lines[0].credit = '1.00'; }, /JE-001.*debit.*credit/i],
  ['fewer than two lines', l => { l.journal_entries[0].lines.pop(); }, /JE-001.*two/i],
  ['invalid status', l => { l.journal_entries[0].status = 'deleted'; }, /JE-001.*status/i],
  ['invalid accounting date', l => { l.journal_entries[0].date = '2026-02-29'; }, /JE-001.*date/i],
];
for (const [name, mutate, expectedMessage] of invalidCases) {
  test('rejects ' + name + ' with identifying context', () => {
    const ledger = structuredClone(source);
    mutate(ledger);
    assert.throws(() => validateLedger(ledger), expectedMessage);
  });
}

test('rejects a malformed ledger structure with a useful error', () => {
  for (const ledger of [null, {}, { ...source, accounts: null }, { ...source, journal_entries: null }]) {
    assert.throws(() => validateLedger(ledger), /ledger/i);
  }
});

test('rejects invalid JSON syntax before interpreting accounting data', () => {
  assert.throws(() => loadLedger(new URL('./fixtures/malformed-ledger.txt', import.meta.url)), SyntaxError);
});

for (const status of ['draft', 'void']) {
  test('validates malformed ' + status + ' entries even though they do not count in reports', () => {
    const ledger = structuredClone(source);
    ledger.journal_entries[0].status = status;
    ledger.journal_entries[0].lines[0].debit = '5000.001';
    assert.throws(() => validateLedger(ledger), /JE-001.*amount/i);
  });
}
