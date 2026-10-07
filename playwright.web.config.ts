import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';

process.env.QUEUE_WEB_DIR = resolve(process.env.QUEUE_WEB_DIR ?? 'dist');
process.env.QUEUE_DEMO_LOGIN = '0';

export default defineConfig({
  testDir: './tests',
  testMatch: 'web-release.spec.ts',
  outputDir: '.local/test-results/web',
  workers: 1,
  timeout: 60_000,
  use: {
    viewport: { width: 1440, height: 900 },
    channel: process.env.PLAYWRIGHT_CHANNEL,
    trace: 'retain-on-failure',
  },
});
