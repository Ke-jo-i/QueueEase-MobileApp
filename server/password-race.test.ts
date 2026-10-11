import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApi } from './http';
import { RequestError, Store, type Account } from './store';

const password = 'password-race-test-123';
const replacement = 'replacement-race-test-123';

class PasswordRaceStore extends Store {
  passwordStarted = () => {};
  override changePassword(user: Account, input: Record<string, unknown>, token?: string) {
    const operation = super.changePassword(user, input, token);
    this.passwordStarted();
    return operation;
  }
}

async function fixture() {
  const store = new PasswordRaceStore(':memory:');
  const admin = await store.createAccount({ login: 'admin1', name: 'First Admin', email: 'first@example.test', password }, 'admin');
  const peer = await store.createAccount({ login: 'admin2', name: 'Peer Admin', email: 'peer@example.test', password }, 'admin');
  const session = await store.login({ portal: 'staff', login: admin.login, password });
  const peerSession = await store.login({ portal: 'staff', login: peer.login, password });
  const server = createApi(store);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  const headers = { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' };
  const hash = () => String(store.db.prepare('SELECT password_hash FROM accounts WHERE id=?').get(admin.id)!.password_hash);
  const startPasswordRequest = () => {
    let markStarted = () => {};
    const started = new Promise<void>(resolve => { markStarted = resolve; });
    store.passwordStarted = markStarted;
    const response = fetch(`${url}/auth/password`, { method: 'POST', headers, body: JSON.stringify({ currentPassword: password, newPassword: replacement }) });
    return { started, response };
  };
  const close = async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    store.close();
  };
  return { store, admin, peer, session, peerSession, hash, startPasswordRequest, close };
}

test('a pending HTTP password change cannot write after a peer administrator disables the requester', { timeout: 5000 }, async () => {
  const { store, admin, peer, peerSession, hash, startPasswordRequest, close } = await fixture();
  try {
    const previous = hash();
    const pending = startPasswordRequest();
    await pending.started;
    await store.adminAction(peer, { type: 'SET_ACTIVE', id: admin.id, active: false }, peerSession.token);
    const response = await pending.response;
    assert.equal(response.status, 401);
    assert.equal(store.account(admin.id).active, 0);
    assert.ok(hash() === previous, 'The revoked request must leave the password unchanged.');
  } finally { await close(); }
});

test('a pending HTTP password change revalidates the request token after logout', { timeout: 5000 }, async () => {
  const { store, admin, session, hash, startPasswordRequest, close } = await fixture();
  try {
    const previous = hash();
    const pending = startPasswordRequest();
    await pending.started;
    store.logout(session.token);
    const response = await pending.response;
    assert.equal(response.status, 401);
    assert.equal(store.account(admin.id).active, 1);
    assert.ok(hash() === previous, 'Logging out must prevent the pending password write.');
  } finally { await close(); }
});

test('a pending self-service password change cannot overwrite a peer administrator reset', { timeout: 5000 }, async () => {
  const { store, admin, peer, peerSession, session, close } = await fixture();
  try {
    const pending = store.changePassword(admin, { currentPassword: password, newPassword: replacement });
    const rejected = assert.rejects(pending, error => error instanceof RequestError && error.status === 409 && /credentials changed/.test(error.message));
    await store.adminAction(peer, { type: 'RESET_PASSWORD', id: admin.id, password: 'peer-reset-password-123' }, peerSession.token);
    await rejected;
    assert.throws(() => store.authenticate(session.token), /session has ended/);
    const fresh = await store.login({ portal: 'staff', login: admin.login, password: 'peer-reset-password-123' });
    assert.equal(fresh.user.id, admin.id);
    await assert.rejects(store.login({ portal: 'staff', login: admin.login, password: replacement }), /Incorrect/);
  } finally { await close(); }
});

test('an unchanged live password request succeeds and signs out every existing session', { timeout: 5000 }, async () => {
  const { store, admin, session, startPasswordRequest, close } = await fixture();
  try {
    const second = await store.login({ portal: 'staff', login: admin.login, password });
    const pending = startPasswordRequest();
    await pending.started;
    assert.equal((await pending.response).status, 200);
    for (const token of [session.token, second.token]) assert.throws(() => store.authenticate(token), /session has ended/);
    const fresh = await store.login({ portal: 'staff', login: admin.login, password: replacement });
    assert.equal(fresh.user.id, admin.id);
  } finally { await close(); }
});
