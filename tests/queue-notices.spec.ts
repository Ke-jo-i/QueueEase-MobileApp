import { mkdirSync } from 'node:fs';
import { test, expect, login, password } from './fixtures';

async function signIn(apiUrl: string, role: 'student' | 'staff' | 'admin', id?: string) {
  const response = await fetch(`${apiUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ portal: role === 'student' ? 'student' : 'staff', login: id ?? (role === 'admin' ? 'admin' : `${role}1`), password }) });
  expect(response.status).toBe(200);
  return (await response.json()).token as string;
}

async function command(apiUrl: string, token: string, body: object, path = '/queue/command') {
  return fetch(`${apiUrl}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify(body) });
}

test('paused intake notifies staff and lets them drain existing tickets before reopening', async ({ page, apiUrl }) => {
  const student = await signIn(apiUrl, 'student');
  expect((await command(apiUrl, student, { type: 'BOOK', service: 'Academic Records Request' })).status).toBe(200);
  const registration = await fetch(`${apiUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'student2', name: 'Second Student', email: 'second@example.test', password }) });
  expect(registration.status).toBe(200);
  const second = await signIn(apiUrl, 'student', 'student2');
  expect((await command(apiUrl, second, { type: 'BOOK', service: 'Academic Records Request' })).status).toBe(200);
  await login(page, 'staff');
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  const admin = await signIn(apiUrl, 'admin');
  expect((await command(apiUrl, admin, { type: 'SET_ACCEPTING', accepting: false }, '/admin')).status).toBe(200);
  const notice = page.getByTestId('staff-queue-paused');
  await expect(notice).toContainText('Continue serving all existing tickets.', { timeout: 10000 });
  for (const number of ['R - 1', 'R - 2']) {
    await expect(page.getByText(number, { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Mark as Done', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Complete transaction', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Complete ticket', exact: true }).click();
    await expect(page.getByText('No active ticket', { exact: true })).toBeVisible();
    if (number === 'R - 1') await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeDisabled();
  await expect(notice).toBeVisible();
  expect((await command(apiUrl, student, { type: 'BOOK', service: 'Academic Records Request' })).status).toBe(409);
  expect((await command(apiUrl, admin, { type: 'SET_ACCEPTING', accepting: true }, '/admin')).status).toBe(200);
  await expect(notice).toHaveCount(0, { timeout: 10000 });
});

test('completion confirmation cancels and cannot follow a ticket changed on another device', async ({ page, apiUrl }) => {
  const student = await signIn(apiUrl, 'student');
  expect((await command(apiUrl, student, { type: 'BOOK', service: 'Academic Records Request' })).status).toBe(200);
  await login(page, 'staff');
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  await page.getByRole('button', { name: 'Mark as Done', exact: true }).click();
  await page.getByRole('button', { name: 'Keep serving', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Complete transaction', exact: true })).toHaveCount(0);
  await expect(page.getByText('R - 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as Done', exact: true }).click();
  const staff = await signIn(apiUrl, 'staff');
  expect((await command(apiUrl, staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: 'ticket-1' })).status).toBe(200);
  expect((await command(apiUrl, student, { type: 'BOOK', service: 'Academic Records Request' })).status).toBe(200);
  expect((await command(apiUrl, staff, { type: 'CALL_NEXT' })).status).toBe(200);
  await expect(page.getByText('R - 2', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Complete ticket', exact: true })).toHaveCount(0);
});

test('turn notices use the app theme and disappear when a ticket ends', async ({ page, apiUrl }) => {
  await page.addInitScript(() => { localStorage.setItem('queueease.color-scheme', 'dark'); localStorage.setItem('queueease.theme', 'lavender'); });
  await login(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Enable turn alerts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Turn alerts: on', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  const heading = page.getByRole('heading', { name: 'You’re next in line', exact: true });
  await expect(heading).toBeVisible({ timeout: 10000 });
  expect(await heading.evaluate(node => getComputedStyle(node).color)).not.toBe('rgb(0, 0, 0)');
  await page.getByRole('button', { name: 'OK', exact: true }).click();
  const staff = await signIn(apiUrl, 'staff');
  expect((await command(apiUrl, staff, { type: 'CALL_NEXT' })).status).toBe(200);
  await expect(page.getByRole('heading', { name: 'Your turn', exact: true })).toBeVisible({ timeout: 10000 });
  mkdirSync('.local/defense/screens', { recursive: true });
  await page.screenshot({ path: '.local/defense/screens/turn-notice.png', animations: 'disabled' });
  expect((await command(apiUrl, staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: 'ticket-1' })).status).toBe(200);
  await expect(page.getByRole('heading', { name: 'Your turn', exact: true })).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toHaveCount(0);
});
