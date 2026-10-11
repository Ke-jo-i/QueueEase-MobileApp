import { test, expect, login, password } from './fixtures';

test('direct cancellation updates another student, a staff window and the administrator automatically', async ({ page, browser, connect, apiUrl }) => {
  const contexts = await Promise.all(Array.from({ length: 3 }, () => browser.newContext({ viewport: { width: 390, height: 844 } })));
  await Promise.all(contexts.map(connect));
  const [other, staff, admin] = await Promise.all(contexts.map(context => context.newPage()));
  try {
    const registered = await page.request.post(`${apiUrl}/auth/register`, { data: { login: 'student2', name: 'Second Student', email: 'student2@example.test', password } });
    expect(registered.ok()).toBeTruthy();
    await login(page);
    await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
    await page.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Cancel ticket', exact: true })).toBeVisible();
    await other.goto('/login');
    await other.getByLabel('Student ID or email', { exact: true }).fill('student2');
    await other.getByLabel('Password', { exact: true }).fill(password);
    await other.getByRole('button', { name: 'Log In', exact: true }).click();
    await expect(other.getByTestId('auth-transition')).toHaveCount(0);
    await other.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
    await other.getByRole('button', { name: 'Get Queue Number', exact: true }).click();
    await expect(other.getByRole('button', { name: 'View queue progress', exact: true })).toHaveText('1 person ahead · View progress');
    await login(staff, 'staff');
    await login(admin, 'admin');
    await expect(staff.getByRole('button', { name: 'View Waiting Queue List (2)', exact: true })).toBeVisible();
    await expect(admin.getByText('2 waiting · 0 serving · 0 held', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel ticket', exact: true }).click();
    await page.getByPlaceholder('Reason for cancellation').fill('Returning another day');
    await page.getByRole('button', { name: 'Yes, Cancel Ticket', exact: true }).click();
    await expect(page.getByTestId('student-tickets').getByText('CANCELLED', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(other.getByRole('button', { name: 'View queue progress', exact: true })).toHaveText('0 people ahead · View progress', { timeout: 8000 });
    await expect(staff.getByRole('button', { name: 'View Waiting Queue List (1)', exact: true })).toBeVisible({ timeout: 8000 });
    await expect(admin.getByText('1 waiting · 0 serving · 0 held', { exact: true })).toBeVisible({ timeout: 8000 });
    await staff.getByRole('button', { name: 'Call Next', exact: true }).click();
    await expect(staff.getByText('R - 2', { exact: true })).toBeVisible();
    await expect(other.getByRole('button', { name: 'Cancel ticket', exact: true })).toHaveCount(0, { timeout: 8000 });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
