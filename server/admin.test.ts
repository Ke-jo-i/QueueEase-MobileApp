import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store, RequestError } from './store';
import { createApi } from './http';
import { registrarWindows } from '../src/constants/service-windows';

const password = 'admin-test-password-123';
async function fixture() {
  const store = new Store(':memory:');
  const student = await store.createAccount({ login: 'student1', name: 'Test Student', email: 'student@example.test', password });
  const staff = await store.createAccount({ login: 'staff1', name: 'Test Staff', email: 'staff@example.test', password }, 'staff');
  const admin = await store.createAccount({ login: 'admin1', name: 'Test Admin', email: 'admin@example.test', password }, 'admin');
  const session = await store.login({ login: admin.login, password, portal: 'staff' });
  const command = (user: typeof student, input: Record<string, unknown>) => store.command(user, input, randomUUID());
  const action = (input: Record<string, unknown>) => store.adminAction(admin, input, session.token);
  return { store, student, staff, admin, session, command, action };
}

test('admin-created accounts, identity edits and exclusive window assignments preserve history', async () => {
  const { store, staff, admin, action } = await fixture();
  try {
    await action({ type: 'ASSIGN_WINDOW', id: staff.id, window: registrarWindows[0] });
    const before = store.adminView();
    await assert.rejects(action({ type: 'CREATE_ACCOUNT', role: 'staff', login: 'staff2', name: 'Second Staff', email: 'staff2@example.test', password, window: registrarWindows[0] }), /Another staff/);
    assert.equal(store.adminView().accounts.length, before.accounts.length);
    assert.equal(store.adminView().audit.length, before.audit.length);
    await action({ type: 'CREATE_ACCOUNT', role: 'staff', login: 'staff2', name: 'Second Staff', email: 'staff2@example.test', password, window: registrarWindows[1] });
    await action({ type: 'CREATE_ACCOUNT', role: 'admin', login: 'admin2', name: 'Second Admin', email: 'admin2@example.test', password });
    await action({ type: 'UPDATE_ACCOUNT', id: staff.id, name: 'Updated Staff', email: 'updated@example.test', login: 'updated-staff-id' });
    assert.equal(store.account(staff.id).name, 'Updated Staff');
    assert.equal(store.account(staff.id).login, 'updated-staff-id');
    assert.equal(store.adminView().windows[1].staff?.login, 'staff2');
    await assert.rejects(action({ type: 'UPDATE_ACCOUNT', id: staff.id, name: 'Invalid', email: 'admin2@example.test' }), /already registered/);
    assert.equal(store.account(staff.id).name, 'Updated Staff');
    await action({ type: 'CREATE_ACCOUNT', role: 'student', login: 'student2', name: 'Student', email: 'student2@example.test', password });
    assert.equal(store.adminAccounts(admin, { role: 'student', search: 'student2' }).total, 1);
  } finally { store.close(); }
});

test('disabling accounts revokes sessions and cannot strand an active ticket or serving window', async () => {
  const { store, student, staff, command, action } = await fixture();
  try {
    await action({ type: 'ASSIGN_WINDOW', id: staff.id, window: registrarWindows[0] });
    const loggedStaff = await store.login({ login: staff.login, password, portal: 'staff' });
    const booked = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    await assert.rejects(action({ type: 'SET_ACTIVE', id: student.id, active: false }), /active ticket/);
    command(loggedStaff.user, { type: 'CALL_NEXT' });
    for (const input of [
      { type: 'SET_ACTIVE', id: staff.id, active: false },
      { type: 'RELEASE_WINDOW', id: staff.id },
      { type: 'ASSIGN_WINDOW', id: staff.id, window: registrarWindows[3] },
    ]) await assert.rejects(action(input), /Finish or transfer/);
    assert.equal(store.authenticate(loggedStaff.token).id, staff.id);
    command(loggedStaff.user, { type: 'ACT', action: 'COMPLETED', expectedTicketId: booked.ticketId });
    await action({ type: 'SET_ACTIVE', id: staff.id, active: false });
    assert.equal(store.account(staff.id).window, null);
    assert.throws(() => store.authenticate(loggedStaff.token), /session has ended/);
    await action({ type: 'SET_ACTIVE', id: staff.id, active: true });
    assert.equal(store.account(staff.id).active, 1);
    assert.throws(() => store.authenticate(loggedStaff.token), /session has ended/);
    assert.equal(store.adminView().records[0].status, 'COMPLETED');
  } finally { store.close(); }
});

