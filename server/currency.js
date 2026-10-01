import { parseLedgerAmount } from '../shared/money.js';

// Demonstration rates only: units of target currency per 1 USD.
const rates = new Map([['USD', '1.00'], ['EUR', '0.90'], ['GBP', '0.80']]);

export class InvalidCurrencyError extends Error {}

export function exchangeRate(source, target) {
  if (target === source) return null;
  if (!rates.has(target)) throw new InvalidCurrencyError('Currency must be USD, EUR, or GBP.');
  if (source !== 'USD') throw new InvalidCurrencyError('Demonstration conversion requires a USD ledger.');
  return { source, target, rate: rates.get(target) };
}

export function convertCents(cents, rate) {
  const scaled = cents * parseLedgerAmount(rate);
  const magnitude = scaled < 0n ? -scaled : scaled;
  // Two-decimal rates; round ties away from zero, using integers only.
  const rounded = (magnitude + 50n) / 100n;
  return scaled < 0n ? -rounded : rounded;
}
