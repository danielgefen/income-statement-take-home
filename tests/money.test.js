import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLedgerAmount, centsToDecimal, formatAmount } from '../shared/money.js';

test('adds fractional dollar amounts without rounding', () => {
  assert.equal(parseLedgerAmount('0.10') + parseLedgerAmount('0.20'), 30n);
});

test('parses every cent, including values beyond Number precision', () => {
  for (const [input, expected] of [
    ['0.00', 0n], ['0.01', 1n], ['12450.75', 1245075n],
    ['0001.20', 120n], ['90071992547409.93', 9007199254740993n],
  ]) assert.equal(parseLedgerAmount(input), expected);
});

test('rejects malformed or signed ledger amounts instead of rounding', () => {
  for (const value of ['1.005', '1.2', '1', '-1.00', '+1.00', '.50', '1e2', ' 1.00', '1.00\n', '1,000.00', '', 1.25, null, undefined, ['1.00']]) {
    assert.throws(() => parseLedgerAmount(value), TypeError, String(value));
  }
});

test('serializes signed cents with exactly two decimals', () => {
  for (const [input, expected] of [
    [0n, '0.00'], [1n, '0.01'], [-1n, '-0.01'], [-65025n, '-650.25'],
    [1245075n, '12450.75'], [9007199254740993n, '90071992547409.93'],
  ]) assert.equal(centsToDecimal(input), expected);
  assert.throws(() => centsToDecimal(123), TypeError);
});

test('formats exact amounts with accounting parentheses and separators', () => {
  for (const [input, expected] of [
    ['0.00', '0.00'], ['-0.00', '0.00'], ['-0.01', '(0.01)'],
    ['12450.75', '12,450.75'], ['-650.25', '(650.25)'],
    ['-90071992547409.93', '(90,071,992,547,409.93)'],
    ['0001.20', '1.20'],
  ]) assert.equal(formatAmount(input), expected);
});

test('rejects invalid display amounts instead of presenting a misleading number', () => {
  for (const value of ['1.005', '', 'NaN', '1.00\n', 123, null]) {
    assert.throws(() => formatAmount(value), TypeError);
  }
});
