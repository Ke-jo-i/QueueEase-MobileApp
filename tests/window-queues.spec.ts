import { test, expect, login, password } from './fixtures';

test('students see every window and their own place updates when another device completes a ticket', async ({ page, request, apiUrl, browser, connect }) => {
  for (const [index, service] of ['Academic Records Request', 'Certificate of Grades'].entries()) {
    const login = `queued-student-${index}`;
    const registration = await request.post(`${apiUrl}/auth/register`, { data: { login, name: `Queued Student ${index}`, email: `${login}@example.test`, password } });
    expect(registration.ok()).toBeTruthy();
    const session = await request.post(`${apiUrl}/auth/login`, { data: { login, password, portal: 'student' } });
    expect(session.ok()).toBeTruthy();
    const { token } = await session.json();
    const booking = await request.post(`${apiUrl}/queue/command`, { data: { type: 'BOOK', service }, headers: { authorization: `Bearer ${token}`, 'x-request-id': `seed-ticket-${index}` } });
    expect(booking.ok()).toBeTruthy();
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page);
  await page.getByRole('button', { name: 'View all window queues', exact: true }).click();
  const window1 = page.getByTestId('queue-window-1');
  const window2 = page.getByTestId('queue-window-2');
  await expect(window1.getByText('Next waiting: R - 1', { exact: true })).toBeVisible();
  await expect(window2.getByText('Next waiting: R - 2', { exact: true })).toBeVisible();
  await expect(page.getByTestId('queue-window-4').getByText('No tickets waiting', { exact: true })).toBeVisible();
  await expect(page.getByTestId('window-queues')).not.toContainText('Queued Student');
  await page.getByLabel('Back', { exact: true }).click();
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await page.getByTestId('student-tickets').getByLabel('View queue progress', { exact: true }).click();
  const progress = page.getByTestId('live-queue').getByText('PEOPLE AHEAD', { exact: true }).locator('..');
  await expect(progress.getByText('1', { exact: true })).toBeVisible();
  await expect(window1.getByText('YOUR WINDOW', { exact: true })).toBeVisible();
  await expect(window1.getByText('2', { exact: true })).toBeVisible();
  const staffContext = await browser.newContext();
  await connect(staffContext);
  try {
    const staff = await staffContext.newPage();
    staff.on('dialog', dialog => dialog.accept());
    await login(staff, 'staff');
    await staff.getByRole('button', { name: 'Call Next', exact: true }).click();
    await expect(window1.getByText('R - 1', { exact: true })).toBeVisible();
    await expect(window1.getByText('Next waiting: R - 3', { exact: true })).toBeVisible();
    await expect(progress.getByText('1', { exact: true })).toBeVisible();
    await staff.getByRole('button', { name: 'Mark as Done', exact: true }).click();
    await expect(progress.getByText('0', { exact: true })).toBeVisible();
    await expect(window1.getByText('R - 1', { exact: true })).not.toBeVisible();
    await expect(window2.getByText('Next waiting: R - 2', { exact: true })).toBeVisible();
    await page.getByTestId('window-queues').scrollIntoViewIfNeeded();
    await page.screenshot({ path: '.local/screenshots/window-queues.png', fullPage: true, animations: 'disabled' });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  } finally {
    await staffContext.close();
  }
});
