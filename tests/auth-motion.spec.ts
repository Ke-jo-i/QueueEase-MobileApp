import { test, expect, login } from './fixtures';

for (const role of ['student', 'staff', 'admin'] as const) {
  test(`${role} quick login and logout animate without waiting for server signout`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(role === 'student' ? '/login' : '/staff/login');
    await page.getByRole('button', { name: `Quick login as ${role[0].toUpperCase()}${role.slice(1)}`, exact: true }).click();
    const transition = page.getByTestId('auth-transition');
    await expect(transition).toHaveAttribute('aria-label', `${role[0].toUpperCase()}${role.slice(1)} signed in`);
    await expect(transition).toHaveCount(0);
    await expect(page).toHaveURL(role === 'student' ? /\/home$/ : role === 'staff' ? /\/staff\/dashboard$/ : /\/admin$/);
    if (role !== 'admin') await page.getByLabel('Profile', { exact: true }).click();
    let release = () => {};
    const gate = new Promise<void>(resolve => { release = resolve; });
    await page.route('**/auth/logout', async route => {
      await gate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    try {
      await page.getByRole('button', { name: 'Log Out', exact: true }).click();
      await expect(transition).toHaveAttribute('aria-label', `${role[0].toUpperCase()}${role.slice(1)} signed out`);
      await expect(page).toHaveURL(/\/landing$/);
      await expect(transition).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Student Portal', exact: true })).toBeVisible();
      await page.goBack();
      await expect(page.getByText(role === 'admin' ? 'Administration' : 'Profile & Settings', { exact: true })).toHaveCount(0);
    } finally { release(); }
  });
}

test('leaving a pending login cancels entry and revokes the obsolete server session', async ({ page, apiUrl }) => {
  let release = () => {};
  let received = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const requestReceived = new Promise<void>(resolve => { received = resolve; });
  await page.route('**/auth/demo-login', async route => {
    const response = await route.fetch({ url: `${apiUrl}/auth/demo-login`, headers: { ...route.request().headers(), origin: apiUrl } });
    received();
    await gate;
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': route.request().headers().origin ?? '*' } });
  });
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Student Portal', exact: true }).click();
  await page.getByRole('button', { name: 'Quick login as Student', exact: true }).click();
  await requestReceived;
  await page.getByRole('button', { name: 'Go back', exact: true }).click();
  await expect(page).toHaveURL(/\/landing$/);
  const revoked = page.waitForResponse(response => response.url().endsWith('/auth/logout'));
  release();
  await revoked;
  await expect(page).toHaveURL(/\/landing$/);
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
  await expect(page.getByText('Registrar Services', { exact: true })).toHaveCount(0);
});

test('reduced motion keeps account handoff and signout usable', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await login(page);
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await expect(page).toHaveURL(/\/landing$/);
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Staff Portal', exact: true })).toBeVisible();
});
