import { defineConfig } from '@playwright/test';

// A fresh built app, separate from the candidate's running preview on port 3000.
export default defineConfig({
  testDir: './tests/browser',
  forbidOnly: true,
  workers: 1,
  retries: 0,
  timeout: 20_000,
  expect: { timeout: 5_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4178',
    browserName: 'chromium',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1280, height: 900 } } },
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run build && npm start',
    env: { PORT: '4178' },
    url: 'http://127.0.0.1:4178',
    reuseExistingServer: false,
    timeout: 30_000,
    gracefulShutdown: { signal: 'SIGTERM', timeout: 5_000 },
  },
});
