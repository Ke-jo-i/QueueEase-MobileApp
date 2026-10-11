import { test, expect, login, password } from './fixtures';
import type { Page } from '@playwright/test';

async function signIn(apiUrl: string, role: 'student' | 'staff' | 'admin') {
  const result = await fetch(apiUrl + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: role === 'admin' ? 'admin' : `${role}1`, password, portal: role === 'student' ? 'student' : 'staff' }) });
  expect(result.status).toBe(200);
  return (await result.json()).token as string;
}

async function command(apiUrl: string, token: string, body: object, path = '/queue/command') {
  const result = await fetch(apiUrl + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-ID': crypto.randomUUID() }, body: JSON.stringify(body) });
  expect(result.status).toBe(200);
  return result.json();
}

async function captureSpeech(page: Page) {
  await page.addInitScript(() => {
    const events = { calls: [] as string[], stops: 0 };
    Object.defineProperty(window, 'queueCallEvents', { value: events });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      cancel: () => { events.stops++; },
      speak: (utterance: SpeechSynthesisUtterance) => { events.calls.push(utterance.text); utterance.dispatchEvent(new Event('end')); },
      getVoices: () => [],
    } });
  });
}

const spokenCalls = (page: Page) => page.evaluate(() => (window as unknown as { queueCallEvents: { calls: string[] } }).queueCallEvents.calls);

test('admin window availability disables only routed services and restores enabled services across a student session', async ({ page, browser, connect, apiUrl }) => {
  const studentContext = await browser.newContext();
  await connect(studentContext);
  try {
    const student = await studentContext.newPage();
    await login(student);
    await student.getByRole('button', { name: 'Certificate of Enrollment', exact: true }).click();
    await login(page, 'admin');
    const admin = await signIn(apiUrl, 'admin');
    await command(apiUrl, admin, { type: 'SET_SERVICE', name: 'Certificate of Grades', window: 'Window 2 - Registrar', enabled: false }, '/admin');
    await page.getByRole('button', { name: 'Manage availability for Window 3', exact: true }).click();
    await page.getByRole('button', { name: 'Technical issue', exact: true }).click();
    await page.getByRole('button', { name: 'Mark Window 3 offline', exact: true }).click();
    await expect(student.getByRole('button', { name: 'Service unavailable', exact: true })).toBeDisabled();
    await expect(student.getByText('Technical issue', { exact: true })).toBeVisible();
    await student.getByRole('button', { name: 'Back', exact: true }).click();
    for (const name of ['Certificate of Enrollment', 'Enrollment Concern', 'Other Registrar Concern']) await expect(student.getByRole('button', { name, exact: true })).toBeDisabled();
    for (const name of ['Academic Records Request', 'Student Record Update']) await expect(student.getByRole('button', { name, exact: true })).toBeEnabled();
    await expect(student.getByRole('button', { name: 'Certificate of Grades', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Manage availability for Window 3', exact: true }).click();
    await page.getByRole('button', { name: 'Bring Window 3 online', exact: true }).click();
    await expect(student.getByRole('button', { name: 'Certificate of Enrollment', exact: true })).toBeEnabled();
    await expect(student.getByRole('button', { name: 'Certificate of Grades', exact: true })).toBeDisabled();
  } finally { await studentContext.close(); }
});

test('staff can mark their own window offline while existing tickets retain QR, progress, cancellation and serving actions', async ({ page, browser, connect, apiUrl }) => {
  const studentToken = await signIn(apiUrl, 'student');
  await command(apiUrl, studentToken, { type: 'BOOK', service: 'Academic Records Request' });
  const studentContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await connect(studentContext);
  try {
    const student = await studentContext.newPage();
    await login(student);
    await student.getByRole('tab', { name: 'Tickets', exact: true }).click();
    await captureSpeech(page);
    await login(page, 'staff');
    await page.getByRole('button', { name: 'Manage availability for Window 1', exact: true }).click();
    await page.getByRole('button', { name: 'Staff shortage', exact: true }).click();
    await page.getByRole('button', { name: 'Mark Window 1 offline', exact: true }).click();
    await expect(page.getByTestId('staff-window-offline')).toContainText('Staff shortage');
    await expect(student.getByText('Window 1 is offline · Staff shortage. Your ticket remains active.', { exact: true })).toBeVisible();
    const progress = student.getByTestId('student-tickets').getByRole('button', { name: 'View queue progress', exact: true });
    const qr = student.getByRole('button', { name: 'View QR Ticket', exact: true });
    const cancel = student.getByRole('button', { name: 'Cancel ticket', exact: true });
    await expect(qr).toBeEnabled();
    await expect(cancel).toBeEnabled();
    const positions = await Promise.all([progress.boundingBox(), qr.boundingBox(), cancel.boundingBox()]);
    expect(positions[0]!.y + positions[0]!.height).toBeLessThan(positions[1]!.y);
    expect(positions[1]!.y + positions[1]!.height).toBeLessThan(positions[2]!.y);
    await student.screenshot({ path: '.local/screenshots/ticket-window-offline.png', animations: 'disabled' });
    await page.getByRole('button', { name: 'Call Next', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Mark as Done', exact: true })).toBeEnabled();
    await expect(student.getByRole('button', { name: 'Cancel ticket', exact: true })).toHaveCount(0);
    await expect(student.getByText('SERVING', { exact: true })).toBeVisible();
  } finally { await studentContext.close(); }
});

test('Call Next and Recall speak the saved ticket and window, while muted and failed calls do not speak', async ({ page, apiUrl }) => {
  await captureSpeech(page);
  await login(page, 'staff');
  const token = await signIn(apiUrl, 'student');
  await command(apiUrl, token, { type: 'BOOK', service: 'Academic Records Request' });
  await expect(page.getByRole('button', { name: 'Call Next', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Call Next', exact: true }).click();
  await expect.poll(() => spokenCalls(page)).toEqual(['R 1. Please proceed to Window 1.']);
  await page.getByRole('button', { name: 'Recall', exact: true }).click();
  await expect.poll(() => spokenCalls(page)).toHaveLength(2);
  await page.getByRole('switch', { name: 'Spoken announcements', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Spoken announcements', exact: true })).not.toBeChecked();
  await page.getByRole('button', { name: 'Recall', exact: true }).click();
  await expect.poll(async () => {
    const saved = await fetch(apiUrl + '/queue', { headers: { Authorization: `Bearer ${token}` } });
    return (await saved.json()).tickets[0].events.filter((event: { type: string }) => event.type === 'RECALLED').length;
  }).toBe(2);
  expect(await spokenCalls(page)).toHaveLength(2);
  await page.getByRole('switch', { name: 'Spoken announcements', exact: true }).click();
  await page.route('**/queue/command', route => route.fulfill({ status: 409, json: { message: 'This ticket has changed. Refresh and try again.' } }));
  await page.getByRole('button', { name: 'Recall', exact: true }).click();
  await expect(page.getByText('This ticket has changed. Refresh and try again.', { exact: true })).toBeVisible();
  expect(await spokenCalls(page)).toHaveLength(2);
});
