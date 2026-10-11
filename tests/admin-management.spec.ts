import { test, expect, login, password } from './fixtures';
import type { AdminData } from '../src/data/admin-model';

test('account directories rise on entry and reverse on return while navigation remains available', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  async function sample(label: string) {
    return page.evaluate(buttonLabel => new Promise<number[]>(resolve => {
      const frames: number[] = [];
      const start = performance.now();
      const sampleFrame = (now: number) => {
        const pane = document.querySelector('[data-testid="account-directory-transition"]');
        if (pane) frames.push(new DOMMatrix(getComputedStyle(pane).transform).m42);
        if (now - start > 500) resolve(frames); else requestAnimationFrame(sampleFrame);
      };
      requestAnimationFrame(sampleFrame);
      document.querySelector<HTMLElement>(`[role="button"][aria-label="${buttonLabel}"]`)?.click();
    }), label);
  }
  const entry = await sample('Students');
  expect(entry.length).toBeGreaterThan(3);
  expect(Math.max(...entry)).toBeGreaterThan(1);
  expect(Math.abs(entry.at(-1)!)).toBeLessThan(0.5);
  await expect(page.getByRole('button', { name: 'Services', exact: true })).toBeVisible();
  const exit = await sample('Back to account groups');
  expect(exit.length).toBeGreaterThan(3);
  expect(Math.max(...exit)).toBeGreaterThan(10);
  await expect(page.getByRole('button', { name: 'Students', exact: true })).toBeVisible();
});

test('role directories search, sort and page database accounts without a long list', async ({ page, apiUrl }) => {
  for (let i = 0; i < 23; i++) {
    const response = await fetch(apiUrl + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'directory' + i, email: 'directory' + i + '@example.test', name: 'Directory Person ' + i, password }) });
    expect(response.status).toBe(200);
  }
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Students', exact: true })).toContainText('24');
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Students', exact: true }).click();
  await expect(page.getByRole('table', { name: 'Students account directory' })).toBeVisible();
  await expect(page.getByText('24 accounts · Page 1 of 3', { exact: true })).toBeVisible();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(10);
  await page.getByRole('button', { name: 'Next page', exact: true }).click();
  await expect(page.getByText('24 accounts · Page 2 of 3', { exact: true })).toBeVisible();
  await page.getByRole('columnheader', { name: 'Sort accounts by ID', exact: true }).click();
  await expect(page.getByText('24 accounts · Page 1 of 3', { exact: true })).toBeVisible();
  await page.getByLabel('Search accounts', { exact: true }).fill('directory0@');
  await expect(page.getByText('1 accounts · Page 1 of 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Manage directory0', exact: true }).click();
  const editor = page.getByTestId('admin-account-editor');
  await editor.getByLabel('Name for directory0', { exact: true }).fill('Updated Directory Person');
  await editor.getByRole('button', { name: 'Save details for directory0', exact: true }).click();
  await expect(editor.getByRole('heading', { name: 'Updated Directory Person', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close account editor', exact: true }).click();
  await page.getByRole('button', { name: 'Back to account groups', exact: true }).click();
  await page.getByRole('button', { name: 'Admins', exact: true }).click();
  await expect(page.getByTestId('admin-account-admin')).toBeVisible();
  await expect(page.locator('[data-testid^="admin-account-"]')).toHaveCount(1);
});

async function session(apiUrl: string, role: 'student' | 'staff' | 'admin') {
  const response = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portal: role === 'student' ? 'student' : 'staff', login: role === 'admin' ? 'admin' : `${role}1`, password }),
  });
  expect(response.status).toBe(200);
  return response.json() as Promise<{ token: string }>;
}

