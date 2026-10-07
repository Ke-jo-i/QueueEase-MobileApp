import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Store } from './store';
import { createApi } from './http';

async function fixture() {
  const parent = mkdtempSync(join(tmpdir(), 'queueease-web-'));
  assert.ok(resolve(parent).startsWith(join(resolve(tmpdir()), 'queueease-web-')));
  const root = join(parent, 'site');
  mkdirSync(join(root, 'staff'), { recursive: true });
  mkdirSync(join(root, '_expo', 'static'), { recursive: true });
  writeFileSync(join(root, 'index.html'), '<html>Queue Ease website</html>');
  writeFileSync(join(root, 'admin.html'), '<html>Administrator sign-in</html>');
  writeFileSync(join(root, 'staff', 'history.html'), '<html>Queue history</html>');
  writeFileSync(join(root, '+not-found.html'), '<html>Page not found</html>');
  writeFileSync(join(root, '_expo', 'static', 'bundle.js'), 'const app = "Queue Ease";');
  writeFileSync(join(parent, 'private.txt'), 'private-test-data');
  const store = new Store(':memory:');
  const password = 'website-test-password-123';
  await store.createAccount({ login: 'student1', name: 'Web Student', email: 'student1@example.test', password });
  await store.createAccount({ login: 'admin', name: 'Web Admin', email: 'admin@example.test', password }, 'admin');
  const server = createApi(store, [], root);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const post = (path: string, input: object, token?: string) => fetch(`${origin}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(input),
  });
  const close = async () => {
    await new Promise<void>(resolve => server.close(() => resolve()));
    store.close();
    rmSync(parent, { recursive: true, force: true });
  };
  return { origin, post, password, close };
}

test('website serves deep links, assets, HEAD and genuine 404s without exposing outside files', async () => {
  const { origin, close } = await fixture();
  try {
    for (const [path, text] of [['/', 'Queue Ease website'], ['/staff/history?filter=today', 'Queue history'], ['/admin', 'Administrator sign-in']]) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /text\/html/);
      assert.match(await response.text(), new RegExp(text));
    }
    const asset = await fetch(`${origin}/_expo/static/bundle.js`);
    assert.match(asset.headers.get('content-type') ?? '', /javascript/);
    assert.match(asset.headers.get('cache-control') ?? '', /immutable/);
    for (const path of ['/staff/history', '/admin']) {
      const head = await fetch(`${origin}${path}`, { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.match(head.headers.get('content-type') ?? '', /text\/html/);
      assert.equal(await head.text(), '');
    }
    const missing = await fetch(`${origin}/missing-route`);
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /Page not found/);
    assert.equal((await fetch(`${origin}/..%2fprivate.txt`)).status, 403);
    assert.equal((await fetch(`${origin}/%00`)).status, 403);
    assert.equal((await fetch(`${origin}/%invalid`)).status, 400);
    assert.equal((await fetch(`${origin}/landing`, { method: 'POST' })).status, 405);
  } finally { await close(); }
});

test('website API prefix and original mobile endpoints share authentication and queue records', async () => {
  const { origin, post, password, close } = await fixture();
  try {
    assert.equal((await fetch(`${origin}/api/queue`)).status, 401);
    assert.equal((await fetch(`${origin}/queue`)).status, 401);
    assert.equal((await post('/api/auth/demo-login', { role: 'student' })).status, 403);
    const login = await post('/api/auth/login', { portal: 'student', login: 'student1', password });
    assert.equal(login.status, 200);
    const { token } = await login.json();
    const booking = await fetch(`${origin}/api/queue/command`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Request-ID': 'web-booking-123' },
      body: JSON.stringify({ type: 'BOOK', service: 'Academic Records Request' }),
    });
    assert.equal(booking.status, 200);
    const mobile = await fetch(`${origin}/queue`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal((await mobile.json()).tickets[0].number, 'R - 1');
    const adminLogin = await post('/auth/login', { portal: 'staff', login: 'admin', password });
    const admin = await adminLogin.json();
    for (const path of ['/api/admin', '/admin']) {
      const response = await fetch(`${origin}${path}`, { headers: { Authorization: `Bearer ${admin.token}` } });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type') ?? '', /application\/json/);
      assert.equal((await response.json()).records.length, 1);
    }
    assert.equal((await fetch(`${origin}/health`)).status, 200);
    assert.equal((await fetch(`${origin}/api/health`)).status, 200);
  } finally { await close(); }
});
