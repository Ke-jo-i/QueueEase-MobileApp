import { test, expect, login, password } from './fixtures';

for (const role of ['student', 'staff', 'admin'] as const) {
  test(`${role} quick login and logout animate without waiting for server signout`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(role === 'student' ? '/login' : '/staff/login');
    await page.getByRole('button', { name: `Quick login as ${role[0].toUpperCase()}${role.slice(1)}`, exact: true }).click();
    const transition = page.getByTestId('auth-transition');
    await expect(transition).toHaveAttribute('aria-label', `${role[0].toUpperCase()}${role.slice(1)} signed in`);
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => !!document.activeElement?.closest('[aria-hidden="true"]'))).toBe(false);
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

test('login reveals the destination continuously and finishes without a position jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/login');
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  await page.getByLabel('Password', { exact: true }).fill(password);
  const capture = page.evaluate(() => new Promise<{ covered: boolean; opacity: number; y: number; width: number; time: number }[]>(resolve => {
    const frames: { covered: boolean; opacity: number; y: number; width: number; time: number }[] = [];
    const start = performance.now();
    let seen = false;
    let cleared = 0;
    const sample = () => {
      const overlay = document.querySelector('[data-testid="auth-transition"]');
      const veil = document.querySelector('[data-testid="auth-transition-veil"]') ?? overlay;
      const scene = document.querySelector('[data-testid="student-home"]');
      const now = performance.now();
      if (overlay) seen = true;
      if (seen && !overlay && !cleared) cleared = now;
      if (seen && scene) {
        const bounds = scene.getBoundingClientRect();
        frames.push({ covered: !!overlay, opacity: veil ? Number(getComputedStyle(veil).opacity) : 0, y: bounds.y, width: bounds.width, time: now });
      }
      if ((cleared && now - cleared > 160) || now - start > 2400) resolve(frames);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  await page.getByRole('button', { name: 'Log In', exact: true }).click();
  const frames = await capture;
  const reveal = frames.filter(frame => frame.covered && frame.opacity > 0.05 && frame.opacity < 0.95);
  expect(reveal.length).toBeGreaterThan(2);
  expect(Math.max(...reveal.map(frame => frame.y)) - Math.min(...reveal.map(frame => frame.y))).toBeGreaterThan(2);
  const end = frames.filter(frame => !frame.covered || frame.opacity < 0.05);
  expect(end.length).toBeGreaterThan(2);
  expect(Math.max(...end.map(frame => frame.y)) - Math.min(...end.map(frame => frame.y))).toBeLessThan(2);
  expect(Math.max(...end.map(frame => frame.width)) - Math.min(...end.map(frame => frame.width))).toBeLessThan(2);
  await expect(page).toHaveURL(/\/home$/);
});
