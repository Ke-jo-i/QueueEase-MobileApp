import { test, expect, login, password } from './fixtures';
import type { AdminData } from '../src/data/admin-model';

test('account directory loads bounded pages, searches the database and edits a filtered account', async ({ page, apiUrl }) => {
  for (let i = 0; i < 23; i++) {
    const response = await fetch(`${apiUrl}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: `directory${i}`, email: `directory${i}@example.test`, name: `Directory Person ${i}`, password }) });
    expect(response.status).toBe(200);
  }
  await login(page, 'admin');
  const workspace = await page.request.get(`${apiUrl}/health`);
  expect(workspace.ok()).toBe(true);
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await expect(page.getByText('26 accounts · Page 1 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('26 accounts · Page 2 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(10);
  await page.getByLabel('Search accounts', { exact: true }).fill('directory0@');
  await expect(page.getByText('1 accounts · Page 1 of 1', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(1);
  const row = page.getByTestId('admin-account-directory0');
  await row.getByRole('button', { name: 'Directory Person 0', exact: true }).click();
  await row.getByLabel('Name for directory0', { exact: true }).fill('Updated Directory Person');
  await row.getByRole('button', { name: 'Save details for directory0', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Updated Directory Person', exact: true })).toBeVisible();
  await page.getByLabel('Search accounts', { exact: true }).fill('');
  await page.getByRole('button', { name: 'Account role: All roles', exact: true }).click();
  await page.getByRole('button', { name: 'Account role: select Admin', exact: true }).click();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(1);
  await expect(page.getByTestId('admin-account-admin')).toBeVisible();
});

async function session(apiUrl: string, role: 'student' | 'staff' | 'admin') {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal: role === 'student' ? 'student' : 'staff', login: role === 'admin' ? 'admin' : `${role}1`, password }),
  });
  expect(response.status).toBe(200);
  return response.json() as Promise<{ token: string }>;
}

test('admin creates another administrator, edits staff identity, assigns a free window and resets credentials', async ({ page, browser, connect }) => {
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Create staff account', exact: true }).click();
  await page.getByRole('radio', { name: 'Admin account', exact: true }).click();
  await page.getByLabel('Admin name', { exact: true }).fill('Second Admin');
  await page.getByLabel('Admin ID', { exact: true }).fill('admin2');
  await page.getByLabel('Admin email', { exact: true }).fill('admin2@example.test');
  await page.getByLabel('Initial password (at least 10 characters)', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Save admin account', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Accounts (4)' })).toBeVisible();
  const staff = page.getByTestId('admin-account-staff1');
  await staff.getByRole('button', { name: 'staff Test', exact: true }).click();
  await staff.getByLabel('Name for staff1', { exact: true }).fill('Updated Staff');
  await staff.getByLabel('Email for staff1', { exact: true }).fill('updated.staff@example.test');
  await staff.getByRole('button', { name: 'Save details for staff1', exact: true }).click();
  await expect(staff.getByRole('button', { name: 'Updated Staff', exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Window for staff1: Unassigned', exact: true }).click();
  await staff.getByRole('button', { name: 'Window for staff1: select Window 2', exact: true }).click();
  await expect(staff.getByRole('button', { name: 'Window for staff1: Window 2', exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Reset password for staff1', exact: true }).click();
  await staff.getByLabel('Replacement password for staff1', { exact: true }).fill('new-staff-password-123');
  await staff.getByRole('button', { name: 'Confirm password reset for staff1', exact: true }).click();
  await expect(staff.getByLabel('Replacement password for staff1', { exact: true })).toHaveCount(0);
  const own = page.getByTestId('admin-account-admin');
  await own.getByRole('button', { name: 'admin Test', exact: true }).click();
  await expect(own.getByRole('button', { name: 'Disable admin', exact: true })).toHaveCount(0);
  await expect(own.getByRole('button', { name: 'Reset password for admin', exact: true })).toHaveCount(0);
  const context = await browser.newContext(); await connect(context);
  try {
    const operator = await context.newPage();
    await operator.goto('/staff/login');
    await operator.getByLabel('Staff ID or email', { exact: true }).fill('updated.staff@example.test');
    await operator.getByLabel('Password', { exact: true }).fill('new-staff-password-123');
    await operator.getByRole('button', { name: 'LOG IN AS STAFF', exact: true }).click();
    await expect(operator.getByText('Window 2 - Registrar', { exact: true }).first()).toBeVisible();
    await expect(operator.getByTestId('auth-transition')).toHaveCount(0);
  } finally { await context.close(); }
});

test('account disable confirmation protects an active request and later revokes access', async ({ page, apiUrl }) => {
  const student = await session(apiUrl, 'student');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${student.token}`, 'X-Request-ID': crypto.randomUUID() };
  const booking = await fetch(`${apiUrl}/queue/command`, { method: 'POST', headers, body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }) });
  expect(booking.status).toBe(200);
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  const row = page.getByTestId('admin-account-student1');
  await row.getByRole('button', { name: 'student Test', exact: true }).click();
  await row.getByRole('button', { name: 'Disable student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Confirm disable student1', exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(200);
  await row.getByRole('button', { name: 'Confirm disable student1', exact: true }).click();
  const protection = row.getByText('Finish or cancel this student’s active ticket before disabling the account.', { exact: true });
  await expect(protection).toBeVisible();
  await expect(protection).toBeInViewport();
  const cancelled = await fetch(`${apiUrl}/queue/command`, { method: 'POST', headers: { ...headers, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify({ type: 'CANCEL', reason: 'No longer needed' }) });
  expect(cancelled.status).toBe(200);
  await row.getByRole('button', { name: 'Confirm disable student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Enable student1', exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(401);
  await row.getByRole('button', { name: 'Enable student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Disable student1', exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(401);
});

test('new registrar services become bookable and retain their saved routing in admin records and activity', async ({ page, browser, connect }) => {
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Services', exact: true }).click();
  await page.getByRole('button', { name: 'Add service', exact: true }).click();
  await page.getByLabel('New service name', { exact: true }).fill('Graduation Clearance');
  await page.getByRole('button', { name: 'New service window: Window 1', exact: true }).click();
  await page.getByRole('button', { name: 'New service window: select Window 4', exact: true }).click();
  await page.getByRole('button', { name: 'Save service', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Graduation Clearance', exact: true })).toBeVisible();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } }); await connect(context);
  try {
    const student = await context.newPage();
    await login(student);
    await student.getByRole('button', { name: 'Graduation Clearance', exact: true }).click();
    await student.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
    await expect(student.getByTestId('student-tickets').getByText('R - 1', { exact: true }).filter({ visible: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Records', exact: true }).click();
    await expect(page.getByTestId('admin-record-ticket-1').getByText(/Window 4/)).toBeVisible();
    await page.getByRole('button', { name: 'Filters', exact: true }).click();
    await page.getByRole('button', { name: 'Record service: All services', exact: true }).click();
    await page.getByRole('button', { name: 'Record service: select Graduation Clearance', exact: true }).click();
    await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
    await expect(page.getByText('1 records · Page 1 of 1', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Activity', exact: true }).click();
    await page.getByLabel('Search account, service or administrator', { exact: true }).fill('Graduation');
    await expect(page.getByRole('heading', { name: 'Service added', exact: true })).toBeVisible();
    await expect(page.getByText('Window: Window 4', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test('admin records use server pagination and filters without overflowing a narrow viewport', async ({ page, apiUrl }) => {
  const student = await session(apiUrl, 'student');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${student.token}` };
  for (let index = 0; index < 16; index++) {
    for (const body of [{ type: 'BOOK', service: 'Academic Records Request' }, { type: 'CANCEL', reason: 'Changed plans' }]) {
      const response = await fetch(`${apiUrl}/queue/command`, { method: 'POST', headers: { ...headers, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify(body) });
      expect(response.status).toBe(200);
    }
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Records', exact: true }).click();
  await expect(page.getByText('16 records · Page 1 of 2', { exact: true })).toBeVisible();
  await expect(page.getByTestId('admin-record-ticket-1')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('16 records · Page 2 of 2', { exact: true })).toBeVisible();
  await expect(page.getByTestId('admin-record-ticket-1')).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await page.getByRole('button', { name: 'Record status: All statuses', exact: true }).click();
  await page.getByRole('button', { name: 'Record status: select Waiting', exact: true }).click();
  await page.getByRole('button', { name: 'Apply filters', exact: true }).click();
  await expect(page.getByText('No matching tickets.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  await expect(page.getByLabel('From date (YYYY-MM-DD)', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click();
  await page.getByLabel('Search ticket or student ID', { exact: true }).fill('does-not-exist');
  await expect(page.getByText('0 records · Page 1 of 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Create staff account', exact: true }).click();
  await expect(page.getByLabel('Staff email', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('an administrator can change their own password and sign out all existing sessions', async ({ page, apiUrl }) => {
  const previous = await session(apiUrl, 'admin');
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Administration settings', exact: true }).click();
  await page.getByRole('button', { name: 'Change my password', exact: true }).click();
  await page.getByLabel('Current password', { exact: true }).fill(password);
  await page.getByLabel('New password (at least 10 characters)', { exact: true }).fill('new-admin-password-123');
  await page.getByLabel('Confirm new password', { exact: true }).fill('mismatched-password-123');
  let passwordRequests = 0;
  page.on('request', request => { if (request.url().endsWith('/auth/password')) passwordRequests++; });
  await page.getByRole('button', { name: 'Change password and sign out', exact: true }).click();
  await expect(page.getByText('Passwords do not match.', { exact: true })).toBeVisible();
  expect(passwordRequests).toBe(0);
  await page.getByLabel('Confirm new password', { exact: true }).fill('new-admin-password-123');
  await page.getByRole('button', { name: 'Change password and sign out', exact: true }).click();
  await expect(page.getByText('Student Portal', { exact: true })).toBeVisible();
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
  expect((await fetch(`${apiUrl}/auth/me`, { headers: { Authorization: `Bearer ${previous.token}` } })).status).toBe(401);
  await page.getByText('Staff Portal', { exact: true }).click();
  await page.getByLabel('Staff ID or email', { exact: true }).fill('admin');
  await page.getByLabel('Password', { exact: true }).fill('new-admin-password-123');
  await page.getByRole('button', { name: 'LOG IN AS STAFF', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Administration', exact: true })).toBeVisible();
  const authenticated = await fetch(`${apiUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'admin', password: 'new-admin-password-123', portal: 'staff' }) });
  const account = await authenticated.json();
  const report = await fetch(`${apiUrl}/admin`, { headers: { Authorization: `Bearer ${account.token}` } });
  const data = await report.json() as AdminData;
  expect(data.accounts.filter(user => user.role === 'admin' && user.active)).toHaveLength(1);
});

test('a failed record filter clears stale results and manual refresh retries the same search', async ({ page, apiUrl }) => {
  const student = await session(apiUrl, 'student');
  const response = await fetch(`${apiUrl}/queue/command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${student.token}`, 'X-Request-ID': crypto.randomUUID() },
    body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }),
  });
  expect(response.status).toBe(200);
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Records', exact: true }).click();
  await expect(page.getByTestId('admin-record-ticket-1')).toBeVisible();
  const history = /\/admin\/history\?/;
  await page.route(history, async route => {
    if (new URL(route.request().url()).searchParams.get('search') === 'blocked') await route.abort('connectionrefused');
    else await route.fallback();
  });
  await page.getByLabel('Search ticket or student ID', { exact: true }).fill('blocked');
  await expect(page.getByText(/Cannot reach Queue Ease/)).toBeVisible();
  await expect(page.getByTestId('admin-record-ticket-1')).toHaveCount(0);
  await page.unroute(history);
  await page.getByRole('button', { name: 'Refresh administration', exact: true }).click();
  await expect(page.getByText(/Cannot reach Queue Ease/)).toHaveCount(0);
  await expect(page.getByText('No matching tickets.', { exact: true })).toBeVisible();
  await page.getByLabel('Search ticket or student ID', { exact: true }).fill('student1');
  await expect(page.getByTestId('admin-record-ticket-1')).toBeVisible();
});