test('administrator account protection prevents self-lockout and stale peer actions', async () => {
  const { store, admin, session, action } = await fixture();
  try {
    await assert.rejects(action({ type: 'SET_ACTIVE', id: admin.id, active: false }), /own account/);
    await assert.rejects(action({ type: 'RESET_PASSWORD', id: admin.id, password: 'changed-admin-password-123' }), /Profile/);
    const peer = await store.createAccount({ login: 'admin2', name: 'Peer Admin', email: 'peer@example.test', password }, 'admin');
    const peerSession = await store.login({ login: peer.login, password, portal: 'staff' });
    await store.adminAction(peer, { type: 'SET_ACTIVE', id: admin.id, active: false }, peerSession.token);
    await assert.rejects(store.adminAction(admin, { type: 'SET_ACTIVE', id: peer.id, active: false }, session.token), /session has ended/);
    assert.equal(store.adminView().accounts.filter(account => account.role === 'admin' && account.active).length, 1);
    await assert.rejects(store.adminAction(peer, { type: 'SET_ACTIVE', id: peer.id, active: false }, peerSession.token), /own account/);
  } finally { store.close(); }
});

test('password resets revoke sessions without exposing credentials in audit records', async () => {
  const { store, student, action } = await fixture();
  try {
    const session = await store.login({ login: student.login, password, portal: 'student' });
    const replacement = 'replacement-password-123';
    await action({ type: 'RESET_PASSWORD', id: student.id, password: replacement });
    assert.throws(() => store.authenticate(session.token), /session has ended/);
    await assert.rejects(store.login({ login: student.login, password, portal: 'student' }), /Incorrect/);
    assert.equal((await store.login({ login: student.login, password: replacement, portal: 'student' })).user.id, student.id);
    const audit = store.adminView().audit;
    assert.equal(audit[0].action, 'RESET_PASSWORD');
    assert.equal(audit[0].target, student.login);
    assert.deepEqual(audit[0].details, { sessionsRevoked: true });
    assert.ok(!JSON.stringify(audit).includes(replacement));
    assert.ok(!JSON.stringify(audit).includes(session.token));
  } finally { store.close(); }
});

test('service routing changes preserve issued tickets and create auditable registrar services', async () => {
  const { store, student, command, action } = await fixture();
  try {
    const original = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    await action({ type: 'SET_SERVICE', name: 'Academic Records Request', window: registrarWindows[3], enabled: false });
    assert.equal(store.adminView().records[0].window, registrarWindows[0]);
    assert.equal(store.adminView().records[0].id, original.ticketId);
    command(student, { type: 'CANCEL', reason: 'Changed request' });
    assert.throws(() => command(student, { type: 'BOOK', service: 'Academic Records Request' }), /unavailable/);
    await action({ type: 'CREATE_SERVICE', name: 'Graduation Clearance', window: registrarWindows[2], enabled: true });
    assert.ok(store.adminView().services.some(service => service.name === 'Graduation Clearance'));
    await assert.rejects(action({ type: 'CREATE_SERVICE', name: 'graduation clearance', window: registrarWindows[2], enabled: true }), /already exists/);
    await assert.rejects(action({ type: 'SET_SERVICE', name: 'Unknown Service', window: registrarWindows[0], enabled: true }), /not found/);
    assert.equal(store.adminView().records.length, 1);
  } finally { store.close(); }
});

test('admin mutation and audit insertion commit together; revocation during hashing prevents account creation', async () => {
  const { store, admin, session, action } = await fixture();
  try {
    const revision = store.view(admin).revision;
    store.db.exec("CREATE TRIGGER deny_audit BEFORE INSERT ON admin_audit BEGIN SELECT RAISE(ABORT, 'Audit unavailable'); END");
    await assert.rejects(action({ type: 'SET_ACCEPTING', accepting: false }), /Audit unavailable/);
    assert.equal(store.adminView().acceptingTickets, true);
    assert.equal(store.view(admin).revision, revision);
    store.db.exec('DROP TRIGGER deny_audit');
    const pending = action({ type: 'CREATE_ACCOUNT', role: 'admin', login: 'revoked-admin', name: 'Revoked Request', email: 'revoked@example.test', password });
    store.logout(session.token);
    await assert.rejects(pending, /session has ended/);
    assert.ok(!store.adminView().accounts.some(account => account.login === 'revoked-admin'));
    assert.equal(store.adminView().audit.length, 0);
    await assert.rejects(store.adminAction({ ...admin, role: 'admin' }, { type: 'SET_ACCEPTING', accepting: false }, session.token), /session has ended/);
  } finally { store.close(); }
});

