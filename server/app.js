import express from 'express';
import { InvalidDateRangeError } from './dates.js';
import { calculateIncomeStatement, serializeStatement } from './statement.js';
import { InvalidCurrencyError } from './currency.js';

export function createApp(ledger, { frontendDirectory } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/income-statement', (request, response) => {
    try {
      // Inspect the raw query: Express truncates parsed parameters after its limit.
      const query = new URL(request.originalUrl, 'http://localhost').searchParams;
      const start = query.getAll('start');
      const end = query.getAll('end');
      const currencies = query.getAll('currency');
      if (currencies.length > 1) throw new InvalidCurrencyError('Supply currency only once.');
      const statement = calculateIncomeStatement(ledger, {
        start: start.length === 1 ? start[0] : undefined,
        end: end.length === 1 ? end[0] : undefined,
        currency: currencies.length === 0 ? ledger.currency : currencies[0],
      });
      response.json(serializeStatement(statement));
    } catch (error) {
      if (error instanceof InvalidCurrencyError) {
        return response.status(400).json({ error: { code: 'INVALID_CURRENCY', message: error.message } });
      }
      if (error instanceof InvalidDateRangeError) {
        return response.status(400).json({ error: { code: 'INVALID_DATE_RANGE', message: error.message } });
      }
      console.error('Income statement failed:', error);
      response.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Unable to generate the income statement.' } });
    }
  });
  if (frontendDirectory) app.use(express.static(frontendDirectory));
  return app;
}
