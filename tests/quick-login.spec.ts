import { test, expect } from './fixtures';

for (const role of ['student', 'staff', 'admin'] as const) {
  test(`${role} quick login signs in with empty ID and password fields`, async ({ page }) => {
    await page.goto('/landing');
    await page.getByText(role === 'student' ? 'Student Portal' : 'Staff Portal', { exact: true }).click();
    await expect(page.getByLabel(role === 'student' ? 'Student ID or email' : 'Staff ID or email', { exact: true })).toHaveValue('');
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    if (role === 'student') {
      await page.getByRole('button', { name: 'Log In', exact: true }).click();
      await expect(page.getByText('Enter your ID or email and password.', { exact: true })).toBeVisible();
    }
    const label = `Quick login as ${role[0].toUpperCase()}${role.slice(1)}`;
    await expect(page.getByRole('button', { name: label, exact: true })).toBeVisible();
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.getByText(role === 'student' ? 'Registrar Services' : role === 'admin' ? 'Administration' : 'CURRENTLY SERVING', { exact: true })).toBeVisible();
    await expect(page.getByText('Enter your ID or email and password.', { exact: true })).toHaveCount(0);
  });
}

test('normal login still validates empty fields', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByText('Enter your ID or email and password.', { exact: true })).toBeVisible();
});
