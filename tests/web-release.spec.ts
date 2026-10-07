import { test, expect, password } from './fixtures';
import { type Page } from '@playwright/test';

test.skip(!process.env.QUEUE_WEB_DIR, 'Run against the exported website with QUEUE_WEB_DIR=dist.');

async function signIn(page: Page, origin: string, role: 'student' | 'staff' | 'admin') {
  await page.goto(`${origin}/landing`);
  await page.getByText(role === 'student' ? 'Student Portal' : 'Staff Portal', { exact: true }).click();
  await expect(page.getByRole('button', { name: /Quick login as/ })).toHaveCount(0);
  await page.getByLabel(role === 'student' ? 'Student ID or email' : 'Staff ID or email', { exact: true }).fill(role === 'admin' ? 'admin' : `${role}1`);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: role === 'student' ? 'Log In' : 'LOG IN AS STAFF', exact: true }).click();
}

test('exported website supports desktop and phone browsers with a shared queue and no quick-login controls', async ({ page, browser, apiUrl }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, apiUrl, 'student');
  await expect(page).toHaveTitle('Queue Ease · Registrar');
  await expect(page.getByText('Registrar Services', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/web-student-desktop.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  const staffContext = await browser.newContext({ viewport: { width: 360, height: 740 } });
  try {
    const staff = await staffContext.newPage();
    staff.on('dialog', dialog => dialog.accept());
    await signIn(staff, apiUrl, 'staff');
    await staff.getByRole('button', { name: 'Call Next', exact: true }).click();
    await staff.getByRole('button', { name: 'Scan / verify ticket', exact: true }).click();
    await expect(staff.getByRole('button', { name: 'Scan QR ticket', exact: true })).toHaveCount(0);
    await staff.getByLabel('Ticket number or QR text', { exact: true }).fill('R - 1');
    await staff.getByRole('button', { name: 'Confirm arrival', exact: true }).click();
    await expect(staff.getByText(/Arrival confirmed and recorded/)).toBeVisible();
    await staff.getByRole('button', { name: 'Back to queue', exact: true }).click();
    await staff.getByRole('button', { name: 'Mark as Done', exact: true }).click();
    await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true })).toBeVisible({ timeout: 10000 });
    await page.reload();
    await expect(page.getByText('Student Portal', { exact: true })).toBeVisible();
    await signIn(page, apiUrl, 'admin');
    await expect(page.getByText('Administration', { exact: true })).toBeVisible();
    await page.screenshot({ path: '.local/screenshots/web-desktop.png', fullPage: true, animations: 'disabled' });
  } finally { await staffContext.close(); }
});
