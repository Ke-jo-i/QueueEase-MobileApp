import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Store } from './store';
import { createApi } from './http';
import type { AdminAccountsPage } from '../src/data/admin-model';

test('account directory filters in SQLite, bounds pages and keeps workspace responses small', async () => {
  const store = new Store(':memory:');
  const password = 'directory-test-password-123';
  const admin = await store.createAccount({ login: 'admin', name: 'Administrator', email: 'admin@example.test', password }, 'admin');
  const student = await store.createAccount({ login: 'student', name: 'Student', email: 'student@example.test', password });
  const hash = store.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(student.id)!.password_hash;
  const insert = store.db.prepare('INSERT INTO accounts(id,login,email,name,role,password_hash,created_at,active) VALUES(?,?,?,?,?,?,?,?)');
  for (let i = 0; i < 34; i++) insert.run(`directory-${i}`, `student${i}`, `student${i}@example.test`, i === 33 ? 'Literal %_ person' : `Person ${i}`, 'student', hash, new Date().toISOString(), i % 2);
  const session = await store.login({ login: admin.login, password, portal: 'staff' });
  const server = createApi(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
  try {
    const response = await fetch(`${url}/admin/accounts?pageSize=10`, { headers });
    assert.equal(response.status, 200);
    const first = await response.json();
    assert.equal(first.accounts.length, 10); assert.equal(first.total, 36);
    const second = await (await fetch(`${url}/admin/accounts?pageSize=10&page=2`, { headers })).json();
    assert.equal(new Set([...first.accounts, ...second.accounts].map(account => account.id)).size, 20);
    const last = await (await fetch(`${url}/admin/accounts?pageSize=10&page=999`, { headers })).json();
    assert.equal(last.page, 4); assert.equal(last.accounts.length, 6);
    const filtered: AdminAccountsPage = await (await fetch(`${url}/admin/accounts?role=student&access=disabled`, { headers })).json();
    assert.equal(filtered.total, 17); assert.ok(filtered.accounts.every(account => account.role === 'student' && account.active === 0));
    const literal = await (await fetch(`${url}/admin/accounts?search=${encodeURIComponent('%_')}`, { headers })).json();
    assert.equal(literal.total, 1); assert.equal(literal.accounts[0].name, 'Literal %_ person');
    for (const query of ['role=owner', 'access=maybe', 'pageSize=101', 'page=-1']) assert.equal((await fetch(`${url}/admin/accounts?${query}`, { headers })).status, 400);
    const studentSession = await store.login({ login: student.login, password, portal: 'student' });
    assert.equal((await fetch(`${url}/admin/accounts`, { headers: { Authorization: `Bearer ${studentSession.token}` } })).status, 403);
    const workspace = await (await fetch(`${url}/admin?view=workspace`, { headers })).json();
    assert.equal(workspace.accounts.length, 1); assert.equal(workspace.accounts[0].id, admin.id);
    assert.deepEqual(workspace.records, []); assert.deepEqual(workspace.audit, []);
    const changed = await (await fetch(`${url}/admin?view=workspace`, { method: 'POST', headers, body: JSON.stringify({ type: 'SET_ACCEPTING', accepting: false }) })).json();
    assert.equal(changed.acceptingTickets, false); assert.equal(changed.accounts.length, 1);
    assert.deepEqual(changed.audit, []);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); store.close(); }
});
