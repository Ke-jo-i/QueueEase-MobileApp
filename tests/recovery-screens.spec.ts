import { test, expect, login, password } from './fixtures';

test('a sign-in connection failure can retry without re-entering credentials', async ({ page }) => {
  const endpoint = '**/auth/login';
  await page.route(endpoint, route => route.abort('connectionrefused'));
  await page.goto('/login');
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByTestId('error-screen').getByRole('heading', { name: 'Sign-in unavailable', exact: true })).toBeVisible();
  await page.unroute(endpoint);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Registrar Services', exact: true })).toBeVisible();
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
});

test('initial queue failure offers recovery and retains the authenticated account', async ({ page }) => {
  const queue = /\/(?:api\/)?queue$/;
  await page.route(queue, route => route.abort('connectionrefused'));
  await page.goto('/login');
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  await expect(page.getByTestId('error-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Unable to connect', exact: true })).toBeVisible();
  await page.unroute(queue);
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route(queue, async route => { await gate; await route.fallback(); });
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByTestId('loading-screen')).toBeVisible();
  release();
  await expect(page.getByTestId('loading-screen')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Registrar Services', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/home$/);
});

test('admin initial failure is recoverable and section navigation remains usable', async ({ page }) => {
  const admin = /\/(?:api\/)?admin(?:\?view=workspace)?$/;
  await page.route(admin, route => route.abort('connectionrefused'));
  await login(page, 'admin');
  await expect(page.getByRole('heading', { name: 'Administration is unavailable', exact: true })).toBeVisible();
  await page.unroute(admin);
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause new tickets', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Accounts', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Accounts (3)', exact: true })).toBeVisible();
});
