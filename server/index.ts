import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { networkInterfaces } from 'node:os';
import { Store } from './store';
import { createApi } from './http';
import { loadDemoAccounts } from './demo-login';

const path = resolve(process.env.QUEUE_DB_PATH ?? '.local/queueease.sqlite');
mkdirSync(dirname(path), { recursive: true });
const store = new Store(path);
const port = Number(process.env.QUEUE_PORT ?? 4100);
const demoAccounts = process.env.NODE_ENV !== 'production' && process.env.QUEUE_DEMO_LOGIN !== '0'
  ? loadDemoAccounts(resolve(dirname(path), 'demo-accounts.txt')) : [];
const webDirectory = process.env.QUEUE_WEB_DIR;
const server = createApi(store, demoAccounts, webDirectory);
server.listen(port, '0.0.0.0', () => {
  console.log(`QueueEase API: http://localhost:${port}`);
  if (webDirectory) console.log(`Queue Ease website: http://localhost:${port} (mobile API also available)`);
  if (demoAccounts.length) console.log('Demo quick login is enabled for the local test accounts.');
  for (const entries of Object.values(networkInterfaces())) for (const address of entries ?? []) {
    if (address.family === 'IPv4' && !address.internal) console.log(`Phone connection: http://${address.address}:${port}`);
  }
  console.log('Keep this terminal open. Database:', path);
});
server.on('error', (error: NodeJS.ErrnoException) => {
  console.error(error.code === 'EADDRINUSE' ? `Port ${port} is already in use. Stop the other queue server or set QUEUE_PORT to a free port.` : error.message);
  store.close();
  process.exitCode = 1;
});
function shutdown() { server.close(() => { store.close(); process.exit(0); }); }
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