test('directory removal requires confirmation and ends every session while retaining records', async ({ page, apiUrl }) => {
  const student = await session(apiUrl, 'student');
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${student.token}` };
  for (const body of [{ type: 'BOOK', service: 'Academic Records Request' }, { type: 'CANCEL', reason: 'Changed plans' }]) {
    const response = await fetch(`${apiUrl}/queue/command`, { method: 'POST', headers: { ...headers, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify(body) });
    expect(response.status).toBe(200);
  }
  await login(page, 'admin');
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await page.getByRole('button', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Manage student1', exact: true }).click();
  const editor = page.getByTestId('admin-account-editor');
  await editor.getByRole('button', { name: 'Remove student1', exact: true }).click();
  const confirm = editor.getByRole('button', { name: 'Confirm removal student1', exact: true });
  await expect(confirm).toBeDisabled();
  await editor.getByLabel('Enter student1 to confirm removal', { exact: true }).fill('student1');
  await confirm.click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText('0 accounts · Page 1 of 1', { exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(401);
  await page.getByRole('button', { name: 'Records', exact: true }).click();
  await expect(page.getByTestId('admin-record-ticket-1')).toBeVisible();
});

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
  await expect(page.getByRole('button', { name: 'Admins', exact: true })).toContainText('2');
  await page.getByRole('button', { name: 'Staff', exact: true }).click();
  await page.getByRole('button', { name: 'Manage staff1', exact: true }).click();
  const staff = page.getByTestId('admin-account-editor');
  await staff.getByLabel('Name for staff1', { exact: true }).fill('Updated Staff');
  await staff.getByLabel('Email for staff1', { exact: true }).fill('updated.staff@example.test');
  await staff.getByRole('button', { name: 'Save details for staff1', exact: true }).click();
  await expect(staff.getByRole('heading', { name: 'Updated Staff', exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Window for staff1: Unassigned', exact: true }).click();
  await staff.getByRole('button', { name: 'Window for staff1: select Window 2', exact: true }).click();
  await expect(staff.getByRole('button', { name: 'Window for staff1: Window 2', exact: true })).toBeVisible();
  await staff.getByRole('button', { name: 'Reset password for staff1', exact: true }).click();
  await staff.getByLabel('Replacement password for staff1', { exact: true }).fill('new-staff-password-123');
  await staff.getByRole('button', { name: 'Confirm password reset for staff1', exact: true }).click();
  await expect(staff.getByLabel('Replacement password for staff1', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Close account editor', exact: true }).click();
  await page.getByRole('button', { name: 'Back to account groups', exact: true }).click();
  await page.getByRole('button', { name: 'Admins', exact: true }).click();
  await page.getByRole('button', { name: 'Manage admin', exact: true }).click();
  const own = page.getByTestId('admin-account-editor');
  await expect(own.getByRole('button', { name: 'Suspend admin', exact: true })).toHaveCount(0);
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
  await page.getByRole('button', { name: 'Students', exact: true }).click();
  await page.getByRole('button', { name: 'Manage student1', exact: true }).click();
  const row = page.getByTestId('admin-account-editor');
  await row.getByRole('button', { name: 'Suspend student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Confirm suspension student1', exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(200);
  await row.getByRole('button', { name: 'Confirm suspension student1', exact: true }).click();
  const protection = row.getByText('Finish or cancel this student’s active ticket before disabling the account.', { exact: true });
  await expect(protection).toBeVisible();
  await expect(protection).toBeInViewport();
  const cancelled = await fetch(`${apiUrl}/queue/command`, { method: 'POST', headers: { ...headers, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify({ type: 'CANCEL', reason: 'No longer needed' }) });
  expect(cancelled.status).toBe(200);
  await row.getByRole('button', { name: 'Confirm suspension student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Restore student1', exact: true })).toBeVisible();
  expect((await fetch(`${apiUrl}/auth/me`, { headers })).status).toBe(401);
  await row.getByRole('button', { name: 'Restore student1', exact: true }).click();
  await expect(row.getByRole('button', { name: 'Suspend student1', exact: true })).toBeVisible();
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
  await expect(page.getByTestId('admin-section-records').getByText('0 records · Page 1 of 1', { exact: true })).toBeVisible();
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
