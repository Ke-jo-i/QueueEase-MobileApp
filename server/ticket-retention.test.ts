import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { createApi } from './http';
import { Store } from './store';
import { registrarWindows } from '../src/constants/service-windows';
import { isActiveTicket, type Ticket } from '../src/data/queue-model';

async function fixture() {
  const store = new Store(':memory:');
  const password = 'ticket-retention-test-password';
  await store.createAccount({ login: 'student1', name: 'Test Student', email: 'student@example.test', password });
  await store.createAccount({ login: 'staff1', name: 'Test Staff', email: 'staff@example.test', password }, 'staff');
  const students = await Promise.all([0, 1].map(() => store.login({ login: 'student1', password, portal: 'student' })));
  const staff = await store.login({ login: 'staff1', password, portal: 'staff' });
  const server = createApi(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const command = (token: string, input: object) => fetch(`${url}/queue/command`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-ID': randomUUID() }, body: JSON.stringify(input),
  });
  const execute = async (token: string, input: object) => {
    const response = await command(token, input);
    assert.equal(response.status, 200);
    return await response.json() as { tickets: Ticket[]; ticketId: string; revision: number };
  };
  const view = async (token: string) => {
    const response = await fetch(`${url}/queue`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 200);
    return await response.json() as { tickets: Ticket[]; revision: number };
  };
  const close = async () => { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); };
  return { store, students, staff, command, execute, view, close };
}

test('two sessions keep the same waiting and held ticket across concerns and retain history on later bookings', async () => {
  const { store, students, staff, command, execute, view, close } = await fixture();
  try {
    const first = await execute(students[0].token, { type: 'BOOK', service: 'Academic Records Request' });
    for (const status of ['WAITING', 'HELD']) {
      if (status === 'HELD') {
        await execute(staff.token, { type: 'CALL_NEXT' });
        await execute(staff.token, { type: 'ACT', action: 'HELD', expectedTicketId: first.ticketId, reason: 'Bring supporting documents' });
      }
      const before = store.snapshot();
      const rejected = await Promise.all(students.map((session, index) => command(session.token, { type: 'BOOK', service: index ? 'Certificate of Grades' : 'Enrollment Concern' })));
      assert.deepEqual(rejected.map(response => response.status), [409, 409]);
      assert.deepEqual(store.snapshot(), before);
      for (const session of students) {
        const current = await view(session.token);
        assert.equal(current.tickets.filter(isActiveTicket).length, 1);
        assert.equal(current.tickets[0].id, first.ticketId);
        assert.equal(current.tickets[0].service, 'Academic Records Request');
        assert.equal(current.tickets[0].status, status);
      }
    }
    await execute(staff.token, { type: 'REOPEN', number: 'R - 1' });
    await execute(staff.token, { type: 'CALL_NEXT' });
    await execute(staff.token, { type: 'ACT', action: 'COMPLETED', expectedTicketId: first.ticketId });
    const completed = store.snapshot().tickets[0];
    const second = await execute(students[1].token, { type: 'BOOK', service: 'Certificate of Grades' });
    assert.equal(second.ticketId, 'ticket-2');
    assert.deepEqual(store.snapshot().tickets[0], completed);
    await execute(students[0].token, { type: 'CANCEL', reason: 'Concern already resolved' });
    const cancelled = store.snapshot().tickets[1];
    const third = await execute(students[1].token, { type: 'BOOK', service: 'Enrollment Concern' });
    assert.equal(third.ticketId, 'ticket-3');
    assert.deepEqual(store.snapshot().tickets.slice(0, 2), [completed, cancelled]);
    for (const session of students) {
      const current = await view(session.token);
      assert.deepEqual(current.tickets.map(ticket => [ticket.id, ticket.service, ticket.status]), [
        ['ticket-1', 'Academic Records Request', 'COMPLETED'],
        ['ticket-2', 'Certificate of Grades', 'CANCELLED'],
        ['ticket-3', 'Enrollment Concern', 'WAITING'],
      ]);
      assert.equal(current.tickets.filter(isActiveTicket).length, 1);
      assert.ok(current.tickets.every(ticket => ticket.ownerId === session.user.login));
    }
  } finally { await close(); }
});

test('simultaneous bookings for different concerns from the same account create one unchanged ticket', async () => {
  const { store, students, command, view, close } = await fixture();
  try {
    const concerns = ['Academic Records Request', 'Certificate of Grades'];
    const responses = await Promise.all(students.map((session, index) => command(session.token, { type: 'BOOK', service: concerns[index] })));
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 409]);
    const winner = responses.findIndex(response => response.status === 200);
    const result = await responses[winner].json() as { ticketId: string };
    const stored = store.snapshot();
    assert.equal(stored.tickets.length, 1);
    assert.equal(stored.nextNumber, 2);
    assert.equal(stored.tickets[0].id, result.ticketId);
    assert.equal(stored.tickets[0].service, concerns[winner]);
    assert.deepEqual(stored.tickets[0].events.map(event => event.type), ['CREATED']);
    for (const session of students) assert.equal((await view(session.token)).tickets[0].id, result.ticketId);
    assert.deepEqual(store.snapshot(), stored);
  } finally { await close(); }
});

test('configured services book at their assigned window and cannot replace an active concern', async () => {
  const { store, students, command, execute, close } = await fixture();
  try {
    store.db.prepare('INSERT INTO services(name,window,enabled) VALUES(?,?,1)').run('Document Authentication', registrarWindows[3]);
    const booking = await execute(students[0].token, { type: 'BOOK', service: 'Document Authentication', window: registrarWindows[0] });
    assert.equal(booking.tickets[0].service, 'Document Authentication');
    assert.equal(booking.tickets[0].window, registrarWindows[3]);
    assert.equal(booking.tickets[0].events[0].window, registrarWindows[3]);
    const before = store.snapshot();
    assert.equal((await command(students[1].token, { type: 'BOOK', service: 'Certificate of Grades' })).status, 409);
    assert.deepEqual(store.snapshot(), before);
    await execute(students[1].token, { type: 'CANCEL', reason: 'No longer needed' });
    store.db.prepare('UPDATE services SET enabled=0 WHERE name=?').run('Document Authentication');
    assert.equal((await command(students[0].token, { type: 'BOOK', service: 'Document Authentication' })).status, 400);
    assert.equal(store.snapshot().tickets[0].status, 'CANCELLED');
  } finally { await close(); }
});
