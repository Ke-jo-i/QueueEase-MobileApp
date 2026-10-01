import { expect, Page, test } from '@playwright/test';

async function signIn(page: Page, role: 'student' | 'staff') {
  await page.goto('/landing');
  await page.getByText(role === 'staff' ? 'Staff Portal' : 'Student Portal', { exact: true }).click();
  await page.getByText(role === 'staff' ? 'LOG IN AS STAFF' : 'Log In', { exact: true }).click();
}

test('queue progress, completed history, and ticket numbering survive reloads', async ({ page }) => {
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await page.getByRole('tab', { name: /Home/ }).click();
  await expect(page.getByText('1 person ahead', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'View queue progress' }).click();
  await expect(page.getByTestId('live-queue').getByText('PEOPLE AHEAD', { exact: true })).toBeVisible();
  await expect(page.getByText('Ticket activity', { exact: true })).toBeVisible();

  await signIn(page, 'staff');
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByText('CALL NEXT', { exact: true }).click();
  await page.getByText('MARK AS DONE', { exact: true }).click();
  await page.getByText('CALL NEXT', { exact: true }).click();
  await expect(page.getByTestId('staff-dashboard').getByText('R - 106', { exact: true })).toBeVisible();

  await signIn(page, 'student');
  await expect(page.getByTestId('student-home').getByText('Your turn', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View queue progress' }).click();
  await expect(page.getByText('Number called', { exact: true })).toBeVisible();

  await signIn(page, 'staff');
  await page.getByText('MARK AS DONE', { exact: true }).click();
  await signIn(page, 'student');
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Activity for R - 106' }).click();
  await expect(page.getByText('Ticket created', { exact: true })).toBeVisible();
  await expect(page.getByText('Number called', { exact: true })).toBeVisible();
  await expect(page.getByText('Ticket completed', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Home/ }).click();
  await page.getByRole('button', { name: 'Academic Records Request', exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await expect(page.getByTestId('student-tickets').getByText('R - 107', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('a held ticket stays visible and blocks a second booking after reopening the app', async ({ page }) => {
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'Student Record Update', exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await signIn(page, 'staff');
  await page.getByText('Profile', { exact: true }).click();
  await page.getByText('Window Assignment', { exact: true }).click();
  await page.getByText('Window 4 - Registrar', { exact: true }).last().click();
  await page.getByText('Queue', { exact: true }).click();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByText('CALL NEXT', { exact: true }).click();
  await page.getByText('HOLD', { exact: true }).click();
  await page.getByText('Choose a reason', { exact: true }).click();
  await page.getByText('Student gathering documents', { exact: true }).click();
  await page.getByText('Confirm', { exact: true }).click();

  await signIn(page, 'student');
  await expect(page.getByTestId('student-home').getByText('On hold', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View queue progress' }).click();
  await expect(page.getByTestId('live-queue').getByText('Student gathering documents', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.getByRole('button', { name: 'Certificate of Grades', exact: true }).click();
  await expect(page.getByText('Get Queue Number', { exact: true })).not.toBeVisible();
  await page.getByText('View active ticket', { exact: true }).click();
  await expect(page.getByText('ON HOLD', { exact: true })).toBeVisible();

  await signIn(page, 'staff');
  await expect(page.getByTestId('staff-dashboard').getByText('Window 4 - Registrar', { exact: true })).toBeVisible();
  await page.getByText('History', { exact: true }).click();
  await page.getByText('Reopen ticket', { exact: true }).click();
  await signIn(page, 'student');
  await expect(page.getByTestId('student-home').getByText('Waiting in line', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View queue progress' }).click();
  await expect(page.getByText('Returned to queue', { exact: true })).toBeVisible();
  await expect(page.getByText('Ticket on hold', { exact: true })).toBeVisible();
});

test('unreadable saved data is preserved instead of replaced with a demo queue', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('queueease.queue.v1', '{broken'));
  await page.goto('/landing');
  await expect(page.getByText('Could not open saved queue', { exact: true })).toBeVisible();
  await expect(page.getByText('Staff Portal', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Retry loading queue' }).click();
  await expect(page.getByText('Could not open saved queue', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('queueease.queue.v1'))).toBe('{broken');
});

test('failed saves can be retried without losing the latest ticket', async ({ page }) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    let queueWrites = 0;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'queueease.queue.v1' && ++queueWrites > 1 && this.getItem('allowQueueWrites') !== 'yes') {
        throw new Error('Simulated storage failure');
      }
      return original.call(this, key, value);
    };
  });
  await signIn(page, 'student');
  await page.getByRole('button', { name: 'Student Record Update', exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await expect(page.getByText('Changes have not been saved on this device. Keep the app open and retry.', { exact: true })).toBeVisible();
  await page.evaluate(() => localStorage.setItem('allowQueueWrites', 'yes'));
  await page.getByRole('button', { name: 'Retry saving' }).click();
  await expect(page.getByRole('button', { name: 'Retry saving' })).not.toBeVisible();
  await signIn(page, 'student');
  await expect(page.getByTestId('student-home').getByText('R - 106', { exact: true })).toBeVisible();
});
