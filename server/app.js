import express from 'express';
import { InvalidDateRangeError } from './dates.js';
import { calculateIncomeStatement, serializeStatement } from './statement.js';

export function createApp(ledger, { frontendDirectory } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.get('/income-statement', (request, response) => {
    try {
      const statement = calculateIncomeStatement(ledger, { start: request.query.start, end: request.query.end });
      response.json(serializeStatement(statement));
    } catch (error) {
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
