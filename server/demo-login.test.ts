import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createApi } from './http';
import { Store } from './store';
import type { DemoAccount } from './demo-login';

const password = 'demo-test-password-123';

async function fixture(enabled = true) {
  const store = new Store(':memory:');
  const accounts: DemoAccount[] = [];
  for (const role of ['student', 'staff', 'admin'] as const) {
    const login = `demo-${role}`;
    await store.createAccount({ login, name: `Demo ${role}`, email: `${login}@example.test`, password }, role);
    accounts.push({ role, login, password });
  }
  const server = createApi(store, enabled ? accounts : []);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const post = (input: object) => fetch(`http://127.0.0.1:${address.port}/auth/demo-login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  const close = async () => { await new Promise<void>((resolve) => server.close(() => resolve())); store.close(); };
  return { store, accounts, post, close };
}

test('quick login creates real revocable sessions only for configured demo accounts', async () => {
  const { store, accounts, post, close } = await fixture();
  try {
    for (const account of accounts) {
      const response = await post({ role: account.role, login: 'forged-account', password: 'ignored' });
      assert.equal(response.status, 200);
      const session = await response.json();
      assert.equal(session.user.role, account.role);
      assert.equal(session.user.login, account.login);
      assert.equal(store.authenticate(session.token).id, session.user.id);
      assert.ok(!JSON.stringify(session).includes(password));
      store.logout(session.token);
      assert.throws(() => store.authenticate(session.token), /session has ended/);
    }
    assert.equal((await post({ role: 'superuser' })).status, 400);
    assert.equal((await post({})).status, 400);
    assert.equal((await post({ role: '__proto__' })).status, 400);
  } finally { await close(); }
});

test('quick login respects account disable, password changes and configured roles', async () => {
  const { store, accounts, post, close } = await fixture();
  try {
    const student = (await store.login({ portal: 'student', login: accounts[0].login, password })).user;
    await store.changePassword(student, { currentPassword: password, newPassword: 'changed-demo-password-123' });
    assert.equal((await post({ role: 'student' })).status, 401);
    store.db.prepare('UPDATE accounts SET active=0 WHERE login=?').run(accounts[1].login);
    assert.equal((await post({ role: 'staff' })).status, 401);
    store.db.prepare("UPDATE accounts SET role='student' WHERE login=?").run(accounts[2].login);
    assert.equal((await post({ role: 'admin' })).status, 403);
  } finally { await close(); }
});

test('quick login is disabled without explicit server accounts and in production', async () => {
  const disabled = await fixture(false);
  try { assert.equal((await disabled.post({ role: 'admin' })).status, 403); }
  finally { await disabled.close(); }

  const configured = await fixture();
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    assert.equal((await configured.post({ role: 'admin' })).status, 403);
  } finally {
    if (original === undefined) Reflect.deleteProperty(process.env, 'NODE_ENV');
    else process.env.NODE_ENV = original;
    await configured.close();
  }
});
