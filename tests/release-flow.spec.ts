import { test, expect, login, password } from './fixtures';
import { mkdirSync } from 'node:fs';

test.beforeAll(() => mkdirSync('.local/screenshots', { recursive: true }));

test('real registration rejects mismatched passwords and creates a usable account', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('Full name', { exact: true }).fill('New Student');
  await page.getByLabel('Student ID', { exact: true }).fill('2026-00222');
  await page.getByLabel('Email', { exact: true }).fill('new@example.test');
  await page.getByLabel('Password (at least 10 characters)', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill('mismatch');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByText('Passwords do not match.')).toBeVisible();
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await page.getByRole('button', { name: 'Go to Log In' }).click();
  await page.getByLabel('Student ID or email', { exact: true }).fill('2026-00222');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByText('Good day, New.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Academic Records Request', exact: true })).toBeEnabled();
});

test('wrong credentials fail and logout prevents back navigation into either portal', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  await page.getByLabel('Password', { exact: true }).fill('wrong');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByText('Incorrect ID or password, or account unavailable.')).toBeVisible();
  for (const role of ['student', 'staff'] as const) {
    await login(page, role);
    if (role === 'student') await page.getByRole('tab', { name: /Profile/ }).click();
    else await page.getByText('Profile', { exact: true }).click();
    await page.getByRole('button', { name: 'Log Out', exact: true }).click();
    await expect(page.getByText('Student Portal', { exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByText('CURRENTLY SERVING', { exact: true })).not.toBeVisible();
    await expect(page.getByTestId('student-home')).not.toBeVisible();
  }
});

test('separate student and staff devices share call, arrival and completion history', async ({ page, browser, connect }) => {
  const staffContext = await browser.newContext({ viewport: { width: 390, height: 844 } }); await connect(staffContext);
  const staff = await staffContext.newPage(); staff.on('dialog', (dialog) => dialog.accept());
  try {
    await login(page);
    await page.screenshot({ path: '.local/screenshots/student-home.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
    await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
    await expect(page.getByTestId('student-tickets').getByText('R - 1', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'View QR Ticket', exact: true }).click();
    await expect(page.getByText(/Scanning does not skip the line/)).toBeVisible();
    await expect.poll(async () => Math.round((await page.getByTestId('ticket-overlay').boundingBox())?.y ?? -1)).toBe(0);
    await page.screenshot({ path: '.local/screenshots/student-ticket.png', fullPage: true, animations: 'disabled' });
    await page.getByLabel('Close ticket').click();
    await login(staff, 'staff');
    await expect(staff.getByText('View Waiting Queue List (1)', { exact: true })).toBeVisible();
    await staff.getByRole('button', { name: 'CALL NEXT', exact: true }).click();
    await expect(staff.getByText('R - 1', { exact: true })).toBeVisible();
    await staff.screenshot({ path: '.local/screenshots/staff-queue.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('tab', { name: /Alerts/ }).click();
    await expect(page.getByTestId('student-alerts').getByText('Your turn', { exact: true })).toBeVisible({ timeout: 10000 });
    await staff.getByRole('button', { name: 'Scan / verify ticket' }).click();
    await staff.getByLabel('Ticket number or QR text', { exact: true }).fill('R - 2');
    await expect(staff.getByRole('button', { name: 'Confirm arrival' })).toBeDisabled();
    await staff.getByLabel('Ticket number or QR text', { exact: true }).fill('queueease:v1:ticket-1');
    await staff.getByRole('button', { name: 'Confirm arrival' }).click();
    await expect(staff.getByText(/Arrival confirmed and recorded/)).toBeVisible();
    await staff.getByRole('button', { name: 'Back to queue' }).click();
    await staff.getByRole('button', { name: 'MARK AS DONE', exact: true }).click();
    await expect(staff.getByText('NO QUEUE', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole('tab', { name: /Tickets/ }).click();
    await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true }).filter({ visible: true }).first()).toBeVisible({ timeout: 10000 });
    await staff.getByText('History', { exact: true }).click();
    await expect(staff.getByText('R - 1', { exact: true })).toBeVisible();
    await page.reload(); await login(page);
    await page.getByRole('tab', { name: /Tickets/ }).click();
    await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  } finally { await staffContext.close(); }
});

test('administrator pauses bookings and creates staff accounts', async ({ page }) => {
  await login(page, 'admin');
  await page.screenshot({ path: '.local/screenshots/administrator.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: 'Pause new tickets', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Open queue', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Create staff account', exact: true }).click();
  await page.getByLabel('Staff name', { exact: true }).fill('Second Staff'); await page.getByLabel('Staff ID', { exact: true }).fill('staff2');
  await page.getByLabel('Staff email', { exact: true }).fill('staff2@example.test'); await page.getByLabel('Initial password (at least 10 characters)', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save staff account' }).click();
  await expect(page.getByRole('button', { name: 'Accounts (4)' })).toBeVisible();
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await login(page);
  await expect(page.getByText(/New tickets are paused. Existing tickets/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Academic Records Request', exact: true })).toBeDisabled();
});

test('connection loss preserves a ticket and cancellation is saved after reconnecting', async ({ page }) => {
  await login(page);
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
  await expect(page.getByRole('button', { name: 'View QR Ticket', exact: true })).toBeVisible();
  const disconnect = '**/localhost:4100/queue';
  await page.route(disconnect, (route) => route.abort('connectionrefused'));
  await expect(page.getByText(/Connection lost. Showing the last update/)).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('student-tickets').getByText('R - 1', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.unroute(disconnect);
  await page.getByRole('button', { name: 'Refresh connection' }).click();
  await expect(page.getByText(/Connection lost. Showing the last update/)).not.toBeVisible();
  await page.getByRole('button', { name: 'View QR Ticket', exact: true }).click();
  await page.getByText('Cancel Queue Ticket', { exact: true }).click();
  await page.getByPlaceholder('Reason for cancellation').fill('No longer needed');
  await page.getByRole('button', { name: 'Yes, Cancel Ticket' }).click();
  await expect(page.getByTestId('student-tickets').getByText('CANCELLED', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('themes persist, profile uses account data, and filters fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page, 'staff');
  await page.getByText('Profile', { exact: true }).click();
  await expect(page.getByText('staff Test', { exact: true })).toBeVisible();
  await page.getByRole('switch', { name: 'Dark mode' }).check();
  await page.getByRole('button', { name: 'Color Theme' }).click();
  await page.getByRole('radio', { name: 'Sage theme' }).click();
  await page.getByText('History', { exact: true }).click();
  const search = page.getByLabel('Search ticket number or student ID');
  await search.fill('R - 1');
  await expect(page.getByText('All Dates', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: /Filters/ }).click();
  await expect(page.getByText('All Dates', { exact: true })).toBeVisible();
  await page.screenshot({ path: '.local/screenshots/history-filters.png', fullPage: true, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.reload(); await login(page, 'staff'); await page.getByText('Profile', { exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
  await expect(page.getByText('Sage', { exact: true })).toBeVisible();
});
