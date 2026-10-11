import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store } from './store';
import { createApi } from './http';
import { registrarWindows } from '../src/constants/service-windows';

const password = 'window-test-password-123';
async function fixture(path = ':memory:') {
  const store = new Store(path);
  const student = await store.createAccount({ login: 'student1', name: 'Test Student', email: 'student@example.test', password });
  const second = await store.createAccount({ login: 'student2', name: 'Second Student', email: 'second@example.test', password });
  await store.createAccount({ login: 'staff1', name: 'Test Staff', email: 'staff@example.test', password }, 'staff');
  const staff = (await store.login({ login: 'staff1', password, portal: 'staff' })).user;
  const admin = await store.createAccount({ login: 'admin1', name: 'Test Admin', email: 'admin@example.test', password }, 'admin');
  const adminSession = await store.login({ login: 'admin1', password, portal: 'staff' });
  const command = (user: typeof student, input: Record<string, unknown>) => store.command(user, input, randomUUID());
  const action = (input: Record<string, unknown>) => store.adminAction(admin, input, adminSession.token);
  return { store, student, second, staff, admin, command, action };
}

test('taking one window offline blocks only its bookings and preserves existing tickets and individual service pauses', async () => {
  const { store, student, second, staff, command, action } = await fixture();
  try {
    const booked = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    const before = store.view(student).tickets;
    await action({ type: 'SET_SERVICE', name: 'Other Registrar Concern', window: registrarWindows[0], enabled: false });
    await action({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: 'Technical issue' });
    assert.deepEqual(store.view(student).tickets, before);
    const services = store.services();
    assert.equal(services.find(item => item.name === 'Academic Records Request')!.available, 0);
    assert.equal(services.find(item => item.name === 'Certificate of Grades')!.available, 1);
    assert.throws(() => command(second, { type: 'BOOK', service: 'Academic Records Request' }), /Window 1 is offline/);
    command(second, { type: 'BOOK', service: 'Certificate of Grades' });
    command(staff, { type: 'CALL_NEXT' });
    command(staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: booked.ticketId });
    assert.equal(store.view(student).tickets.find(item => item.id === booked.ticketId)!.status, 'COMPLETED');
    await action({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: true });
    assert.equal(store.services().find(item => item.name === 'Academic Records Request')!.available, 1);
    assert.equal(store.services().find(item => item.name === 'Other Registrar Concern')!.available, 0);
    assert.equal(store.adminView().audit[0].action, 'SET_WINDOW_AVAILABILITY');
  } finally { store.close(); }
});

test('window status requires a reason and authorized staff, updates all clients, and excludes offline transfer targets', async () => {
  const { store, student, staff, command, action } = await fixture();
  try {
    assert.throws(() => command(student, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: 'Staff shortage' }), /assigned staff/);
    assert.throws(() => command(staff, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[1], online: false, reason: 'Staff shortage' }), /assigned staff/);
    assert.throws(() => command(staff, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: '' }), /offline reason/);
    const ticket = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    command(staff, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: 'Staff shortage' });
    assert.equal(store.view(student).windows[0].online, false);
    assert.equal(store.adminOverview().windows[0].reason, 'Staff shortage');
    command(staff, { type: 'CALL_NEXT' });
    await action({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[1], online: false, reason: 'Technical issue' });
    assert.throws(() => command(staff, { type: 'TRANSFER', targetWindow: registrarWindows[1], expectedTicketId: ticket.ticketId }), /online window/);
    const transferred = command(staff, { type: 'TRANSFER', targetWindow: registrarWindows[2], expectedTicketId: ticket.ticketId });
    assert.equal(transferred.tickets.find(item => item.id === ticket.ticketId)!.window, registrarWindows[2]);
    const requestId = randomUUID();
    store.command(staff, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: true }, requestId);
    const revision = store.view(student).revision;
    store.command(staff, { type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: true }, requestId);
    assert.equal(store.view(student).revision, revision);
  } finally { store.close(); }
});

test('window availability and ticket history persist after restarting the database', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'queueease-windows-'));
  const path = join(directory, 'queue.sqlite');
  const { store, student, command, action } = await fixture(path);
  try {
    command(student, { type: 'BOOK', service: 'Academic Records Request' });
    await action({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: 'Closed for the day' });
  } finally { store.close(); }
  const reopened = new Store(path);
  try {
    assert.deepEqual(reopened.windows()[0], { window: registrarWindows[0], online: false, reason: 'Closed for the day' });
    assert.equal(reopened.view(student).tickets.length, 1);
  } finally { reopened.close(); rmSync(directory, { recursive: true, force: true }); }
});

test('the HTTP API enforces window availability for stale booking requests and rejects student window changes', async () => {
  const { store, action } = await fixture();
  const server = createApi(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address === 'object');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const login = await fetch(url + '/auth/login', { method: 'POST', body: JSON.stringify({ portal: 'student', login: 'student1', password }) });
    const { token } = await login.json() as { token: string };
    await action({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: false, reason: 'Staff shortage' });
    const headers = { Authorization: `Bearer ${token}`, 'X-Request-ID': randomUUID() };
    const booked = await fetch(url + '/queue/command', { method: 'POST', headers, body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }) });
    assert.equal(booked.status, 409);
    const changed = await fetch(url + '/queue/command', { method: 'POST', headers: { ...headers, 'X-Request-ID': randomUUID() }, body: JSON.stringify({ type: 'SET_WINDOW_AVAILABILITY', window: registrarWindows[0], online: true }) });
    assert.equal(changed.status, 403);
    assert.equal(store.windows()[0].online, false);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
