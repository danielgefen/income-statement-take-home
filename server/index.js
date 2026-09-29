import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { loadLedger } from './ledger.js';

try {
  const ledger = loadLedger(new URL('../ledger.json', import.meta.url));
  const frontendDirectory = fileURLToPath(new URL('../dist/', import.meta.url));
  const port = process.env.PORT ?? 3000;
  const server = createApp(ledger, { frontendDirectory }).listen(port, '127.0.0.1');
  server.on('listening', () => {
    console.log(`Income statement: http://127.0.0.1:${server.address().port}`);
  });
  server.on('error', error => {
    console.error('Unable to start server:', error.message);
    process.exitCode = 1;
  });
} catch (error) {
  console.error('Unable to load ledger:', error.message);
  process.exitCode = 1;
}
