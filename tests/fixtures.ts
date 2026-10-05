import { test as base, expect, type BrowserContext, type Page } from '@playwright/test';
import { spawn } from 'node:child_process';

export const password = 'e2e-test-password-123';
export const test = base.extend<{ apiUrl: string; connect: (context: BrowserContext) => Promise<void> }>({
  apiUrl: async ({}, use) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server/e2e.ts'], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    let logs = '';
    const port = await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Test server startup timed out: ${logs}`)), 20000);
      child.stdout.on('data', (chunk) => { logs += chunk.toString(); const match = logs.match(/TEST_PORT=(\d+)/); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
      child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
      child.on('error', reject); child.on('exit', (code) => { clearTimeout(timer); if (code) reject(new Error(logs)); });
    });
    try { await use(`http://127.0.0.1:${port}`); }
    finally { child.stdin.end(); await new Promise<void>((resolve) => child.once('exit', () => resolve())); }
  },
  connect: async ({ apiUrl }, use) => {
    await use(async (context) => {
      await context.route('**/localhost:4100/**', async (route) => {
        const url = route.request().url().replace('http://localhost:4100', apiUrl);
        const response = await route.fetch({ url, headers: { ...route.request().headers(), origin: new URL(apiUrl).origin } });
        await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': route.request().headers().origin ?? '*' } });
      });
    });
  },
  page: async ({ page, connect }, use) => { await connect(page.context()); await use(page); },
});
export async function login(page: Page, role: 'student' | 'staff' | 'admin' = 'student') {
  await page.goto('/landing');
  await page.getByText(role === 'student' ? 'Student Portal' : 'Staff Portal', { exact: true }).click();
  await page.getByLabel(role === 'student' ? 'Student ID or email' : 'Staff ID or email', { exact: true }).fill(role === 'admin' ? 'admin' : `${role}1`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: role === 'student' ? 'Log In' : 'LOG IN AS STAFF', exact: true }).click();
  await expect(page.getByText(role === 'student' ? 'Registrar Services' : role === 'admin' ? 'Administration' : 'CURRENTLY SERVING', { exact: true })).toBeVisible();
}
export { expect };