test('real queue statistics and bounded history filters report saved tickets', async () => {
  const { store, student, staff, admin, command, action } = await fixture();
  try {
    await action({ type: 'ASSIGN_WINDOW', id: staff.id, window: registrarWindows[0] });
    const booked = command(student, { type: 'BOOK', service: 'Academic Records Request' });
    command(staff, { type: 'CALL_NEXT' });
    command(staff, { type: 'ACT', action: 'COMPLETED', expectedTicketId: booked.ticketId });
    const noon = new Date(); noon.setHours(12, 0, 0, 0);
    const finish = noon.toISOString();
    const called = new Date(noon.getTime() - 5 * 60000).toISOString();
    const created = new Date(noon.getTime() - 12 * 60000).toISOString();
    store.db.prepare('UPDATE tickets SET created_at=?,finished_at=? WHERE id=?').run(created, finish, booked.ticketId!);
    store.db.prepare("UPDATE ticket_events SET at=? WHERE ticket_id=? AND type='CREATED'").run(created, booked.ticketId!);
    store.db.prepare("UPDATE ticket_events SET at=? WHERE ticket_id=? AND type='CALLED'").run(called, booked.ticketId!);
    store.db.prepare("UPDATE ticket_events SET at=? WHERE ticket_id=? AND type='COMPLETED'").run(finish, booked.ticketId!);
    command(student, { type: 'BOOK', service: 'Certificate of Grades' });
    const report = store.adminView();
    assert.equal(report.statistics.requestedToday, 2);
    assert.equal(report.statistics.completedToday, 1);
    assert.equal(report.statistics.waiting, 1);
    assert.equal(report.statistics.averageWaitMinutes, 7);
    assert.equal(report.statistics.averageServiceMinutes, 5);
    assert.equal(report.windows[0].completedToday, 1);
    assert.equal(report.windows[1].waiting, 1);
    assert.equal(report.statistics.activeSessions, 1);
    const page = store.adminHistory(admin, { status: 'COMPLETED', window: registrarWindows[0], service: 'Academic Records Request', search: 'student1', from: report.statistics.date, to: report.statistics.date, page: 1, pageSize: 1 });
    assert.equal(page.total, 1); assert.equal(page.records[0].id, booked.ticketId);
    const next = store.adminHistory(admin, { page: 2, pageSize: 1 });
    assert.equal(next.total, 2); assert.equal(next.records[0].id, booked.ticketId);
    assert.equal(store.adminHistory(admin, { search: '%' }).total, 0);
    for (const input of [{ status: 'DELETE' }, { page: 0 }, { pageSize: 101 }, { from: '2026-02-30' }, { from: '2026-99-99' }, { from: '2026-12-01', to: '2026-01-01' }]) assert.throws(() => store.adminHistory(admin, input), RequestError);
    assert.throws(() => store.adminHistory(student, {}), /Administrator/);
  } finally { store.close(); }
});

test('admin history and audit HTTP endpoints require live administrator sessions', async () => {
  const { store, student, session, action } = await fixture();
  const server = createApi(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    await action({ type: 'SET_ACCEPTING', accepting: false });
    const studentSession = await store.login({ login: student.login, password, portal: 'student' });
    for (const path of ['/admin/overview', '/admin/history', '/admin/audit']) {
      assert.equal((await fetch(`${url}${path}`)).status, 401);
      assert.equal((await fetch(`${url}${path}`, { headers: { Authorization: `Bearer ${studentSession.token}` } })).status, 403);
    }
    const headers = { Authorization: `Bearer ${session.token}` };
    const overview = await fetch(`${url}/admin/overview`, { headers });
    assert.equal(overview.status, 200);
    const summary = await overview.json();
    assert.deepEqual(summary.statistics, store.adminView().statistics);
    assert.deepEqual(summary.windows, store.adminView().windows);
    assert.equal(summary.acceptingTickets, false);
    assert.equal(summary.records, undefined);
    assert.equal(summary.audit, undefined);
    assert.equal((await fetch(`${url}/admin/overview`, { method: 'POST', headers })).status, 405);
    const auditResponse = await fetch(`${url}/admin/audit?action=SET_ACCEPTING&pageSize=1`, { headers });
    assert.equal(auditResponse.status, 200);
    const audit = await auditResponse.json();
    assert.equal(audit.total, 1); assert.equal(audit.audit[0].actorLogin, 'admin1');
    assert.equal((await fetch(`${url}/admin/history?pageSize=200`, { headers })).status, 400);
    assert.equal((await fetch(`${url}/admin/history`, { method: 'POST', headers })).status, 405);
    store.logout(session.token);
    assert.equal((await fetch(`${url}/admin/audit`, { headers })).status, 401);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
    store.close();
  }
});
