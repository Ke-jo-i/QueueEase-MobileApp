import { test, expect, login, password } from './fixtures';

test('a completed ticket closes its preview and a later booking waits for View QR Ticket', async ({ page, apiUrl }) => {
  await login(page);
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await page.getByRole('button', { name: 'View QR Ticket', exact: true }).click();
  await expect(page.getByTestId('ticket-overlay').getByText('R - 1', { exact: true })).toBeVisible();
  const staff = await page.request.post(`${apiUrl}/auth/login`, { data: { portal: 'staff', login: 'staff1', password } });
  expect(staff.ok()).toBeTruthy();
  const { token } = await staff.json();
  const exitFrames = page.evaluate(() => new Promise<boolean[]>(resolve => {
    const frames: boolean[] = [];
    const start = performance.now();
    function sample(now: number) {
      const overlay = document.querySelector('[data-testid="ticket-overlay"]');
      if (overlay) frames.push(!!overlay.textContent?.includes('R - 1'));
      if (!overlay || now - start > 6000) resolve(frames);
      else requestAnimationFrame(sample);
    }
    requestAnimationFrame(sample);
  }));
  for (const command of [{ type: 'CALL_NEXT' }, { type: 'ACT', action: 'COMPLETED', expectedTicketId: 'ticket-1' }]) {
    const response = await page.request.post(`${apiUrl}/queue/command`, { headers: { Authorization: `Bearer ${token}`, 'X-Request-ID': `overlay-${command.type}` }, data: command });
    expect(response.ok()).toBeTruthy();
  }
  await expect(page.getByTestId('ticket-overlay')).toHaveCount(0, { timeout: 10000 });
  const frames = await exitFrames;
  expect(frames.length).toBeGreaterThan(1);
  expect(frames.every(Boolean)).toBeTruthy();
  await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  await expect(page.getByTestId('ticket-overlay')).toHaveCount(0);
  await page.getByRole('button', { name: 'View QR Ticket', exact: true }).click();
  await expect(page.getByTestId('ticket-overlay').getByText('R - 2', { exact: true })).toBeVisible();
});

test('staff calling a ticket dismisses an unfinished cancellation without hiding its updated preview', async ({ page, apiUrl }) => {
  await login(page);
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await page.getByRole('button', { name: 'View QR Ticket', exact: true }).click();
  await page.getByText('Cancel Queue Ticket', { exact: true }).click();
  await page.getByPlaceholder('Reason for cancellation').fill('Changed plans');
  const staff = await page.request.post(`${apiUrl}/auth/login`, { data: { portal: 'staff', login: 'staff1', password } });
  expect(staff.ok()).toBeTruthy();
  const { token } = await staff.json();
  const response = await page.request.post(`${apiUrl}/queue/command`, { headers: { Authorization: `Bearer ${token}`, 'X-Request-ID': 'overlay-call-next' }, data: { type: 'CALL_NEXT' } });
  expect(response.ok()).toBeTruthy();
  await expect(page.getByRole('button', { name: 'Yes, Cancel Ticket', exact: true })).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByTestId('ticket-overlay').getByText('Your turn', { exact: true })).toBeVisible();
  for (const command of [{ type: 'ACT', action: 'HELD', expectedTicketId: 'ticket-1', reason: 'Missing documents' }, { type: 'REOPEN', number: 'R - 1' }]) {
    const update = await page.request.post(`${apiUrl}/queue/command`, { headers: { Authorization: `Bearer ${token}`, 'X-Request-ID': `overlay-${command.type}` }, data: command });
    expect(update.ok()).toBeTruthy();
  }
  await expect(page.getByTestId('ticket-overlay').getByText('Waiting in line', { exact: true })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole('button', { name: 'Yes, Cancel Ticket', exact: true })).toHaveCount(0);
  await page.getByLabel('Close ticket', { exact: true }).click();
  await expect(page.getByTestId('ticket-overlay')).toHaveCount(0);
});
