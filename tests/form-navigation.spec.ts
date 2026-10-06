import { test, expect, password } from './fixtures';

test('Back from registration returns to the existing login form', async ({ page }) => {
  await page.goto('/landing');
  await page.getByText('Student Portal', { exact: true }).click();
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  await expect(page.getByLabel('Confirm password', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Back|Go back/ }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel('Student ID or email', { exact: true })).toHaveValue('student1');
});

test('lower registration fields stay reachable in a reduced viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 360 });
  await page.goto('/landing');
  await page.getByText('Student Portal', { exact: true }).click();
  await page.getByRole('button', { name: 'Create an account', exact: true }).click();
  const input = page.getByLabel('Confirm password', { exact: true });
  await input.focus();
  await input.pressSequentially(password);
  await expect(input).toBeFocused();
  await expect(input).toHaveValue(password);
  const bounds = await input.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(360);
  await page.getByRole('button', { name: 'Show password', exact: true }).last().click();
  await expect(input).toHaveJSProperty('type', 'text');
});
