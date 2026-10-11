import { expect, login, password, test } from './fixtures';

test('another concern shows the existing ticket and later bookings retain completed history', async ({ page, apiUrl }) => {
  await login(page);
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Certificate of Grades', exact: true }).click();
  await expect(page.getByText('One active ticket at a time.', { exact: true })).toBeVisible();
  const confirmation = page.getByText('One active ticket at a time.', { exact: true }).locator('..').locator('..');
  await expect(confirmation.getByText('R - 1', { exact: true })).toBeVisible();
  await expect(confirmation.getByText('Academic Records Request', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Get Queue Number', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'View active ticket', exact: true }).click();
  await expect(page.getByTestId('student-tickets').getByText('R - 1', { exact: true }).filter({ visible: true })).toBeVisible();
  const staffResponse = await page.request.post(`${apiUrl}/auth/login`, { data: { portal: 'staff', login: 'staff1', password } });
  expect(staffResponse.ok()).toBeTruthy();
  const staff = await staffResponse.json();
  for (const command of [{ type: 'CALL_NEXT' }, { type: 'ACT', action: 'COMPLETED', expectedTicketId: 'ticket-1' }]) {
    const result = await page.request.post(`${apiUrl}/queue/command`, { headers: { Authorization: `Bearer ${staff.token}`, 'X-Request-ID': `retain-${command.type}` }, data: command });
    expect(result.ok()).toBeTruthy();
  }
  await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true }).filter({ visible: true })).toBeVisible({ timeout: 10000 });
  await page.getByRole('tab', { name: 'Home', exact: true }).click();
  await page.getByRole('button', { name: 'Certificate of Grades', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  const tickets = page.getByTestId('student-tickets');
  await expect(tickets.getByText('R - 2', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(tickets.getByText('R - 1', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(tickets.getByText('COMPLETED', { exact: true }).filter({ visible: true })).toBeVisible();
});
