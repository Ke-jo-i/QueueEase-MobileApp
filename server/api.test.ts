import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Store, RequestError } from './store';
import { createApi } from './http';
import { registrarWindows } from '../src/constants/service-windows';

const password = 'test-only-password-123';
async function fixture() {
  const store = new Store(':memory:');
  const student = await store.createAccount({ login: 'student1', name: 'Test Student', email: 'student@example.test', password });
  const other = await store.createAccount({ login: 'student2', name: 'Other Student', email: 'other@example.test', password });
  await store.createAccount({ login: 'staff1', name: 'Test Staff', email: 'staff@example.test', password }, 'staff');
  const staff = (await store.login({ login: 'staff1', password, portal: 'staff' })).user;
  const admin = await store.createAccount({ login: 'admin', name: 'Admin', email: 'admin@example.test', password }, 'admin');
  const command = (user: typeof student, input: object) => store.command(user, input as Record<string, unknown>, randomUUID());
  return { store, student, other, staff, admin, command };
}

test('password verification, portal roles, logout and password change revoke sessions', async () => {
  const { store, student } = await fixture();
  try {
    await assert.rejects(store.login({ login: student.login, password: 'wrong', portal: 'student' }), /Incorrect/);
    await assert.rejects(store.login({ login: student.login, password, portal: 'staff' }), /correct portal/);
    const session = await store.login({ login: student.email, password, portal: 'student' });
    assert.equal(store.authenticate(session.token).id, student.id);
    assert.ok(!JSON.stringify(store.adminView()).includes('password_hash'));
    store.logout(session.token);
    assert.throws(() => store.authenticate(session.token), /session has ended/);
    const next = await store.login({ login: student.login, password, portal: 'student' });
    await store.changePassword(student, { currentPassword: password, newPassword: 'changed-password-123' });
    assert.throws(() => store.authenticate(next.token), /session has ended/);
    await assert.rejects(store.login({ login: student.login, password, portal: 'student' }), /Incorrect/);
  } finally { store.close(); }
});

test('student ownership is taken from authentication; other students cannot read private records or use staff actions', async () => {
  const { store, student, other, command } = await fixture();
  try {
    command(student, { type: 'BOOK', service: 'Academic Records Request', ownerId: other.id });
    const ticket = store.view(student).tickets[0];
    assert.equal(ticket.ownerId, student.login);
    const visible = store.view(other).tickets[0];
    assert.equal(visible.ownerId, undefined); assert.deepEqual(visible.events, []);
    assert.throws(() => command(other, { type: 'CANCEL', ownerId: student.id, reason: 'Forged request' }), /Only waiting/);
    assert.throws(() => command(student, { type: 'CALL_NEXT' }), /Staff access/);
    command(student, { type: 'CANCEL', reason: 'Changed plans' });
    assert.equal(store.view(other).tickets.length, 0);
  } finally { store.close(); }
});

test('duplicate requests, active ticket constraint and stale staff actions preserve queue order', async () => {
  const { store, student, other, staff, command } = await fixture();
  try {
    const id = randomUUID();
    const first = store.command(student, { type: 'BOOK', service: 'Academic Records Request' }, id);
    const retry = store.command(student, { type: 'BOOK', service: 'Academic Records Request' }, id);
    assert.equal(first.ticketId, retry.ticketId); assert.equal(store.snapshot().tickets.length, 1);
    assert.throws(() => command(student, { type: 'BOOK', service: 'Academic Records Request' }), /already have/);
    command(other, { type: 'BOOK', service: 'Academic Records Request' });
    const called = command(staff, { type: 'CALL_NEXT' });
    assert.equal(called.ticketId, first.ticketId);
    assert.throws(() => command(staff, { type: 'CALL_NEXT' }), /Finish the current/);
    command(staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: first.ticketId });
    assert.equal(store.snapshot().tickets.filter((ticket) => ticket.status === 'SERVING').length, 0);
    command(staff, { type: 'CALL_NEXT' });
    assert.throws(() => command(staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: first.ticketId }), /has changed/);
    assert.equal(store.snapshot().tickets[1].status, 'SERVING');
    assert.equal(store.view(student).tickets.find((ticket) => ticket.id === first.ticketId)?.status, 'COMPLETED');
  } finally { store.close(); }
});

test('staff window assignments are exclusive and cannot leave an active transaction', async () => {
  const { store, staff, student, command } = await fixture();
  try {
    await store.createAccount({ login: 'staff2', name: 'Second Staff', email: 'staff2@example.test', password }, 'staff');
    const second = (await store.login({ login: 'staff2', password, portal: 'staff' })).user;
    assert.equal(staff.window, registrarWindows[0]); assert.equal(second.window, registrarWindows[1]);
    assert.throws(() => command(second, { type: 'ASSIGN', window: registrarWindows[0] }), /Another staff/);
    command(student, { type: 'BOOK', service: 'Academic Records Request' }); command(staff, { type: 'CALL_NEXT' });
    assert.throws(() => command(staff, { type: 'ASSIGN', window: registrarWindows[3] }), /Finish or transfer/);
  } finally { store.close(); }
});

