import test from 'node:test';
import assert from 'node:assert/strict';
import { validateDateRange, InvalidDateRangeError } from '../server/dates.js';

test('preserves canonical calendar dates and permits same-day and empty-data periods', () => {
  for (const [start, end] of [
    ['2026-01-01', '2026-03-31'], ['2026-03-31', '2026-03-31'],
    ['0001-01-01', '9999-12-31'], ['2030-01-01', '2030-12-31'],
  ]) assert.deepEqual(validateDateRange(start, end), { start, end });
});

test('accepts real leap days, including the divisible-by-400 exception', () => {
  for (const date of ['2028-02-29', '2000-02-29']) {
    assert.deepEqual(validateDateRange(date, date), { start: date, end: date });
  }
});

test('rejects invalid calendar dates rather than normalizing them into another month', () => {
  for (const date of ['2026-02-29', '1900-02-29', '2026-04-31', '2026-13-01', '2026-00-01', '2026-01-00', '2026-01-32', '0000-01-01']) {
    assert.throws(() => validateDateRange(date, '9999-12-31'), InvalidDateRangeError, date);
    assert.throws(() => validateDateRange('0001-01-01', date), InvalidDateRangeError, date);
  }
});

test('requires exactly one ISO calendar date at each boundary', () => {
  for (const value of [undefined, null, '', '2026-1-01', '01/01/2026', '2026-01-01T00:00:00Z', '2026-01-01\n', ' 2026-01-01', ['2026-01-01'], { date: '2026-01-01' }, 20260101]) {
    assert.throws(() => validateDateRange(value, '2026-03-31'), InvalidDateRangeError);
    assert.throws(() => validateDateRange('2026-01-01', value), InvalidDateRangeError);
  }
});

test('rejects a start date after the end date with an actionable message', () => {
  assert.throws(() => validateDateRange('2026-04-01', '2026-03-31'), error => {
    assert.ok(error instanceof InvalidDateRangeError);
    assert.match(error.message, /start.*before.*end/i);
    return true;
  });
});
