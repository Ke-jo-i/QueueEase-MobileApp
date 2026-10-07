import { test, expect, login, password } from './fixtures';
import { type APIRequestContext } from '@playwright/test';
import { mkdirSync } from 'node:fs';

async function studentSession(request: APIRequestContext, apiUrl: string) {
  const response = await request.post(`${apiUrl}/auth/login`, { data: { portal: 'student', login: 'student1', password } });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).token as string;
}

async function book(request: APIRequestContext, apiUrl: string, token: string, sequence = 1) {
  const response = await request.post(`${apiUrl}/queue/command`, {
    headers: { Authorization: `Bearer ${token}`, 'X-Request-ID': `staff-actions-book-${sequence}` },
    data: { type: 'BOOK', service: 'Academic Records Request' },
  });
  expect(response.ok()).toBeTruthy();
}

for (const item of [
  { label: 'Hold ticket', status: 'HELD', reason: 'Student gathering documents' },
  { label: 'Skip ticket', status: 'SKIPPED', reason: 'Student not present' },
  { label: 'Mark no-show', status: 'NO_SHOW', reason: null },
  { label: 'Transfer ticket', status: 'WAITING', reason: null },
] as const) {
  test(`More actions confirms ${item.label.toLowerCase()} and saves the queue change`, async ({ page, request, apiUrl }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await login(page, 'staff');
    await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'More actions', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Recall', exact: true })).toHaveCount(0);
    if (item.status === 'HELD') {
      mkdirSync('.local/screenshots', { recursive: true });
      await page.getByRole('button', { name: 'Profile', exact: true }).click();
      await page.getByRole('switch', { name: 'Dark mode', exact: true }).click();
      await page.getByRole('button', { name: 'Queue', exact: true }).click();
      await expect.poll(async () => Math.round((await page.getByTestId('staff-dashboard').boundingBox())?.x ?? -1)).toBe(0);
      await page.screenshot({ path: '.local/screenshots/staff-idle-dark.png', animations: 'disabled' });
    }
    const token = await studentSession(request, apiUrl);
    await book(request, apiUrl, token);
    await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeEnabled({ timeout: 10000 });
    await page.getByRole('button', { name: 'Call Next', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mark as Done', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Recall', exact: true })).toBeEnabled();
    await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toHaveCount(0);
    if (item.status === 'HELD') await page.screenshot({ path: '.local/screenshots/staff-serving-dark.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ticket actions', exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toBeVisible();
    if (item.status === 'HELD') await page.screenshot({ path: '.local/screenshots/staff-actions-dark.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: 'Ticket actions', exact: true })).toHaveCount(0);
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: item.label, exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ticket actions', exact: true })).toHaveCount(0);
    if (item.reason) {
      await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
      await page.getByRole('button', { name: 'Choose a reason', exact: true }).click();
      await page.getByRole('button', { name: item.reason, exact: true }).click();
    }
    if (item.status === 'WAITING') await page.getByRole('button', { name: 'Window 2 - Registrar', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.getByText('No active ticket', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeDisabled();
    const saved = await request.get(`${apiUrl}/queue`, { headers: { Authorization: `Bearer ${token}` } });
    expect(saved.ok()).toBeTruthy();
    const ticket = (await saved.json()).tickets[0];
    expect(ticket.status).toBe(item.status);
    expect(ticket.window).toBe(item.status === 'WAITING' ? 'Window 2 - Registrar' : 'Window 1 - Registrar');
    if (item.reason) expect(ticket.reason).toBe(item.reason);
  });
}

test('a ticket changing on another device dismisses More actions without reopening it for the next ticket', async ({ page, request, apiUrl }) => {
  const token = await studentSession(request, apiUrl);
  await book(request, apiUrl, token);
  await login(page, 'staff');
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  const session = await request.post(`${apiUrl}/auth/login`, { data: { portal: 'staff', login: 'staff1', password } });
  expect(session.ok()).toBeTruthy();
  const staffToken = (await session.json()).token;
  const completion = await request.post(`${apiUrl}/queue/command`, {
    headers: { Authorization: `Bearer ${staffToken}`, 'X-Request-ID': 'staff-actions-complete' },
    data: { type: 'ACT', action: 'COMPLETED', expectedTicketId: 'ticket-1' },
  });
  expect(completion.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'Ticket actions', exact: true })).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeDisabled();
  await book(request, apiUrl, token, 2);
  await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeEnabled({ timeout: 10000 });
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  await expect(page.getByText('R - 2', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ticket actions', exact: true })).toHaveCount(0);
});