test('administrator pause, service routing and account disable are enforced', async () => {
  const { store, student, staff, admin, command } = await fixture();
  try {
    await assert.rejects(store.adminAction(staff, { type: 'SET_ACCEPTING', accepting: false }), /Administrator/);
    await store.adminAction(admin, { type: 'SET_ACCEPTING', accepting: false });
    assert.throws(() => command(student, { type: 'BOOK', service: 'Academic Records Request' }), /paused/);
    await store.adminAction(admin, { type: 'SET_ACCEPTING', accepting: true });
    await store.adminAction(admin, { type: 'SET_SERVICE', name: 'Academic Records Request', window: registrarWindows[3], enabled: true });
    assert.equal(command(student, { type: 'BOOK', service: 'Academic Records Request' }).tickets[0].window, registrarWindows[3]);
    const session = await store.login({ login: student.login, password, portal: 'student' });
    await store.adminAction(admin, { type: 'SET_ACTIVE', id: student.id, active: false });
    assert.throws(() => store.authenticate(session.token), /session has ended/);
  } finally { store.close(); }
});

test('database persists accounts, tickets and audit events after reopening', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'queueease-test-')); const path = join(directory, 'queue.sqlite');
  let store = new Store(path);
  try {
    const user = await store.createAccount({ login: 'persistent', name: 'Student', email: 'persist@example.test', password });
    store.command(user, { type: 'BOOK', service: 'Certificate of Grades' }, randomUUID());
    store.close(); store = new Store(path);
    const session = await store.login({ login: user.login, password, portal: 'student' });
    assert.equal(store.view(session.user).tickets[0].events[0].type, 'CREATED');
    assert.equal(store.snapshot().nextNumber, 2);
  } finally { store.close(); rmSync(directory, { recursive: true }); }
});

test('HTTP API rejects unauthenticated access and concurrent bookings create one ticket', async () => {
  const { store, student } = await fixture(); const server = createApi(store);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal((await fetch(`${url}/queue`)).status, 401);
    const session = await store.login({ login: student.login, password, portal: 'student' });
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` };
    const results = await Promise.all(Array.from({ length: 5 }, () => fetch(`${url}/queue/command`, { method: 'POST', headers: { ...headers, 'X-Request-ID': randomUUID() }, body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }) })));
    assert.equal(results.filter((response) => response.status === 200).length, 1);
    assert.equal(store.snapshot().tickets.length, 1);
    assert.equal((await fetch(`${url}/admin`, { headers })).status, 403);
    const invalid = await fetch(`${url}/queue/command`, { method: 'POST', headers, body: '{invalid' }); assert.equal(invalid.status, 400);
    assert.equal((await fetch(`${url}/health`, { headers: { Origin: 'https://unrelated.example' } })).status, 403);
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); store.close(); }
});

test('unsupported actions do not mutate stored tickets', async () => {
  const { store, staff, student, command } = await fixture();
  try {
    const booking = command(student, { type: 'BOOK', service: 'Academic Records Request' }); command(staff, { type: 'CALL_NEXT' });
    const before = JSON.stringify(store.snapshot());
    assert.throws(() => command(staff, { type: 'ACT', action: 'DELETE', expectedTicketId: booking.ticketId }), RequestError);
    assert.equal(JSON.stringify(store.snapshot()), before);
  } finally { store.close(); }
});

test('arrival confirmation records an event without calling or completing another ticket', async () => {
  const { store, staff, student, command } = await fixture();
  try {
    const booked = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    assert.throws(() => command(staff, { type: 'ACT', action: 'CHECKED_IN', expectedTicketId: booked.ticketId }), /has changed/);
    command(staff, { type: 'CALL_NEXT' });
    command(staff, { type: 'ACT', action: 'CHECKED_IN', expectedTicketId: booked.ticketId });
    assert.equal(store.snapshot().tickets[0].status, 'SERVING');
    assert.equal(store.snapshot().tickets[0].events.at(-1)?.type, 'CHECKED_IN');
    assert.throws(() => command(staff, { type: 'ACT', action: 'CHECKED_IN', expectedTicketId: booked.ticketId }), /already confirmed/);
    command(staff, { type: 'ACT', action: 'HELD', reason: 'Needs another document', expectedTicketId: booked.ticketId });
    command(staff, { type: 'REOPEN', number: 'R - 1' }); command(staff, { type: 'CALL_NEXT' });
    command(staff, { type: 'ACT', action: 'CHECKED_IN', expectedTicketId: booked.ticketId });
    assert.equal(store.snapshot().tickets[0].events.filter((event) => event.type === 'CHECKED_IN').length, 2);
  } finally { store.close(); }
});
