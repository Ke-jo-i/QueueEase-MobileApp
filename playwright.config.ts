import { defineConfig } from '@playwright/test';

const port = Number(process.env.PLAYWRIGHT_PORT ?? 8081);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PLAYWRIGHT_PORT must be a valid port number');

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/native/**',
  workers: 1,
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 390, height: 844 },
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run web -- --port ${port} --max-workers 2`,
    url: `http://localhost:${port}/status`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
