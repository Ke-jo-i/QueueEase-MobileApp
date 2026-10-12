import { test, expect, login, password } from './fixtures';
import type { Page } from '@playwright/test';

async function exitFrames(page: Page, back: () => Promise<unknown>) {
  const frames = page.evaluate(() => new Promise<number[]>(resolve => {
    const positions: number[] = [];
    const started = performance.now();
    const sample = (now: number) => {
      const view = document.querySelector('[data-testid="auth-detail"]');
      if (view) positions.push(view.getBoundingClientRect().y);
      if (now - started < 800) requestAnimationFrame(sample); else resolve(positions);
    };
    requestAnimationFrame(sample);
  }));
  await back();
  return frames;
}

test('registration and recovery reverse downwards on top Back and browser Back while preserving login input', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/landing');
  await page.getByRole('button', { name: 'Student Portal', exact: true }).click();
  await page.getByLabel('Student ID or email', { exact: true }).fill('student1');
  for (const entry of ['Create an account', 'Forgot password?']) {
    for (const back of [() => page.getByRole('button', { name: 'Go back', exact: true }).click(), () => page.goBack()]) {
      await page.getByRole('button', { name: entry, exact: true }).click();
      await expect.poll(async () => Math.round((await page.getByTestId('auth-detail').boundingBox())?.y ?? -1)).toBe(0);
      const frames = await exitFrames(page, back);
      expect(frames.some(y => y > page.viewportSize()!.height * 0.4), JSON.stringify(frames)).toBeTruthy();
      await expect(page.getByLabel('Student ID or email', { exact: true })).toHaveValue('student1');
    }
  }
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`appearance changes reveal from top to bottom and preserve preferences with motion ${reducedMotion}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await login(page);
    await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    const toggle = page.getByRole('switch', { name: 'Dark mode', exact: true });
    const frames = page.evaluate(() => new Promise<string[]>(resolve => {
      const clips: string[] = [];
      const started = performance.now();
      const sample = (now: number) => {
        clips.push(getComputedStyle(document.documentElement, '::view-transition-new(root)').clipPath);
        if (now - started < 1000) requestAnimationFrame(sample); else resolve(clips);
      };
      requestAnimationFrame(sample);
    }));
    await toggle.click();
    await expect(toggle).toBeChecked();
    await expect(toggle).toBeEnabled();
    const clips = await frames;
    const moving = clips.some(clip => /inset\(0px 0px (?!0(?:%|px)|100%)[\d.]+%/.test(clip));
    expect(moving, JSON.stringify(clips)).toBe(reducedMotion === 'no-preference');
    await page.getByRole('button', { name: 'Color Theme', exact: true }).click();
    await page.getByRole('radio', { name: 'Lavender theme', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Color Theme', exact: true })).toContainText('Lavender');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('queueease.theme'))).toBe('lavender');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('queueease.color-scheme'))).toBe('dark');
    await page.getByRole('tab', { name: 'Home', exact: true }).click();
    await page.getByRole('tab', { name: 'Profile', exact: true }).click();
    await expect(toggle).toBeChecked();
    await toggle.click();
    await expect(toggle).not.toBeChecked();
    await expect(toggle).toBeEnabled();
  });
}

test('staff reason selection stays separated from action buttons in a short viewport and with larger text', async ({ page, apiUrl }) => {
  await page.setViewportSize({ width: 360, height: 520 });
  const signedIn = await fetch(apiUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: 'student1', portal: 'student', password }) });
  const { token } = await signedIn.json();
  const booked = await fetch(apiUrl + '/queue/command', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }) });
  expect(booked.status).toBe(200);
  await login(page, 'staff');
  await page.getByRole('switch', { name: 'Spoken announcements', exact: true }).click();
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  for (const action of ['Hold ticket', 'Skip ticket']) {
    await page.getByRole('button', { name: 'More actions', exact: true }).click();
    await page.getByRole('button', { name: action, exact: true }).click();
    await page.getByRole('dialog').evaluate(dialog => {
      for (const node of dialog.querySelectorAll<HTMLElement>('div,span,input,textarea')) {
        if (![...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent?.trim())) continue;
        const style = getComputedStyle(node);
        if (/ionicons/i.test(style.fontFamily)) continue;
        node.style.fontSize = `${parseFloat(style.fontSize) * 1.25}px`;
        const height = parseFloat(style.lineHeight);
        if (Number.isFinite(height)) node.style.lineHeight = `${height * 1.25}px`;
      }
    });
    const reason = page.getByRole('button', { name: 'Choose a reason', exact: true });
    const cancel = page.getByRole('button', { name: 'Cancel', exact: true });
    const bounds = await Promise.all([reason.boundingBox(), cancel.boundingBox()]);
    expect(bounds[1]!.y - bounds[0]!.y - bounds[0]!.height).toBeGreaterThanOrEqual(20);
    await reason.click();
    await page.getByRole('button', { name: 'Other', exact: true }).click();
    await page.getByPlaceholder('Describe the reason').fill('Missing document');
    await page.getByRole('button', { name: 'Confirm', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Confirm', exact: true })).toBeInViewport();
    await cancel.click();
    await expect(page.getByRole('button', { name: 'More actions', exact: true })).toBeVisible();
  }
});
