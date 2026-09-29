export function parseLedgerAmount(value) {
  if (typeof value !== 'string' || value.trim() !== value || !/^\d+\.\d{2}$/.test(value)) {
    throw new TypeError('Ledger amounts must be nonnegative strings with exactly two decimal places.');
  }
  // Keep the original digits: converting through Number would lose precision.
  return BigInt(value.replace('.', ''));
}

export function centsToDecimal(cents) {
  if (typeof cents !== 'bigint') throw new TypeError('Expected BigInt cents.');
  const magnitude = cents < 0n ? -cents : cents;
  const dollars = (magnitude / 100n).toString();
  const fraction = (magnitude % 100n).toString().padStart(2, '0');
  return (cents < 0n ? '-' : '') + dollars + '.' + fraction;
}

export function formatAmount(decimal) {
  if (typeof decimal !== 'string' || decimal.trim() !== decimal || !/^-?\d+\.\d{2}$/.test(decimal)) {
    throw new TypeError('Display amounts must be exact decimal strings.');
  }
  const [whole, fraction] = decimal.replace(/^-/, '').split('.');
  const dollars = whole.replace(/^0+(?=\d)/, '');
  const formatted = dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + fraction;
  const isZero = dollars === '0' && fraction === '00';
  return decimal.startsWith('-') && !isZero ? '(' + formatted + ')' : formatted;
}
