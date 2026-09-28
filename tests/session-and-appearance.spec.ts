import { expect, Page, test } from '@playwright/test';

async function signIn(page: Page, role: 'staff' | 'student') {
  await page.goto('/landing');
  await page.getByText(role === 'staff' ? 'Staff Portal' : 'Student Portal', { exact: true }).click();
  await page.getByText(role === 'staff' ? 'LOG IN AS STAFF' : 'Log In', { exact: true }).click();
  await expect(page).toHaveURL(role === 'staff' ? /\/staff\/dashboard$/ : /\/home$/);
}

test('staff logout prevents Back and Forward from restoring private screens', async ({ page }) => {
  await signIn(page, 'staff');
  await page.getByText('History', { exact: true }).click();
  await expect(page.getByText('Profile', { exact: true }).filter({ visible: true })).toHaveCount(1);
  await page.getByText('Profile', { exact: true }).filter({ visible: true }).click();
  await page.getByText('Log Out', { exact: true }).click();
  await expect(page.getByText('Select Your Portal', { exact: true })).toBeVisible();
  for (const direction of ['back', 'back', 'forward', 'forward'] as const) {
    if (direction === 'back') await page.goBack();
    else await page.goForward();
    await expect(page.getByText('CURRENTLY SERVING', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Queue History', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Profile & Settings', { exact: true })).not.toBeVisible();
  }
});

test('student logout clears ticket and profile access', async ({ page }) => {
  await signIn(page, 'student');
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByText('Log Out', { exact: true }).click();
  await expect(page.getByText('Select Your Portal', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('My Queue Tickets', { exact: true })).not.toBeVisible();
  await expect(page.getByText('Student Profile', { exact: true })).not.toBeVisible();
  await page.goForward();
  await expect(page.getByText('Student Profile', { exact: true })).not.toBeVisible();
});

for (const path of ['/staff/dashboard', '/staff/profile', '/staff/history', '/staff/queue-list', '/home', '/tickets', '/alerts', '/profile', '/confirm-service', '/live-status']) {
  test(`signed-out users cannot open ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByText('Get Started', { exact: true })).toBeVisible();
    await expect(page.getByText('Juan Dela Cruz', { exact: true })).not.toBeVisible();
    await expect(page.getByText('CURRENTLY SERVING', { exact: true })).not.toBeVisible();
  });
}

for (const role of ['staff', 'student'] as const) {
  test(`${role} can switch portals immediately after logout`, async ({ page }) => {
    await signIn(page, role);
    if (role === 'staff') await page.getByText('Profile', { exact: true }).click();
    else await page.getByRole('tab', { name: /Profile/ }).click();
    await page.getByText('Log Out', { exact: true }).click();
    await expect(page.getByText('Select Your Portal', { exact: true })).toBeVisible();
    await page.getByText(role === 'staff' ? 'Student Portal' : 'Staff Portal', { exact: true }).click();
    await page.getByText(role === 'staff' ? 'Log In' : 'LOG IN AS STAFF', { exact: true }).click();
    await expect(page).toHaveURL(role === 'staff' ? /\/home$/ : /\/staff\/dashboard$/);
  });

  test(`${role} can toggle dark mode and keep it after logout and reload`, async ({ page }) => {
    await signIn(page, role);
    if (role === 'staff') await page.getByText('Profile', { exact: true }).click();
    else await page.getByRole('tab', { name: /Profile/ }).click();
    const title = page.getByText(role === 'staff' ? 'Profile & Settings' : 'Student Profile', { exact: true });
    await expect(title).toHaveCSS('color', 'rgb(0, 51, 102)');
    await page.getByRole('switch', { name: 'Dark mode' }).check();
    await expect(title).toHaveCSS('color', 'rgb(147, 197, 253)');
    await page.getByText('Log Out', { exact: true }).click();
    await expect(page.getByText('Select Your Portal', { exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByText('QueueEase', { exact: true })).toHaveCSS('color', 'rgb(147, 197, 253)');
    await page.getByText(role === 'staff' ? 'Staff Portal' : 'Student Portal', { exact: true }).click();
    await page.getByText(role === 'staff' ? 'LOG IN AS STAFF' : 'Log In', { exact: true }).click();
    if (role === 'staff') await page.getByText('Profile', { exact: true }).click();
    else await page.getByRole('tab', { name: /Profile/ }).click();
    await expect(page.getByRole('switch', { name: 'Dark mode' })).toBeChecked();
    await page.getByRole('switch', { name: 'Dark mode' }).uncheck();
    await expect(title).toHaveCSS('color', 'rgb(0, 51, 102)');
  });
}
