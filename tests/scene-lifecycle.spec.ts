import { test, expect, login } from './fixtures';

test('navigation bursts coalesce to the latest tab instead of starting every transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await login(page);
  const changes: string[] = [];
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) changes.push(new URL(frame.url()).pathname); });
  await page.evaluate(async () => {
    const labels = ['Tickets', 'Alerts', 'Home'];
    for (let i = 0; i < 24; i++) {
      const target = document.querySelector<HTMLElement>(`[role="tab"][aria-label="${labels[i % 3]}"]`);
      target?.click();
      await new Promise(resolve => setTimeout(resolve, 8));
    }
    document.querySelector<HTMLElement>('[role="tab"][aria-label="Profile"]')?.click();
  });
  await expect(page).toHaveURL(/\/profile$/);
  await expect(page.getByRole('heading', { name: 'Student Profile', exact: true })).toBeVisible();
  expect(changes.length).toBeLessThanOrEqual(3);
});

test('rapid navigation settles on the final destination without runtime errors', async ({ page }) => {
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await login(page);
  for (let i = 0; i < 24; i++) await page.getByRole('tab', { name: ['Tickets', 'Alerts', 'Home'][i % 3], exact: true }).click();
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Student Profile', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/profile$/);
  await expect.poll(async () => page.getByRole('tab', { name: 'Profile', exact: true }).getAttribute('aria-selected')).toBe('true');
  expect(failures).toEqual([]);
});

test('scene responses isolate playback and reset with the student session', async ({ page }) => {
  await page.addInitScript(() => {
    const events: { element: HTMLMediaElement; source: string; failed: boolean }[] = [];
    Reflect.set(window, '__sceneMedia', events);
    const original = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const pending = original.call(this);
      pending.then(() => events.push({ element: this, source: this.currentSrc, failed: false }), () => events.push({ element: this, source: this.currentSrc, failed: true }));
      return pending;
    };
  });
  await login(page);
  for (const label of ['Alerts', 'Tickets']) {
    for (let i = 0; i < 20; i++) await page.getByRole('tab', { name: label, exact: true }).click();
    await expect.poll(() => page.evaluate(() => Reflect.get(window, '__sceneMedia').filter((event: { failed: boolean }) => !event.failed).length)).toBe(label === 'Alerts' ? 1 : 2);
    await expect.poll(() => page.evaluate(() => Reflect.get(window, '__sceneMedia').at(-1).element.currentTime)).toBeGreaterThan(0.1);
  }
  expect(await page.evaluate(() => Reflect.get(window, '__sceneMedia')[0].element.paused)).toBe(true);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  const title = page.getByRole('heading', { name: 'Student Profile', exact: true });
  for (let i = 0; i < 20; i++) await title.click();
  await expect.poll(async () => {
    return title.evaluate(element => {
      for (let current = element.parentElement; current; current = current.parentElement) {
        const transform = getComputedStyle(current).transform;
        if (transform === 'none') continue;
        const matrix = new DOMMatrix(transform);
        if (matrix.a < -0.99 && matrix.d < -0.99) return true;
      }
      return false;
    });
  }).toBe(true);
  await page.getByRole('button', { name: 'Log Out', exact: true }).click();
  await expect(page.getByTestId('auth-transition')).toHaveCount(0);
  expect(await page.evaluate(() => Reflect.get(window, '__sceneMedia').every((event: { element: HTMLMediaElement }) => event.element.paused))).toBe(true);
  await login(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  expect(await title.evaluate(element => {
    for (let current = element.parentElement; current; current = current.parentElement) {
      const transform = getComputedStyle(current).transform;
      if (transform !== 'none' && new DOMMatrix(transform).a < 0) return true;
    }
    return false;
  })).toBe(false);
});

test('profile media begins after readiness and releases on close', async ({ page }) => {
  await login(page);
  await page.getByRole('tab', { name: 'Profile', exact: true }).click();
  const title = page.getByRole('heading', { name: 'Student Profile', exact: true });
  const box = await title.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(10200);
  await page.mouse.up();
  await expect(page.getByRole('button', { name: 'Close video', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('video').evaluate(video => (video as HTMLVideoElement).currentTime), { timeout: 10000 }).toBeGreaterThan(0.1);
  await page.getByRole('button', { name: 'Close video', exact: true }).click();
  await expect(page.locator('video')).toHaveCount(0);
  await expect(title).toBeVisible();
});
