import { expect, Page, test } from '@playwright/test';

async function signIn(page: Page, role: 'staff' | 'student') {
  await page.goto('/landing');
  await page.getByText(role === 'staff' ? 'Staff Portal' : 'Student Portal', { exact: true }).click();
  await page.getByText(role === 'staff' ? 'LOG IN AS STAFF' : 'Log In', { exact: true }).click();
}

test('staff assignment, history, and manual call next stay consistent', async ({ page }) => {
  await signIn(page, 'staff');
  await expect(page.getByTestId('staff-dashboard').getByText('Window 3 - Registrar', { exact: true })).toBeVisible();
  await page.getByText('Profile', { exact: true }).click();
  await expect(page.getByText('Profile', { exact: true }).filter({ visible: true })).toHaveCount(1);
  await page.getByText('Window Assignment', { exact: true }).click();
  await page.getByText('Window 1 - Registrar', { exact: true }).last().click();
  await page.getByText('Queue', { exact: true }).filter({ visible: true }).last().click();
  await expect(page.getByTestId('staff-dashboard').getByText('Window 1 - Registrar', { exact: true })).toBeVisible();
  await expect(page.getByTestId('staff-dashboard').getByText('NO QUEUE', { exact: true })).toBeVisible();
  await expect(page.getByTestId('staff-dashboard').getByText('View Waiting Queue List (1)', { exact: true })).toBeVisible();
  await page.getByText('Profile', { exact: true }).filter({ visible: true }).last().click();
  await page.getByText('Window Assignment', { exact: true }).click();
  await page.getByText('Window 3 - Registrar', { exact: true }).last().click();
  await page.getByText('Queue', { exact: true }).filter({ visible: true }).last().click();

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('staff-dashboard').getByText('MARK AS DONE', { exact: true }).click();
  await expect(page.getByTestId('staff-dashboard').getByText('NO QUEUE', { exact: true })).toBeVisible();
  await page.getByText('History', { exact: true }).click();
  await expect(page.getByText('Queue History', { exact: true })).toBeVisible();
  await expect(page.getByText('R - 102', { exact: true }).filter({ visible: true })).toHaveCount(1);
  await page.getByText('Queue', { exact: true }).filter({ visible: true }).last().click();
  await expect(page.getByTestId('staff-dashboard').getByText('NO QUEUE', { exact: true })).toBeVisible();
  await page.getByTestId('staff-dashboard').getByText('CALL NEXT', { exact: true }).click();
  await expect(page.getByTestId('staff-dashboard').getByText('R - 105', { exact: true })).toBeVisible();
  await expect(page.getByTestId('staff-dashboard').getByText('View Waiting Queue List (0)', { exact: true })).toBeVisible();
});

test('student ticket status agrees across Home, Tickets, and Alerts', async ({ page }) => {
  await signIn(page, 'student');
  await expect(page.getByTestId('student-home').getByText('No ticket yet', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await expect(page.getByTestId('student-tickets').getByText('NOW IN QUEUE', { exact: true })).not.toBeVisible();
  await expect(page.getByTestId('student-tickets').getByText('No past tickets yet.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: /Alerts/ }).click();
  await expect(page.getByTestId('student-alerts').getByText('No notifications yet.', { exact: true })).toBeVisible();

  await page.getByRole('tab', { name: /Home/ }).click();
  await page.getByText('Certificate of Grades', { exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await expect(page.getByTestId('student-tickets').getByText('R - 106', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'View QR Ticket' })).toBeVisible();
  await page.getByRole('tab', { name: /Home/ }).click();
  await expect(page.getByTestId('student-home').getByText('R - 106', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Alerts/ }).click();
  await expect(page.getByTestId('student-alerts').getByText(/R - 106 for Certificate of Grades is waiting in line/).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await page.getByRole('button', { name: 'View QR Ticket' }).click();
  await page.getByText('Cancel Queue Ticket', { exact: true }).click();
  await page.getByText('Yes, Cancel Ticket', { exact: true }).click();
  await expect(page.getByTestId('student-tickets').getByText('NOW IN QUEUE', { exact: true })).not.toBeVisible();
  await page.getByRole('tab', { name: /Home/ }).click();
  await expect(page.getByTestId('student-home').getByText('No ticket yet', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Alerts/ }).click();
  await expect(page.getByTestId('student-alerts').getByText('Ticket cancelled', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('staff completion moves the requesting student ticket into history', async ({ page }) => {
  await page.goto('/landing');
  await page.getByText('Student Portal', { exact: true }).click();
  await page.getByPlaceholder('Enter your Student ID or Email').fill('2021-00123');
  await page.getByText('Log In', { exact: true }).click();
  await page.getByTestId('student-home').getByText('Student Record Update', { exact: true }).click();
  await page.getByText('Get Queue Number', { exact: true }).click();
  await expect(page.getByTestId('student-tickets').getByText('R - 106', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByText('Log Out', { exact: true }).click();

  await page.getByText('Staff Portal', { exact: true }).click();
  await page.getByText('LOG IN AS STAFF', { exact: true }).click();
  await page.getByText('Profile', { exact: true }).click();
  await page.getByText('Window Assignment', { exact: true }).click();
  await page.getByText('Window 4 - Registrar', { exact: true }).last().click();
  await page.getByText('Queue', { exact: true }).filter({ visible: true }).last().click();
  await expect(page.getByTestId('staff-dashboard').getByText('View Waiting Queue List (1)', { exact: true })).toBeVisible();
  page.on('dialog', (dialog) => dialog.accept());
  await page.getByTestId('staff-dashboard').getByText('CALL NEXT', { exact: true }).click();
  await expect(page.getByTestId('staff-dashboard').getByText('R - 106', { exact: true })).toBeVisible();
  await page.getByTestId('staff-dashboard').getByText('MARK AS DONE', { exact: true }).click();
  await page.getByText('History', { exact: true }).click();
  await expect(page.getByText('R - 106', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByText('Profile', { exact: true }).filter({ visible: true }).last().click();
  await page.getByText('Log Out', { exact: true }).click();

  await page.getByText('Student Portal', { exact: true }).click();
  await page.getByPlaceholder('Enter your Student ID or Email').fill('2021-00123');
  await page.getByText('Log In', { exact: true }).click();
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await expect(page.getByTestId('student-tickets').getByText('NOW IN QUEUE', { exact: true })).not.toBeVisible();
  await expect(page.getByTestId('student-tickets').getByText('R - 106', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByTestId('student-tickets').getByText('COMPLETED', { exact: true }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: /Alerts/ }).click();
  await expect(page.getByTestId('student-alerts').getByText('Ticket completed', { exact: true }).filter({ visible: true }).first()).toBeVisible();

  await page.getByRole('tab', { name: /Profile/ }).click();
  await page.getByText('Log Out', { exact: true }).click();
  await page.getByText('Student Portal', { exact: true }).click();
  await page.getByPlaceholder('Enter your Student ID or Email').fill('2021-00999');
  await page.getByText('Log In', { exact: true }).click();
  await page.getByRole('tab', { name: /Tickets/ }).click();
  await expect(page.getByTestId('student-tickets').getByText('R - 106', { exact: true })).not.toBeVisible();
  await expect(page.getByTestId('student-tickets').getByText('No past tickets yet.', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});
