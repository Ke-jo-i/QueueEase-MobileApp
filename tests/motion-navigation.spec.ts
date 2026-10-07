import { test, expect, login } from './fixtures';
import { type Page } from '@playwright/test';

async function motionFrames(page: Page, testId: string, action: () => Promise<unknown>) {
  const frames = page.evaluate(testId => new Promise<{ x: number; y: number }[]>(resolve => {
    const points: { x: number; y: number }[] = [];
    const start = performance.now();
    let finish = Infinity;
    const done = () => { finish = performance.now() + 700; };
    document.addEventListener('motion-action-finished', done, { once: true });
    function sample(now: number) {
      const rect = document.querySelector(`[data-testid="${testId}"]`)?.getBoundingClientRect();
      if (rect?.height) points.push({ x: Math.round(rect.x), y: Math.round(rect.y) });
      if (now < finish && now - start < 6000) requestAnimationFrame(sample);
      else { document.removeEventListener('motion-action-finished', done); resolve(points); }
    }
    requestAnimationFrame(sample);
  }), testId);
  await action();
  await page.evaluate(() => document.dispatchEvent(new Event('motion-action-finished')));
  return frames;
}

test('tabs travel sideways and detail Back reverses vertically after booking', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page);
  const service = page.getByRole('button', { name: 'Academic Records Request', exact: true });
  const serviceLeft = (await service.boundingBox())?.x;
  const right = await motionFrames(page, 'student-tickets', () => page.getByRole('tab', { name: 'Tickets', exact: true }).click());
  expect(right.some(frame => frame.x > 5)).toBeTruthy();
  expect(right.at(-1)).toEqual({ x: 0, y: 0 });
  const left = await motionFrames(page, 'student-home', () => page.getByRole('tab', { name: 'Home', exact: true }).click());
  expect(left.some(frame => frame.x < -5)).toBeTruthy();
  expect(left.at(-1)).toEqual({ x: 0, y: 0 });
  expect((await service.boundingBox())?.x).toBe(serviceLeft);
  await service.click();
  const booking = await motionFrames(page, 'student-tickets', () => page.getByRole('button', { name: 'Get Queue Number', exact: true }).click());
  expect(booking.some(frame => frame.y > 5)).toBeTruthy();
  expect(booking.at(-1)).toEqual({ x: 0, y: 0 });
  const up = await motionFrames(page, 'live-queue', () => page.getByTestId('student-tickets').getByLabel('View queue progress', { exact: true }).click());
  expect(up.some(frame => frame.y > 5)).toBeTruthy();
  expect(up.every(frame => frame.y >= 0)).toBeTruthy();
  expect(up.at(-1)).toEqual({ x: 0, y: 0 });
  const down = await motionFrames(page, 'live-queue', () => page.getByLabel('Back', { exact: true }).click());
  expect(down.some(frame => frame.y > 5)).toBeTruthy();
  expect(down.filter(frame => frame.y < 0)).toEqual([]);
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  await page.getByTestId('student-tickets').getByLabel('View queue progress', { exact: true }).click();
  await expect.poll(async () => Math.round((await page.getByTestId('live-queue').boundingBox())?.y ?? -1)).toBe(0);
  const browserBack = await motionFrames(page, 'live-queue', () => page.goBack());
  expect(browserBack.some(frame => frame.y > 5)).toBeTruthy();
  expect(browserBack.every(frame => frame.y >= 0)).toBeTruthy();
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`ticket slides up, closes and restores the ticket with motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await login(page);
    await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
    await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
    const open = page.getByRole('button', { name: 'View QR Ticket', exact: true });
    await open.click();
    await expect(page.getByText(/Scanning does not skip the line/)).toBeVisible();
    await expect.poll(async () => Math.round((await page.getByTestId('ticket-overlay').boundingBox())?.y ?? -1)).toBe(0);
    await page.getByLabel('Close ticket').click();
    await expect(page.getByTestId('ticket-overlay')).toHaveCount(0);
    await expect(open).toBeVisible();
    await open.click();
    await expect(page.getByLabel('Close ticket')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('ticket-overlay')).toHaveCount(0);
    await expect(open).toBeVisible();
    await page.getByRole('tab', { name: 'Alerts', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Alerts', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
}

test('service Back restores Home and booking removes the service from Back history', async ({ page }) => {
  await login(page);
  const service = page.getByRole('button', { name: 'Academic Records Request', exact: true });
  await service.click();
  await page.getByLabel('Back', { exact: true }).click();
  await expect(page).toHaveURL(/\/home$/);
  await service.click();
  await page.goBack();
  await expect(page).toHaveURL(/\/home$/);
  await service.click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByRole('tab', { name: 'Tickets', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Confirm Service', { exact: true })).not.toBeVisible();
  await expect(page).not.toHaveURL(/\/confirm-service/);
});

test('signed-out staff links return to portal selection', async ({ page }) => {
  for (const route of ['/staff/history', '/staff/scan']) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/landing$/);
    await expect(page.getByRole('button', { name: /Student Portal/ })).toBeVisible();
    await expect(page.getByText('Queue History', { exact: true })).not.toBeVisible();
    await expect(page.getByLabel('Ticket number or QR text', { exact: true })).not.toBeVisible();
  }
});

test('staff tabs preserve history search and filters when returning from Profile', async ({ page }) => {
  await login(page, 'staff');
  await page.getByText('History', { exact: true }).click();
  await page.getByLabel('Search ticket number or student ID').fill('R - 42');
  await page.getByRole('button', { name: /Filters/ }).click();
  await page.getByText('Today', { exact: true }).click();
  await page.getByText('Profile', { exact: true }).click();
  await expect(page.getByText('Profile & Settings', { exact: true })).toBeVisible();
  await page.getByText('History', { exact: true }).click();
  await expect(page.getByLabel('Search ticket number or student ID')).toHaveValue('R - 42');
  await expect(page.getByRole('button', { name: /Filters/ })).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('Today', { exact: true })).toBeVisible();
});

test('rapidly toggling profile panels keeps their final state usable', async ({ page }) => {
  await login(page);
  await page.getByRole('tab', { name: /Profile/ }).click();
  const toggle = page.getByRole('button', { name: 'Change Password', exact: true });
  await toggle.click();
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
  await toggle.click();
  await toggle.click();
  await expect(page.getByLabel('Current password', { exact: true })).toBeVisible();
  await page.getByLabel('Current password', { exact: true }).fill('test-password');
  await toggle.click();
  await expect(page.getByLabel('Current password', { exact: true })).toHaveCount(0);
  await toggle.click();
  await expect(page.getByLabel('Current password', { exact: true })).toHaveValue('test-password');
});
