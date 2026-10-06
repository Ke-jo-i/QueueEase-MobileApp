import { createServer, type IncomingMessage } from 'node:http';
import { Store, RequestError, check } from './store';
import type { DemoAccount } from './demo-login';

async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    check(size <= 8192, 'Request is too large.', 413);
    chunks.push(bytes);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  let value;
  try { value = JSON.parse(raw || '{}'); } catch { throw new RequestError(400, 'Invalid request.'); }
  check(value && typeof value === 'object' && !Array.isArray(value), 'Invalid request.');
  return value;
}

export function createApi(store: Store, demoAccounts: readonly DemoAccount[] = []) {
  const attempts = new Map<string, { count: number; expires: number }>();
  return createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      if (req.headers.origin) {
        const origin = new URL(req.headers.origin);
        const host = new URL(`http://${req.headers.host}`).hostname;
        const configured = (process.env.QUEUE_ALLOWED_ORIGINS ?? '').split(',');
        check(origin.hostname === host || configured.includes(origin.origin), 'This app origin is not allowed.', 403);
        res.setHeader('Access-Control-Allow-Origin', origin.origin);
        res.setHeader('Vary', 'Origin');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-ID');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      }
      if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      if (path === '/health' && req.method === 'GET') { res.end(JSON.stringify({ ok: true, service: 'QueueEase', version: 1 })); return; }
      check(req.method === 'GET' || req.method === 'POST', 'Method not allowed.', 405);
      const input = req.method === 'POST' ? await body(req) : {};
      let result: unknown;
      if (['/auth/login', '/auth/register', '/auth/demo-login'].includes(path) && req.method === 'POST') {
        const now = Date.now();
        for (const [key, value] of attempts) if (value.expires <= now) attempts.delete(key);
        const key = req.socket.remoteAddress ?? 'unknown';
        const attempt = attempts.get(key) ?? { count: 0, expires: now + 15 * 60 * 1000 };
        check(attempt.count < 40, 'Too many attempts. Please try again in 15 minutes.', 429);
        attempt.count++; attempts.set(key, attempt);
        if (path === '/auth/demo-login') {
          check(process.env.NODE_ENV !== 'production' && demoAccounts.length > 0, 'Quick login is disabled on this server. Use your ID and password.', 403);
          check(input.role === 'student' || input.role === 'staff' || input.role === 'admin', 'Choose a valid demo account.');
          const account = demoAccounts.find((item) => item.role === input.role);
          check(account, 'That demo account is unavailable. Use your ID and password.', 403);
          const row = store.db.prepare('SELECT role FROM accounts WHERE login=?').get(account.login);
          check(row?.role === account.role, 'That demo account is unavailable. Use your ID and password.', 403);
          const session = await store.login({ portal: account.role === 'student' ? 'student' : 'staff', login: account.login, password: account.password });
          if (session.user.role !== account.role) {
            store.logout(session.token);
            throw new RequestError(403, 'That demo account is unavailable. Use your ID and password.');
          }
          result = session;
        } else result = path === '/auth/login' ? await store.login(input) : await store.createAccount(input);
      } else {
        const token = req.headers.authorization?.replace(/^Bearer /, '') ?? '';
        const user = store.authenticate(token);
        if (path === '/auth/me' && req.method === 'GET') result = user;
        else if (path === '/auth/logout' && req.method === 'POST') { store.logout(token); result = { ok: true }; }
        else if (path === '/auth/password' && req.method === 'POST') { await store.changePassword(user, input); result = { ok: true }; }
        else if (path === '/queue' && req.method === 'GET') result = store.view(user);
        else if (path === '/queue/command' && req.method === 'POST') result = store.command(user, input, String(req.headers['x-request-id'] ?? ''));
        else if (path === '/admin') {
          check(user.role === 'admin', 'Administrator access is required.', 403);
          result = req.method === 'GET' ? store.adminView() : await store.adminAction(user, input);
        } else throw new RequestError(404, 'Endpoint not found.');
      }
      res.end(JSON.stringify(result));
    } catch (error) {
      const known = error instanceof RequestError;
      if (!known) console.error('Request failed:', error instanceof Error ? error.message : 'Unknown error');
      res.writeHead(known ? error.status : 500).end(JSON.stringify({ message: known ? error.message : 'The server could not complete this request. Please try again.' }));
    }
  });
}
