import { expect, test, password } from './fixtures';

test('student email can be typed naturally and local account IDs remain usable', async ({ page }) => {
  await page.goto('/login');
  const login = page.getByLabel('Student ID or email', { exact: true });
  await login.pressSequentially('student@example.test');
  await expect(login).toHaveValue('student@example.test');
  await login.fill('student1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByTestId('student-home')).toBeVisible();
});

test('registration identifies invalid fields before sending and clears corrected errors', async ({ page }) => {
  let sent = 0;
  page.on('request', request => { if (request.method() === 'POST' && /\/auth\/register$/.test(request.url())) sent++; });
  await page.goto('/register');
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByText('Enter your full name.', { exact: true })).toBeVisible();
  await expect(page.getByText('Enter a valid email address.', { exact: true })).toBeVisible();
  expect(sent).toBe(0);
  await page.getByLabel('Full name', { exact: true }).fill('Valid Student');
  await expect(page.getByText('Enter your full name.', { exact: true })).toHaveCount(0);
  await page.getByLabel('Student ID', { exact: true }).fill('student-two');
  await page.getByLabel('Email', { exact: true }).fill('valid@example.test');
  await page.getByLabel('Password (at least 10 characters)', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Create Account', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Go to Log In' })).toBeVisible();
  expect(sent).toBe(1);
});

test('valid credentials must use the account’s authorized portal', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Student ID or email', { exact: true }).fill('staff1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByText('Use the correct portal for this account.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('staff-dashboard')).toHaveCount(0);
  await page.goto('/staff/login');
  await page.getByLabel('Staff ID or email', { exact: true }).fill('student1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'LOG IN AS STAFF', exact: true }).click();
  await expect(page.getByText('Use the correct portal for this account.', { exact: true })).toBeVisible();
  await expect(page.getByTestId('student-home')).toHaveCount(0);
});
